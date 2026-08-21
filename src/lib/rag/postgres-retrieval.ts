import type { Pool } from "pg";
import type { EmbeddingProvider } from "@/lib/embeddings/provider";
import { vectorLiteral } from "@/lib/db/postgres";
import { analyzeQuery } from "./query";
import { rerank } from "./rerank";
import type { DocumentMetadata, RetrievalCandidate } from "./types";

type Row = {
  id: string;
  document_id: string;
  chunk_index: number;
  title: string;
  url: string;
  section: string;
  heading_path: string[];
  content: string;
  token_count: number;
  content_hash: string;
  metadata: DocumentMetadata;
  semantic_score: number | string;
  keyword_score: number | string;
};

export async function retrievePostgres(pool: Pool, embeddingProvider: EmbeddingProvider, query: string, limit = 5, signal?: AbortSignal) {
  const analysis = analyzeQuery(query);
  if (!analysis.inDomain) return [];
  const embedding = await embeddingProvider.embed(analysis.normalized, signal);
  const result = await pool.query<Row>({
    text: `
      WITH ranked AS (
        SELECT
          c.id, c.document_id, c.chunk_index, d.title, d.url, c.section,
          c.heading_path, c.content, c.token_count, c.content_hash, c.metadata,
          GREATEST(0, 1 - (c.embedding <=> $1::vector)) AS semantic_score,
          ts_rank_cd(c.search_vector, websearch_to_tsquery('simple', $2), 32) AS keyword_score
        FROM knowledge_chunks c
        JOIN knowledge_documents d ON d.id = c.document_id
        WHERE ($3::text IS NULL OR d.service = $3)
          AND ($4::text IS NULL OR d.framework = $4)
      )
      SELECT * FROM ranked
      WHERE semantic_score >= 0.05 OR keyword_score > 0
      ORDER BY (semantic_score * 0.62 + LEAST(keyword_score, 1) * 0.38) DESC
      LIMIT 40
    `,
    values: [vectorLiteral(embedding), analysis.normalized, analysis.service ?? null, analysis.framework ?? null]
  });

  const candidates: RetrievalCandidate[] = result.rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    title: row.title,
    url: row.url,
    section: row.section,
    headingPath: row.heading_path,
    content: row.content,
    tokenCount: row.token_count,
    contentHash: row.content_hash,
    metadata: row.metadata,
    semanticScore: Number(row.semantic_score),
    keywordScore: Math.min(1, Number(row.keyword_score) * 2),
    metadataScore: 0,
    finalScore: 0
  }));
  return rerank(candidates, analysis, limit);
}
