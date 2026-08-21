import "server-only";
import { env } from "@/lib/config/env";
import { log } from "@/lib/logging/logger";
import { readUtf8Lines } from "@/lib/stream/lines";
import type { AIProvider, ProviderInput } from "./provider";
import { buildSystemPrompt } from "./prompt";

function selectModel(input: ProviderInput) {
  if (input.intent === "debug") return env.AVALAI_REASONING_MODEL ?? env.AVALAI_MODEL;
  if (input.intent === "ask") return env.AVALAI_FAST_MODEL ?? env.AVALAI_MODEL;
  return env.AVALAI_MODEL;
}

const retryableStatuses = new Set([429, 502, 503, 504]);

export class AvalAIProvider implements AIProvider {
  async *streamResponse(input: ProviderInput): AsyncIterable<string> {
    const model = selectModel(input);
    if (!env.AVALAI_API_KEY || !model) {
      yield* demoResponse(input);
      return;
    }

    const startedAt = Date.now();
    const body = JSON.stringify({
      model,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.2,
      max_tokens: 1400,
      messages: [{ role: "system", content: buildSystemPrompt(input) }, ...input.messages.slice(-8)]
    });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(`${env.AVALAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.AVALAI_API_KEY}`, "content-type": "application/json" },
        body,
        signal: AbortSignal.any([input.signal, AbortSignal.timeout(30_000)])
      }).catch((error) => {
        if (attempt === 2 || input.signal.aborted) throw error;
        return undefined;
      });
      if (response && (!retryableStatuses.has(response.status) || attempt === 2)) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }

    if (!response?.ok || !response.body) throw new Error(`AvalAI provider failed with ${response?.status ?? "network"}`);
    let outputCharacters = 0;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let completed = false;

    for await (const line of readUtf8Lines(response.body.getReader())) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trimStart();
      if (!payload) continue;
      if (payload === "[DONE]") {
        completed = true;
        break;
      }
      let parsed: { choices?: { delta?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new Error("AvalAI provider returned malformed SSE JSON");
      }
      inputTokens = parsed.usage?.prompt_tokens ?? inputTokens;
      outputTokens = parsed.usage?.completion_tokens ?? outputTokens;
      const text = parsed.choices?.[0]?.delta?.content;
      if (text) {
        outputCharacters += text.length;
        yield text;
      }
    }
    if (!completed) throw new Error("AvalAI provider stream ended before completion");
    log("llm_complete", {
      request_id: input.requestId,
      model,
      latency_ms: Date.now() - startedAt,
      input_tokens: inputTokens,
      output_tokens: outputTokens ?? Math.ceil(outputCharacters / 4)
    });
  }
}

async function* demoResponse(input: ProviderInput): AsyncIterable<string> {
  let answer: string;
  if (!input.evidence.length) {
    const question = input.clarification
      ?? (input.intent === "debug"
        ? "این مشکل برای کدام سرویس لیارا رخ می‌دهد و متن دقیق خطا چیست؟"
        : "دقیقاً روی کدام سرویس یا قابلیت لیارا کار می‌کنید؟");
    answer = `حتماً کمک‌تان می‌کنم. برای اینکه مستقیم سراغ راه‌حل درست برویم، یک جزئیات لازم دارم: ${question}`;
  } else {
    const snippets = input.evidence.slice(0, 3).map((document) => {
      const clean = document.content
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const sentences = clean.split(/(?<=[.!؟؛])\s+/u).filter(Boolean);
      const excerpt = sentences.slice(0, 3).join(" ").slice(0, 520).trim();
      return `• ${document.section}: ${excerpt}`;
    });
    if (input.intent === "debug") {
      answer = `بررسی اولیه بر اساس مستندات:\n\nفرضیه‌های محتمل:\n${snippets.join("\n\n")}\n\nراه‌حل پیشنهادی: ابتدا تنظیم یا مرحله‌ای را که منبع اول توضیح داده بررسی کنید و هم‌زمان آخرین لاگ همان بازه را نگه دارید.\n\nمرحلهٔ بررسی نتیجه: تغییر را اعمال کنید و وضعیت برنامه و آخرین لاگ را دوباره کنترل کنید.`;
    } else if (input.intent === "build") {
      answer = `برنامهٔ اجرایی پیشنهادی:\n\n${snippets.map((snippet, index) => `${index + 1}. ${snippet.replace(/^•\s*/, "")}`).join("\n\n")}\n\nفعلاً مرحلهٔ اول را انجام دهید و نتیجه را گزارش کنید.`;
    } else {
      answer = `بر اساس بخش‌های مرتبط مستندات لیارا:\n\n${snippets.join("\n\n")}\n\nبرای جزئیات و دستورات کامل، منابع زیر را باز کنید.`;
    }
    if (input.clarification) answer += `\n\nبرای اینکه راهنمایی را دقیق‌تر ادامه بدهم: ${input.clarification}`;
  }

  const characters = Array.from(answer);
  const pieces = Array.from({ length: Math.ceil(characters.length / 7) }, (_, index) => characters.slice(index * 7, index * 7 + 7).join(""));
  for (const piece of pieces) {
    await new Promise((resolve) => setTimeout(resolve, 22));
    yield piece;
  }
}
