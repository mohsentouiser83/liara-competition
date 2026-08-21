import { env } from "@/lib/config/env";
import { createPostgresPool } from "@/lib/db/postgres";
import { redisClient } from "@/lib/db/redis";

type Check = { status: "ok" | "skipped" | "error"; detail?: string };
let readinessPool: ReturnType<typeof createPostgresPool> | undefined;

async function databaseCheck(): Promise<Check> {
  if (!env.DATABASE_URL) return { status: "skipped" };
  readinessPool ??= createPostgresPool(env.DATABASE_URL, env.DATABASE_SSL_MODE);
  try {
    const result = await readinessPool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM knowledge_chunks"
    );
    const count = Number(result.rows[0]?.count ?? 0);
    return count > 0 ? { status: "ok", detail: `${count} knowledge chunks` } : { status: "error", detail: "knowledge base is empty" };
  } catch {
    return { status: "error", detail: "database or knowledge schema is unavailable" };
  }
}

async function redisCheck(): Promise<Check> {
  if (!env.REDIS_URL) return { status: "skipped" };
  try {
    const redis = await redisClient();
    return await redis?.ping() === "PONG" ? { status: "ok" } : { status: "error", detail: "Redis did not respond" };
  } catch {
    return { status: "error", detail: "Redis is unavailable" };
  }
}

export async function checkReadiness() {
  const [database, redis] = await Promise.all([databaseCheck(), redisCheck()]);
  const requiredChecks = env.APP_ENV === "production" ? [database, redis] : [database, redis].filter((check) => check.status !== "skipped");
  const ready = requiredChecks.every((check) => check.status === "ok");
  return {
    ready,
    body: {
      status: ready ? "ok" : "not_ready",
      service: "liara-copilot",
      checks: { database, redis },
      timestamp: new Date().toISOString()
    }
  };
}
