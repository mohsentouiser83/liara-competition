export type Intent = "ask" | "debug" | "build";

export type Source = {
  id: string;
  title: string;
  url: string;
  section: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  sources?: Source[];
  nextAction?: string;
  pending?: boolean;
  tools?: { name: string; resultCount: number }[];
};

export type StreamEvent =
  | { type: "meta"; requestId: string; conversationId: string; messageId: string; intent: Intent }
  | { type: "tool"; name: string; resultCount: number }
  | { type: "delta"; text: string }
  | { type: "done"; sources: Source[]; nextAction?: string }
  | { type: "error"; message: string };
