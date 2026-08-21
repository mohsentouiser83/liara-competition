import { z } from "zod";
import { log } from "@/lib/logging/logger";
import { retrieveEvidence } from "@/lib/rag/retrieve";

const toolInput = z.object({ query: z.string().trim().min(2).max(4000), limit: z.number().int().min(1).max(8).default(5) });

export const toolSchemas = {
  searchLiaraDocs: toolInput,
  getDocumentation: toolInput,
  findRelatedDocs: toolInput
} as const;

export type AgentToolName = keyof typeof toolSchemas;
export type ToolExecution = { name: AgentToolName; input: { query: string; limit: number }; durationMs: number; resultCount: number };

export async function executeAgentTool(name: AgentToolName, rawInput: unknown, signal?: AbortSignal) {
  const input = toolSchemas[name].parse(rawInput);
  const startedAt = Date.now();
  const timeout = AbortSignal.timeout(12_000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const evidence = await retrieveEvidence(input.query, input.limit, combinedSignal);
    const execution: ToolExecution = { name, input, durationMs: Date.now() - startedAt, resultCount: evidence.length };
    log("tool_complete", { tool: name, latency_ms: execution.durationMs, result_count: evidence.length });
    return { evidence, execution };
  } catch (error) {
    log("tool_error", { tool: name, latency_ms: Date.now() - startedAt, error: error instanceof Error ? error.name : "unknown" });
    throw error;
  }
}
