CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]',
  tool_calls jsonb NOT NULL DEFAULT '[]',
  token_usage integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS feedback (
  id bigserial PRIMARY KEY,
  message_id text NOT NULL,
  helpful boolean NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_message_idx ON feedback (message_id);
