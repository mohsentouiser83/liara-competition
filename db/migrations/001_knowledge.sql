CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id text PRIMARY KEY,
  source text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  service text,
  topic text,
  framework text,
  language text NOT NULL,
  version text NOT NULL,
  content_hash text NOT NULL,
  source_path text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_path)
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  section text NOT NULL,
  heading_path text[] NOT NULL DEFAULT '{}',
  content text NOT NULL,
  token_count integer NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(section, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_documents_metadata_idx
  ON knowledge_documents (service, framework, topic);

CREATE INDEX IF NOT EXISTS knowledge_chunks_search_idx
  ON knowledge_chunks USING gin (search_vector);

CREATE INDEX IF NOT EXISTS knowledge_chunks_metadata_idx
  ON knowledge_chunks USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
