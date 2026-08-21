import { Icons, LiaraMark } from "@/components/icons";
import type { StoredConversation } from "./conversation-storage";

type Props = {
  activeConversationId: string;
  conversations: StoredConversation[];
  mobileOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenConversation: (conversation: StoredConversation) => void;
};

export function ChatSidebar({ activeConversationId, conversations, mobileOpen, onClose, onNewChat, onOpenConversation }: Props) {
  return (
    <>
      {mobileOpen ? <button className="sidebar-backdrop" type="button" aria-label="بستن منو" onClick={onClose} /> : null}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="نوار کناری">
        <div className="brand">
          <div className="brand-mark"><LiaraMark size={30} /></div>
          <div className="brand-copy"><strong>Liara Copilot</strong><span>Developer assistant</span></div>
        </div>
        <button className="new-chat" type="button" onClick={onNewChat}><Icons.plus size={15} /> گفت‌وگوی جدید</button>
        <nav aria-label="گفت‌وگوهای اخیر">
          <div className="sidebar-section-title">اخیر</div>
          <div className="history">
            {conversations.length
              ? conversations.map((conversation) => (
                <button
                  className="history-button"
                  type="button"
                  key={conversation.id}
                  aria-current={conversation.id === activeConversationId ? "page" : undefined}
                  onClick={() => onOpenConversation(conversation)}
                >
                  {conversation.title}
                </button>
              ))
              : <span className="history-empty">هنوز پیامی ثبت نشده است.</span>}
          </div>
        </nav>
        <div className="sidebar-spacer" />
        <a className="new-chat" href="https://docs.liara.ir" target="_blank" rel="noreferrer"><Icons.book size={15} /> مستندات لیارا</a>
      </aside>
    </>
  );
}
