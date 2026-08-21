import { AvalAIProvider } from "@/lib/ai/avalai";
import { prepareAgentTurn } from "@/lib/agent/agent";
import { persistMessage } from "@/lib/db/conversations";
import { log } from "@/lib/logging/logger";
import { mapEvidenceSources } from "@/lib/rag/citations";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { chatRequestSchema } from "@/lib/security/chat-schema";

export const runtime = "nodejs";
export const maxDuration = 45;

const encoder = new TextEncoder();
const provider = new AvalAIProvider();

function line(value: unknown) {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

function nextActionFor(query: string, intent: "ask" | "debug" | "build") {
  if (/دامنه|dns/i.test(query)) {
    return "در صفحهٔ برنامه، بخش «دامنه‌ها» را باز کنید و دامنه را طبق منبع «اضافه کردن دامنه» ثبت و رکوردهای DNS نمایش‌داده‌شده را اعمال کنید.";
  }
  if (intent === "debug") {
    return /502|۵۰۲|build|start|استقرار|deploy/i.test(query)
      ? "آخرین بخش گزارشات نرم‌افزاری، رویداد استقرار و فرمان start را ارسال کنید تا علت محدودتر شود."
      : "متن کامل خطا، نام سرویس و مرحله‌ای که خطا در آن رخ می‌دهد را ارسال کنید.";
  }
  if (intent === "build") {
    return /redis|ردیس/i.test(query)
      ? "در کنسول لیارا وارد بخش دیتابیس شوید و مرحله راه‌اندازی Redis را طبق منبع اول انجام دهید."
      : "مرحله اول منبع پیشنهادی را انجام دهید و نتیجه یا خطای مرحله بعد را همین‌جا بفرستید.";
  }
  return "اگر محیط یا فریم‌ورک شما متفاوت است، نام آن را بفرستید تا پاسخ دقیق‌تر شود.";
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "forbidden", requestId }, { status: 403 });
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request", requestId }, { status: 400 });
  const conversationId = parsed.data.conversationId ?? crypto.randomUUID();
  const sessionId = parsed.data.sessionId ?? "anonymous";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  let rate;
  try {
    rate = await checkRateLimit(`${ip}:${sessionId}`);
  } catch (error) {
    log("rate_limit_error", { request_id: requestId, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "service_unavailable", requestId }, { status: 503 });
  }
  if (!rate.allowed) {
    return Response.json({ error: "rate_limit", requestId }, { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds ?? 60) } });
  }
  log("chat_request", { request_id: requestId, message_count: parsed.data.messages.length });

  const latest = parsed.data.messages.at(-1)?.content ?? "";
  const latestMessage = parsed.data.messages.at(-1)!;
  let agentTurn;
  let evidence;
  const retrievalStartedAt = Date.now();
  try {
    agentTurn = await prepareAgentTurn(parsed.data.messages, request.signal);
    evidence = agentTurn.evidence;
    await persistMessage({
      id: latestMessage.id ?? `${requestId}:user`,
      conversationId,
      sessionId,
      role: "user",
      content: latest
    });
    log("retrieval_complete", {
      request_id: requestId,
      retrieved_documents: evidence.length,
      latency_ms: Date.now() - retrievalStartedAt
    });
  } catch (error) {
    log("retrieval_error", {
      request_id: requestId,
      latency_ms: Date.now() - retrievalStartedAt,
      error: error instanceof Error ? error.name : "unknown"
    });
    return Response.json({ error: "retrieval_unavailable", requestId }, { status: 503 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const intent = agentTurn.intent;
      let assistantContent = "";
      controller.enqueue(line({
        type: "meta",
        requestId,
        conversationId,
        messageId: parsed.data.assistantMessageId,
        intent
      }));
      for (const tool of agentTurn.tools) controller.enqueue(line({ type: "tool", name: tool.name, resultCount: tool.resultCount }));
      try {
        for await (const text of provider.streamResponse({
          messages: parsed.data.messages,
          intent,
          evidence,
          signal: request.signal,
          requestId,
          guidance: agentTurn.guidance,
          clarification: agentTurn.clarification
        })) {
          assistantContent += text;
          controller.enqueue(line({ type: "delta", text }));
        }
        const nextAction = agentTurn.clarification
          ? "پاسخ این سؤال تکمیلی را بفرستید تا عیب‌یابی با شواهد دقیق‌تر ادامه پیدا کند."
          : nextActionFor(latest, intent);
        const sources = mapEvidenceSources(evidence);
        controller.enqueue(line({
          type: "done",
          sources,
          nextAction
        }));
        await persistMessage({
          id: parsed.data.assistantMessageId,
          conversationId,
          sessionId,
          role: "assistant",
          content: assistantContent,
          sources,
          tools: agentTurn.tools
        });
        log("chat_complete", { request_id: requestId, intent, retrieved_documents: evidence.length, latency_ms: Date.now() - startedAt });
      } catch (error) {
        log("chat_error", { request_id: requestId, latency_ms: Date.now() - startedAt, error: error instanceof Error ? error.name : "unknown" });
        controller.enqueue(line({ type: "error", message: "ارتباط با سرویس هوش مصنوعی کامل نشد." }));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-request-id": requestId,
      "x-ratelimit-remaining": String(rate.remaining)
    }
  });
}
