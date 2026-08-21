import "server-only";
import type { Pool } from "pg";
import { env } from "@/lib/config/env";
import { createPostgresPool } from "./postgres";
import { log } from "@/lib/logging/logger";

let pool: Pool | undefined;

function database() {
  if (!env.DATABASE_URL) return undefined;
  pool ??= createPostgresPool(env.DATABASE_URL, env.DATABASE_SSL_MODE);
  return pool;
}

export async function persistMessage(input: {
  id: string;
  conversationId: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  sources?: unknown[];
  tools?: unknown[];
}) {
  const db = database();
  if (!db) return false;
  try {
    await db.query(
      `INSERT INTO conversations (id, session_id) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [input.conversationId, input.sessionId]
    );
    await db.query(
      `INSERT INTO messages (id, conversation_id, role, content, sources, tool_calls)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)
       ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, sources=EXCLUDED.sources, tool_calls=EXCLUDED.tool_calls`,
      [input.id, input.conversationId, input.role, input.content, JSON.stringify(input.sources ?? []), JSON.stringify(input.tools ?? [])]
    );
    return true;
  } catch (error) {
    log("persistence_error", { operation: "message", error: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}

export async function persistFeedback(input: { messageId: string; helpful: boolean; comment?: string }) {
  const db = database();
  if (!db) return false;
  try {
    await db.query("INSERT INTO feedback (message_id, helpful, comment) VALUES ($1,$2,$3)", [input.messageId, input.helpful, input.comment ?? null]);
    return true;
  } catch (error) {
    log("persistence_error", { operation: "feedback", error: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
