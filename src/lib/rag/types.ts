import type { Source } from "@/types/chat";

export type DocumentMetadata = {
  source: "liara-docs";
  title: string;
  url: string;
  section: string;
  service?: string;
  topic?: string;
  framework?: string;
  language: "fa" | "en";
  version: string;
  contentHash: string;
  sourcePath: string;
};

export type IndexedChunk = Source & {
  documentId: string;
  chunkIndex: number;
  content: string;
  headingPath: string[];
  anchor?: string;
  tokenCount: number;
  contentHash: string;
  metadata: DocumentMetadata;
};

export type RetrievalCandidate = IndexedChunk & {
  semanticScore: number;
  keywordScore: number;
  metadataScore: number;
  finalScore: number;
};

export type ParsedDocument = {
  id: string;
  metadata: DocumentMetadata;
  chunks: IndexedChunk[];
};
