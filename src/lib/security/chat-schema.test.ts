import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "./chat-schema";

describe("chat input protection", () => {
  it("rejects oversized messages", () => {
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(4001) }] }).success).toBe(false);
  });
  it("rejects oversized conversation context", () => {
    expect(chatRequestSchema.safeParse({ messages: Array.from({ length: 31 }, () => ({ role: "user", content: "test" })) }).success).toBe(false);
  });
  it("accepts a bounded valid request", () => {
    expect(chatRequestSchema.safeParse({
      assistantMessageId: crypto.randomUUID(),
      messages: [{ role: "user", content: "Redis چیست؟" }]
    }).success).toBe(true);
  });
  it("requires a canonical assistant message id", () => {
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "Redis چیست؟" }] }).success).toBe(false);
  });
  it("rejects a conversation that does not end with a user message", () => {
    expect(chatRequestSchema.safeParse({
      assistantMessageId: crypto.randomUUID(),
      messages: [{ role: "assistant", content: "پاسخ" }]
    }).success).toBe(false);
  });
});
