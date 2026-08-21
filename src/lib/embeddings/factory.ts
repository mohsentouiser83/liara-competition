import { DeterministicEmbeddingProvider } from "./deterministic";
import { OpenAICompatibleEmbeddingProvider } from "./openai-compatible";
import type { EmbeddingProvider } from "./provider";

export type EmbeddingConfig = {
  provider: "deterministic" | "avalai";
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  if (config.provider === "avalai") {
    if (!config.apiKey || !config.baseUrl || !config.model) throw new Error("AvalAI embedding configuration is incomplete");
    return new OpenAICompatibleEmbeddingProvider({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      dimensions: config.dimensions
    });
  }
  return new DeterministicEmbeddingProvider(config.dimensions);
}
