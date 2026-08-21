"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { Icons } from "@/components/icons";

type Props = {
  error: string | null;
  input: string;
  isStreaming: boolean;
  onInput: (value: string) => void;
  onRetry: () => void;
  onStop: () => void;
  onSubmit: () => void;
};

export function ChatComposer({ error, input, isStreaming, onInput, onRetry, onStop, onSubmit }: Props) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="composer-dock">
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="prompt">پیام شما</label>
        <textarea
          id="prompt"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="از لیارا بپرسید…"
          maxLength={4000}
          rows={2}
          disabled={isStreaming}
        />
        <div className="composer-tools">
          <span className="composer-hint">Enter برای ارسال · Shift + Enter برای خط جدید</span>
          {isStreaming ? (
            <button className="send-button" type="button" onClick={onStop} aria-label="توقف پاسخ"><Icons.stop size={17} /></button>
          ) : (
            <button className="send-button" type="submit" disabled={!input.trim()} aria-label="ارسال پیام"><Icons.send size={17} /></button>
          )}
        </div>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
            <button className="retry-button" type="button" onClick={onRetry}>دوباره تلاش کنید</button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
