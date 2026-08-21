import type { ChatMessage } from "@/types/chat";

export type StoredConversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const conversationsStorageKey = "liara-conversations-v1";

export function makeId() {
  return crypto.randomUUID();
}

export function conversationTitle(messages: ChatMessage[]) {
  const firstPrompt = messages.find((message) => message.role === "user")?.content.trim();
  if (!firstPrompt) return "گفت‌وگوی جدید";
  return firstPrompt.length > 46 ? `${firstPrompt.slice(0, 46)}…` : firstPrompt;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === "string"
    && (message.role === "user" || message.role === "assistant")
    && typeof message.content === "string";
}

function parseMessages(value: unknown) {
  return Array.isArray(value) ? value.filter(isChatMessage) : [];
}

export function readStoredConversations() {
  const value = localStorage.getItem(conversationsStorageKey);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): StoredConversation[] => {
      if (!value || typeof value !== "object") return [];
      const item = value as Record<string, unknown>;
      const messages = parseMessages(item.messages);
      if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.updatedAt !== "number") return [];
      return [{ id: item.id, title: item.title, updatedAt: item.updatedAt, messages }];
    });
  } catch {
    localStorage.removeItem(conversationsStorageKey);
    return [];
  }
}

export function readLegacyMessages() {
  const value = localStorage.getItem("liara-conversation");
  if (!value) return [];
  try {
    return parseMessages(JSON.parse(value));
  } catch {
    localStorage.removeItem("liara-conversation");
    return [];
  }
}

export function persistConversations(conversations: StoredConversation[]) {
  localStorage.setItem(conversationsStorageKey, JSON.stringify(conversations));
  localStorage.removeItem("liara-conversation");
}
