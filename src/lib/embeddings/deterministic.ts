import { createHash } from "node:crypto";
import { tokenize } from "@/lib/rag/normalize";
import { BaseEmbeddingProvider } from "./provider";

export class DeterministicEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = "deterministic-local";

  constructor(readonly dimensions = 1536) {
    super();
  }

  async embedMany(inputs: string[]) {
    return inputs.map((input) => this.vectorize(input));
  }

  private vectorize(input: string) {
    const vector = new Array<number>(this.dimensions).fill(0);
    const terms = tokenize(input);
    for (const term of terms) {
      const digest = createHash("sha256").update(term).digest();
      const index = digest.readUInt32BE(0) % this.dimensions;
      const sign = digest[4]! % 2 === 0 ? 1 : -1;
      vector[index] += sign * (1 + Math.log1p(term.length));
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}
