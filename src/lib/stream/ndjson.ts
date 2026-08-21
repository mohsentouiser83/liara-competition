import type { StreamEvent } from "@/types/chat";
import { readUtf8Lines } from "./lines";

function isStreamEvent(value: unknown): value is StreamEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const event = value as Record<string, unknown>;
  switch (event.type) {
    case "meta":
      return typeof event.requestId === "string"
        && typeof event.conversationId === "string"
        && typeof event.messageId === "string"
        && ["ask", "debug", "build"].includes(String(event.intent));
    case "tool":
      return typeof event.name === "string" && typeof event.resultCount === "number";
    case "delta":
      return typeof event.text === "string";
    case "done":
      return Array.isArray(event.sources) && (event.nextAction === undefined || typeof event.nextAction === "string");
    case "error":
      return typeof event.message === "string";
    default:
      return false;
  }
}

export async function* readChatEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  for await (const line of readUtf8Lines(body.getReader())) {
    if (!line.trim()) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error("Chat stream contained malformed JSON");
    }
    if (!isStreamEvent(value)) throw new Error("Chat stream contained an invalid event");
    yield value;
  }
}
