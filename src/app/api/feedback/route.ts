import { z } from "zod";
import { persistFeedback } from "@/lib/db/conversations";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin } from "@/lib/security/origin";

const schema = z.object({
  messageId: z.string().min(1).max(100),
  helpful: z.boolean(),
  comment: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  try {
    const rate = await checkRateLimit(`feedback:${ip}`);
    if (!rate.allowed) {
      return Response.json({ error: "rate_limit" }, { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } });
    }
  } catch {
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const persisted = await persistFeedback(parsed.data);
  return Response.json({ accepted: true, persisted }, { status: 202 });
}
