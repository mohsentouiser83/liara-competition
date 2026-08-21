"use client";

import { useEffect, useRef, useState } from "react";
import { readChatEvents } from "@/lib/stream/ndjson";
import type { ChatMessage } from "@/types/chat";
import {
  conversationTitle,
  makeId,
  persistConversations,
  readLegacyMessages,
  readStoredConversations,
  type StoredConversation
} from "./conversation-storage";

export function useChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef("");
  const sessionIdRef = useRef("");
  const hydratedRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
  }, [messages, isStreaming]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("liara-theme");
    const initialTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;

    const storedConversations = readStoredConversations();
    const storedActiveId = localStorage.getItem("liara-conversation-id");
    const legacyMessages = storedConversations.length ? [] : readLegacyMessages();
    const legacyConversation: StoredConversation[] = legacyMessages.length
      ? [{ id: storedActiveId ?? makeId(), title: conversationTitle(legacyMessages), messages: legacyMessages, updatedAt: Date.now() }]
      : [];
    const initialConversations = storedConversations.length ? storedConversations : legacyConversation;
    const activeConversation = initialConversations.find((item) => item.id === storedActiveId) ?? initialConversations[0];

    conversationIdRef.current = activeConversation?.id ?? makeId();
    sessionIdRef.current = localStorage.getItem("liara-session-id") ?? makeId();
    localStorage.setItem("liara-conversation-id", conversationIdRef.current);
    localStorage.setItem("liara-session-id", sessionIdRef.current);

    const frame = requestAnimationFrame(() => {
      setTheme(initialTheme);
      setConversations(initialConversations);
      setActiveConversationId(conversationIdRef.current);
      setMessages(activeConversation?.messages ?? []);
      hydratedRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const persistedMessages = messages.slice(-30);
    if (!persistedMessages.some((message) => message.role === "user")) return;
    const activeId = conversationIdRef.current;
    setConversations((current) => {
      const nextConversation: StoredConversation = {
        id: activeId,
        title: conversationTitle(persistedMessages),
        messages: persistedMessages,
        updatedAt: Date.now()
      };
      const next = [nextConversation, ...current.filter((item) => item.id !== activeId)].slice(0, 30);
      persistConversations(next);
      return next;
    });
  }, [messages]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("liara-theme", next);
    document.documentElement.dataset.theme = next;
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError(null);
    setIsStreaming(false);
    setMobileOpen(false);
    conversationIdRef.current = makeId();
    setActiveConversationId(conversationIdRef.current);
    localStorage.setItem("liara-conversation-id", conversationIdRef.current);
  }

  function openConversation(conversation: StoredConversation) {
    abortRef.current?.abort();
    conversationIdRef.current = conversation.id;
    setActiveConversationId(conversation.id);
    localStorage.setItem("liara-conversation-id", conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setError(null);
    setIsStreaming(false);
    setMobileOpen(false);
  }

  async function submit(value = input, retry = false) {
    const content = value.trim();
    if (!content || isStreaming) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content };
    const assistantId = makeId();
    const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
    const retryMessages = lastUserIndex >= 0 ? messages.slice(0, lastUserIndex + 1) : [];
    const nextMessages = retry ? retryMessages : [...messages, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setInput("");
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let completed = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assistantMessageId: assistantId,
          conversationId: conversationIdRef.current || undefined,
          sessionId: sessionIdRef.current || undefined,
          messages: nextMessages.map(({ id, role, content: text }) => ({ id, role, content: text }))
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) throw new Error("پاسخی از سرویس دریافت نشد.");
      for await (const event of readChatEvents(response.body)) {
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "meta" && event.messageId !== assistantId) {
          throw new Error("شناسه پاسخ سرویس معتبر نیست.");
        }
        setMessages((current) => current.map((message) => {
          if (message.id !== assistantId) return message;
          if (event.type === "meta") {
            conversationIdRef.current = event.conversationId;
            setActiveConversationId(event.conversationId);
            localStorage.setItem("liara-conversation-id", event.conversationId);
            return { ...message, intent: event.intent };
          }
          if (event.type === "tool") return { ...message, tools: [...(message.tools ?? []), { name: event.name, resultCount: event.resultCount }] };
          if (event.type === "delta") return { ...message, content: message.content + event.text };
          if (event.type === "done") {
            completed = true;
            return { ...message, sources: event.sources, nextAction: event.nextAction, pending: false };
          }
          return message;
        }));
      }
      if (!completed) throw new Error("پاسخ سرویس پیش از تکمیل قطع شد.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setMessages((current) => current.flatMap((message) => {
          if (message.id !== assistantId) return [message];
          return message.content ? [{ ...message, pending: false }] : [];
        }));
      } else {
        const message = caught instanceof Error ? caught.message : "ارتباط با سرویس هوش مصنوعی برقرار نشد.";
        setError(message);
        setMessages((current) => current.flatMap((item) => {
          if (item.id !== assistantId) return [item];
          return item.content ? [{ ...item, pending: false }] : [];
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function retryLastMessage() {
    const lastUserMessage = messages.findLast((message) => message.role === "user");
    if (lastUserMessage) void submit(lastUserMessage.content, true);
  }

  return {
    activeConversationId,
    conversations,
    endRef,
    error,
    input,
    isStreaming,
    messages,
    mobileOpen,
    theme,
    newChat,
    openConversation,
    retryLastMessage,
    setInput,
    setMobileOpen,
    stop: () => abortRef.current?.abort(),
    submit,
    toggleTheme
  };
}
