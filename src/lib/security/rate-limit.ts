import { redisClient } from "@/lib/db/redis";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

function checkMemoryRateLimit(key: string) {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfterSeconds: 60 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export async function checkRateLimit(key: string) {
  const redis = await redisClient();
  if (!redis) return checkMemoryRateLimit(key);

  const redisKey = `liara-copilot:rate-limit:${key}`;
  const result = await redis.eval(
    `local count = redis.call('INCR', KEYS[1])
     if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
     local ttl = redis.call('PTTL', KEYS[1])
     return {count, ttl}`,
    { keys: [redisKey], arguments: [String(WINDOW_MS)] }
  ) as [number, number];
  const count = Number(result[0]);
  const ttl = Math.max(0, Number(result[1]));
  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
    retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000))
  };
}
