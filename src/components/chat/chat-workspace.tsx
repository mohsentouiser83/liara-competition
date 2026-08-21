"use client";

import { Icons, LiaraMark } from "@/components/icons";
import { ChatComposer } from "./chat-composer";
import { Message } from "./chat-message";
import { ChatSidebar } from "./chat-sidebar";
import { conversationTitle } from "./conversation-storage";
import { useChatWorkspace } from "./use-chat-workspace";

const suggestions = [
  { label: "چطور Redis بسازم؟", icon: Icons.database },
  { label: "خطای ۵۰۲ را بررسی کن", icon: Icons.bug },
  { label: "استقرار Next.js", icon: Icons.rocket }
];

export function ChatWorkspace() {
  const {
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
    stop,
    submit,
    toggleTheme
  } = useChatWorkspace();

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" type="button" aria-label="باز کردن منو" onClick={() => setMobileOpen(true)}><Icons.menu size={18} /></button>
            <span className="status-dot" data-busy={isStreaming} aria-hidden="true" />
            <span>{conversationTitle(messages)}</span>
          </div>
          <div className="topbar-actions">
            <span className="mode-badge"><Icons.book size={14} /> متصل به مستندات لیارا</span>
            <button className="icon-button theme-toggle" data-theme-mode={theme} type="button" onClick={toggleTheme} aria-label={theme === "light" ? "فعال‌کردن حالت تاریک" : "فعال‌کردن حالت روشن"}>
              <span className="theme-icon theme-icon-moon"><Icons.moon size={17} /></span>
              <span className="theme-icon theme-icon-sun"><Icons.sun size={17} /></span>
            </button>
          </div>
        </header>

        <div className="conversation" aria-live="polite">
          {messages.length === 0 ? (
            <section className="welcome" aria-labelledby="welcome-title">
              <div className="welcome-mark"><LiaraMark size={46} /></div>
              <h1 id="welcome-title">امروز چه چیزی را روی لیارا می‌سازید؟</h1>
              <p>درباره استقرار، دیتابیس و خطاهای برنامه بپرسید. پاسخ‌ها بر اساس مستندات لیارا ارائه می‌شوند و منبع هر پاسخ قابل بررسی است.</p>
              <div className="suggestions" aria-label="پیشنهادها">
                {suggestions.map(({ label, icon: SuggestionIcon }) => (
                  <button className="suggestion" type="button" key={label} onClick={() => void submit(label)}>
                    <SuggestionIcon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="message-list">
              {messages.map((message) => <Message key={message.id} message={message} />)}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <ChatComposer
          error={error}
          input={input}
          isStreaming={isStreaming}
          onInput={setInput}
          onRetry={retryLastMessage}
          onStop={stop}
          onSubmit={() => void submit()}
        />
      </section>

      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNewChat={newChat}
        onOpenConversation={openConversation}
      />
    </main>
  );
}
