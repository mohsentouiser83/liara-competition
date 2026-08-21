export interface EmbeddingProvider {
  readonly dimensions: number;
  readonly name: string;
  embedMany(inputs: string[], signal?: AbortSignal): Promise<number[][]>;
  embed(input: string, signal?: AbortSignal): Promise<number[]>;
}

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract readonly dimensions: number;
  abstract readonly name: string;
  abstract embedMany(inputs: string[], signal?: AbortSignal): Promise<number[][]>;

  async embed(input: string, signal?: AbortSignal) {
    const [embedding] = await this.embedMany([input], signal);
    if (!embedding) throw new Error("Embedding provider returned no vector");
    return embedding;
  }
}
