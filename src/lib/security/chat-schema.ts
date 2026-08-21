import { z } from "zod";

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string().min(1).max(100).optional(),
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4000)
  })).min(1).max(30),
  assistantMessageId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  sessionId: z.string().min(1).max(100).optional()
}).refine(
  ({ messages }) => messages.at(-1)?.role === "user",
  { path: ["messages"], message: "The final message must be from the user" }
);
