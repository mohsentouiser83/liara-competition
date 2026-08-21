import { describe, expect, it } from "vitest";
import { DeterministicEmbeddingProvider } from "./deterministic";

describe("deterministic embeddings", () => {
  it("returns stable normalized vectors", async () => {
    const provider = new DeterministicEmbeddingProvider(64);
    const [first, second] = await provider.embedMany(["استقرار Next.js", "استقرار Next.js"]);
    expect(first).toEqual(second);
    expect(first).toHaveLength(64);
    const magnitude = Math.sqrt(first!.reduce((sum, value) => sum + value * value, 0));
    expect(magnitude).toBeCloseTo(1, 6);
  });
});
