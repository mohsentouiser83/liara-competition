import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DeterministicEmbeddingProvider } from "@/lib/embeddings/deterministic";
import { log } from "@/lib/logging/logger";
import { analyzeQuery } from "./query";
import { rerank } from "./rerank";
import { tokenize } from "./normalize";
import type { IndexedChunk, RetrievalCandidate } from "./types";

const metadataSchema = z.object({
  source: z.literal("liara-docs"),
  title: z.string(),
  url: z.string().url(),
  section: z.string(),
  service: z.string().optional(),
  topic: z.string().optional(),
  framework: z.string().optional(),
  language: z.enum(["fa", "en"]),
  version: z.string(),
  contentHash: z.string(),
  sourcePath: z.string()
});

const indexedChunkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  section: z.string(),
  documentId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  content: z.string(),
  headingPath: z.array(z.string()),
  anchor: z.string().optional(),
  tokenCount: z.number().int().nonnegative(),
  contentHash: z.string(),
  metadata: metadataSchema
});

const localIndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  sourceVersion: z.string(),
  chunks: z.array(indexedChunkSchema)
});

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

type LoadedIndex = {
  chunks: IndexedChunk[];
  termFrequencies: Map<string, number>[];
  documentFrequencies: Map<string, number>;
  embeddings: number[][];
  averageLength: number;
};

let cache: Promise<LoadedIndex | null> | undefined;
const localEmbedding = new DeterministicEmbeddingProvider(256);

function termMap(text: string) {
  const frequencies = new Map<string, number>();
  for (const term of tokenize(text)) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  return frequencies;
}

function cosine(left: number[], right: number[]) {
  let score = 0;
  for (let index = 0; index < left.length; index += 1) score += left[index]! * right[index]!;
  return Math.max(0, score);
}

async function loadIndex(): Promise<LoadedIndex | null> {
  try {
    const filePath = path.join(process.cwd(), ".data", "liara-index.json");
    const parsed = localIndexSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
    const termFrequencies = parsed.chunks.map((chunk) => termMap(`${chunk.title} ${chunk.section} ${chunk.content}`));
    const documentFrequencies = new Map<string, number>();
    for (const frequencies of termFrequencies) {
      for (const term of frequencies.keys()) documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
    const embeddings = await localEmbedding.embedMany(parsed.chunks.map((chunk) => `${chunk.title}\n${chunk.section}\n${chunk.content}`));
    const averageLength = termFrequencies.reduce((sum, item) => sum + [...item.values()].reduce((inner, value) => inner + value, 0), 0) / Math.max(1, parsed.chunks.length);
    return { chunks: parsed.chunks, termFrequencies, documentFrequencies, embeddings, averageLength };
  } catch (error) {
    if (isMissingFile(error)) return null;
    log("local_index_error", { error: error instanceof Error ? error.name : "unknown" });
    throw error;
  }
}

export async function retrieveLocal(query: string, limit = 5) {
  cache ??= loadIndex();
  const index = await cache;
  if (!index) return null;
  const analysis = analyzeQuery(query);
  if (!analysis.inDomain) return [];
  const queryEmbedding = await localEmbedding.embed(analysis.normalized);
  const count = index.chunks.length;
  const candidates: RetrievalCandidate[] = [];

  for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
    const chunk = index.chunks[itemIndex]!;
    if (analysis.service && chunk.metadata.service !== analysis.service) continue;
    if (analysis.framework && chunk.metadata.framework !== analysis.framework) continue;
    const frequencies = index.termFrequencies[itemIndex]!;
    const length = [...frequencies.values()].reduce((sum, value) => sum + value, 0);
    let bm25 = 0;
    for (const term of analysis.terms) {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) continue;
      const documentFrequency = index.documentFrequencies.get(term) ?? 0;
      const inverseFrequency = Math.log(1 + (count - documentFrequency + 0.5) / (documentFrequency + 0.5));
      bm25 += inverseFrequency * ((frequency * 2.2) / (frequency + 1.2 * (0.25 + 0.75 * length / Math.max(1, index.averageLength))));
    }
    const semanticScore = cosine(queryEmbedding, index.embeddings[itemIndex]!);
    const keywordScore = 1 - Math.exp(-bm25 / 4);
    const metadataScore = Math.min(1,
      (analysis.service && chunk.metadata.service === analysis.service ? 0.35 : 0) +
      (analysis.framework && chunk.metadata.framework === analysis.framework ? 0.35 : 0) +
      (analysis.topic && chunk.metadata.topic === analysis.topic ? 0.3 : 0)
    );
    if (keywordScore === 0) continue;
    candidates.push({ ...chunk, semanticScore, keywordScore, metadataScore, finalScore: 0 });
  }

  return rerank(candidates.toSorted((a, b) =>
    Math.max(b.semanticScore, b.keywordScore) + b.metadataScore * 0.4 -
    (Math.max(a.semanticScore, a.keywordScore) + a.metadataScore * 0.4)
  ).slice(0, 60), analysis, limit);
}

export function clearLocalIndexCache() {
  cache = undefined;
}
