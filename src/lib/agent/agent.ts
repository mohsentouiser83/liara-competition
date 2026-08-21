import { detectIntent } from "./intents";
import { executeAgentTool, type ToolExecution } from "./tools";
import { analyzeQuery } from "@/lib/rag/query";
import type { EvidenceDocument } from "@/lib/ai/provider";
import type { Intent } from "@/types/chat";

type Message = { role: "user" | "assistant"; content: string };

export type AgentTurn = {
  intent: Intent;
  evidence: EvidenceDocument[];
  tools: ToolExecution[];
  clarification?: string;
  guidance: string;
};

function contextualQuery(messages: Message[]) {
  const userMessages = messages.filter((message) => message.role === "user").slice(-4).map((message) => message.content);
  const latest = userMessages.at(-1) ?? "";
  const latestAnalysis = analyzeQuery(latest);
  if (latestAnalysis.service && (latestAnalysis.framework || latestAnalysis.error || userMessages.length === 1)) return latest;
  return userMessages.join("\n").slice(-6000);
}

export async function prepareAgentTurn(messages: Message[], signal?: AbortSignal): Promise<AgentTurn> {
  const latest = messages.at(-1)?.content ?? "";
  const intent = detectIntent(latest);
  const query = contextualQuery(messages);
  const analysis = analyzeQuery(query);
  const toolName = intent === "debug" ? "findRelatedDocs" : intent === "build" ? "getDocumentation" : "searchLiaraDocs";
  const { evidence, execution } = await executeAgentTool(toolName, { query, limit: 5 }, signal);

  let clarification: string | undefined;
  if (intent === "debug" && !analysis.error) {
    clarification = "متن دقیق خطا یا آخرین بخش لاگ مربوط به زمان رخ‌دادن مشکل چیست؟";
  } else if (intent === "debug" && analysis.service === "paas" && !analysis.framework) {
    clarification = "برنامه با چه فریم‌ورک یا runtimeای اجرا می‌شود؟ مثلاً Next.js، Node.js یا Django؟";
  } else if (intent === "build" && !analysis.service && !analysis.framework) {
    clarification = "قصد دارید کدام سرویس یا فریم‌ورک را روی لیارا راه‌اندازی کنید؟";
  }

  const guidance = intent === "debug"
    ? "شواهد را به فرضیه‌های مرتب‌شده، راه‌حل کم‌ریسک و یک مرحلهٔ بررسی نتیجه تبدیل کن. بدون داده کافی تشخیص قطعی نده."
    : intent === "build"
      ? "یک برنامهٔ اجرایی مرحله‌به‌مرحله بساز و فقط قدم بعدی قابل انجام را برجسته کن."
      : "پاسخ مستقیم، کوتاه و مستند ارائه کن.";

  return { intent, evidence, tools: [execution], clarification, guidance };
}
