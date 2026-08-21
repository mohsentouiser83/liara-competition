import { BaseEmbeddingProvider } from "./provider";

type Config = {
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions: number;
};

export class OpenAICompatibleEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = "avalai-openai-compatible";
  readonly dimensions: number;

  constructor(private readonly config: Config) {
    super();
    this.dimensions = config.dimensions;
  }

  async embedMany(inputs: string[], signal?: AbortSignal) {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.config.model, input: inputs }),
      signal
    });
    if (!response.ok) throw new Error(`Embedding provider failed with ${response.status}`);
    const body = await response.json() as { data?: { index: number; embedding: number[] }[] };
    const vectors = (body.data ?? []).toSorted((a, b) => a.index - b.index).map((item) => item.embedding);
    if (vectors.length !== inputs.length || vectors.some((vector) => vector.length !== this.dimensions)) {
      throw new Error(`Embedding dimension mismatch; expected ${this.dimensions}`);
    }
    return vectors;
  }
}
