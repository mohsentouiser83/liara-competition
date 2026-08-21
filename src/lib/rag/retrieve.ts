import { knowledge, type KnowledgeDocument } from "./knowledge";
import { createEmbeddingProvider } from "@/lib/embeddings/factory";
import { createPostgresPool } from "@/lib/db/postgres";
import { retrieveLocal } from "./local-index";
import { normalizeText, persianStopWords } from "./normalize";
import { retrievePostgres } from "./postgres-retrieval";
import type { Pool } from "pg";
import type { RetrievalCandidate } from "./types";

function normalize(text: string) {
  return normalizeText(text);
}

const stopWords = persianStopWords;

export function retrieve(query: string, limit = 3): KnowledgeDocument[] {
  const normalized = normalize(query);
  const terms = new Set(normalized.split(/\s+/).filter((term) => term.length > 1 && !stopWords.has(term)));

  return knowledge
    .map((document) => {
      const haystack = normalize(`${document.title} ${document.section} ${document.content} ${document.keywords.join(" ")}`);
      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += term.length > 3 ? 2 : 1;
      }
      for (const keyword of document.keywords) {
        if (normalized.includes(normalize(keyword))) score += 4;
      }
      return { document, score };
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ document }) => document);
}

let pool: Pool | undefined;
const retrievalCache = new Map<string, { expiresAt: number; evidence: RetrievalCandidate[] }>();
const RETRIEVAL_CACHE_TTL_MS = 5 * 60_000;
const RETRIEVAL_CACHE_MAX_ENTRIES = 250;

function cacheEvidence(cacheKey: string, evidence: RetrievalCandidate[]) {
  retrievalCache.delete(cacheKey);
  retrievalCache.set(cacheKey, { expiresAt: Date.now() + RETRIEVAL_CACHE_TTL_MS, evidence });
  while (retrievalCache.size > RETRIEVAL_CACHE_MAX_ENTRIES) {
    const oldestKey = retrievalCache.keys().next().value;
    if (!oldestKey) break;
    retrievalCache.delete(oldestKey);
  }
  return evidence;
}

export async function retrieveEvidence(query: string, limit = 5, signal?: AbortSignal) {
  const { env } = await import("@/lib/config/env");
  const mode = env.RAG_MODE === "auto" ? (env.DATABASE_URL ? "postgres" : "local") : env.RAG_MODE;
  const cacheKey = `${mode}:${limit}:${normalize(query)}`;
  const cached = retrievalCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.evidence;
  if (cached) retrievalCache.delete(cacheKey);

  if (mode === "postgres") {
    if (!env.DATABASE_URL) throw new Error("RAG_MODE=postgres requires DATABASE_URL");
    pool ??= createPostgresPool(env.DATABASE_URL, env.DATABASE_SSL_MODE);
    const embeddingProvider = createEmbeddingProvider({
      provider: env.EMBEDDING_PROVIDER,
      dimensions: env.EMBEDDING_DIMENSIONS,
      apiKey: env.AVALAI_API_KEY,
      baseUrl: env.AVALAI_BASE_URL,
      model: env.AVALAI_EMBEDDING_MODEL
    });
    const evidence = await retrievePostgres(pool, embeddingProvider, query, limit, signal);
    return cacheEvidence(cacheKey, evidence);
  }

  const local = await retrieveLocal(query, limit);
  if (local) {
    return cacheEvidence(cacheKey, local);
  }
  const evidence = retrieve(query, limit).map((document, chunkIndex) => ({
    ...document,
    documentId: document.id,
    chunkIndex,
    headingPath: [document.title, document.section],
    tokenCount: Math.ceil(document.content.length / 4),
    contentHash: document.id,
    metadata: {
      source: "liara-docs" as const,
      title: document.title,
      url: document.url,
      section: document.section,
      language: "fa" as const,
      version: "seed",
      contentHash: document.id,
      sourcePath: "seed"
    },
    semanticScore: 0,
    keywordScore: 1,
    metadataScore: 0,
    finalScore: 1
  }));
  return cacheEvidence(cacheKey, evidence);
}
