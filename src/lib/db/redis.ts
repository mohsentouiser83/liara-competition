import { createClient, type RedisClientType } from "redis";
import { env } from "@/lib/config/env";
import { log } from "@/lib/logging/logger";

let client: RedisClientType | undefined;
let connecting: Promise<RedisClientType> | undefined;

export async function redisClient() {
  if (!env.REDIS_URL) return undefined;
  if (client?.isReady) return client;
  if (connecting) return connecting;
  if (client?.isOpen) client.destroy();
  client = undefined;

  const candidate = createClient({
    url: env.REDIS_URL,
    socket: { connectTimeout: 3_000, reconnectStrategy: false }
  });
  client = candidate;
  candidate.on("error", (error) => {
    log("redis_error", { error: error instanceof Error ? error.name : "unknown" });
  });
  connecting = candidate.connect().then(() => candidate).catch((error) => {
    if (candidate.isOpen) candidate.destroy();
    if (client === candidate) client = undefined;
    throw error;
  });
  try {
    return await connecting;
  } finally {
    connecting = undefined;
  }
}
