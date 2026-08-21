"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import type { ChatMessage } from "@/types/chat";

export function Message({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function sendFeedback(value: "up" | "down") {
    const previous = feedback;
    setFeedback(value);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: message.id, helpful: value === "up" })
    }).catch(() => undefined);
    if (!response?.ok) setFeedback(previous);
  }

  return (
    <article className={`message ${message.role}`} data-pending={message.pending || undefined} aria-busy={message.pending || undefined}>
      <div className={`avatar ${isAssistant ? "ai" : "user"}`} aria-hidden="true">{isAssistant ? <Icons.spark size={15} /> : "شما"}</div>
      <div className="message-body">
        <div className="message-label">{isAssistant ? "Liara Copilot" : "شما"}</div>
        <div className="message-copy"><MessageContent content={message.content} />{message.pending ? <span className="stream-cursor" aria-label="در حال پاسخ" /> : null}</div>
        {message.sources?.length ? (
          <details className="evidence" aria-label="منابع پاسخ" open>
            <summary className="evidence-title"><Icons.book size={14} /> منابع استفاده‌شده</summary>
            {message.sources.map((source, index) => (
              <a className="source-link" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                <span className="source-number">[{index + 1}]</span>
                <span className="source-copy"><strong>{source.title}</strong><span>{source.section}</span></span>
                <Icons.external size={14} />
              </a>
            ))}
          </details>
        ) : null}
        {message.tools?.length ? (
          <div className="tool-state" aria-label="ابزارهای اجراشده">
            {message.tools.map((tool, index) => <span key={`${tool.name}-${index}`}><Icons.book size={12} /> {tool.name} · {tool.resultCount} نتیجه</span>)}
          </div>
        ) : null}
        {message.nextAction ? (
          <aside className="next-action">
            <div className="next-action-label"><Icons.arrow size={14} /> قدم بعدی</div>
            <p>{message.nextAction}</p>
          </aside>
        ) : null}
        {isAssistant && !message.pending && message.content ? (
          <div className="message-actions" aria-label="عملیات پاسخ">
            <button className="message-action" type="button" aria-label="کپی پاسخ" onClick={() => void navigator.clipboard.writeText(message.content)}><Icons.copy size={14} /></button>
            <button className="message-action" data-selected={feedback === "up"} type="button" aria-label="پاسخ مفید بود" onClick={() => void sendFeedback("up")}><Icons.up size={14} /></button>
            <button className="message-action" data-selected={feedback === "down"} type="button" aria-label="پاسخ مفید نبود" onClick={() => void sendFeedback("down")}><Icons.down size={14} /></button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MessageContent({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > cursor) blocks.push(<span className="message-text" key={`text-${cursor}`}>{content.slice(cursor, match.index)}</span>);
    blocks.push(
      <div className="code-block" key={`code-${match.index}`}>
        {match[1] ? <span className="code-block-label">{match[1]}</span> : null}
        <pre><code>{match[2]?.trimEnd()}</code></pre>
      </div>
    );
    cursor = pattern.lastIndex;
  }
  if (cursor < content.length) blocks.push(<span className="message-text" key={`text-${cursor}`}>{content.slice(cursor)}</span>);
  return blocks.length ? blocks : content;
}
