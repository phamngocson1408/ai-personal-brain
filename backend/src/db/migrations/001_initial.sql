-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(500),
  summary     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAW MEMORY — Every single message
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================================
-- SEMANTIC MEMORY — Embeddings for vector search
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_message_id ON memory_embeddings(message_id);
-- IVFFlat index for fast approximate nearest-neighbor search
-- Rebuild with more lists when you have > 100k rows
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON memory_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- EPISODIC MEMORY — Auto-generated summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS episodic_summaries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'project', 'topic')),
  title         VARCHAR(500) NOT NULL,
  summary       TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ,
  embedding     VECTOR(1536),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodic_type ON episodic_summaries(type);
CREATE INDEX IF NOT EXISTS idx_episodic_period ON episodic_summaries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_episodic_vector ON episodic_summaries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================
-- CONCEPTUAL MEMORY — Goals, beliefs, skills, preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS conceptual_memory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category      VARCHAR(50) NOT NULL CHECK (category IN (
    'goal', 'belief', 'skill', 'preference', 'plan',
    'personality', 'value', 'habit', 'relationship'
  )),
  key           VARCHAR(300) NOT NULL,
  value         TEXT NOT NULL,
  confidence    FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  evidence      TEXT[] DEFAULT '{}',
  source_count  INT DEFAULT 1,
  last_updated  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_conceptual_category ON conceptual_memory(category);
CREATE INDEX IF NOT EXISTS idx_conceptual_confidence ON conceptual_memory(confidence DESC);

-- ============================================================
-- DOCUMENT STORE — Ingested documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(500) NOT NULL,
  source      TEXT,
  content     TEXT NOT NULL,
  chunks      INT DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vector ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================
-- INSIGHT LOG — Track AI-generated insights over time
-- ============================================================
CREATE TABLE IF NOT EXISTS insight_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(50) NOT NULL,
  content     TEXT NOT NULL,
  applied     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update sessions.updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_episodic_updated_at
  BEFORE UPDATE ON episodic_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
