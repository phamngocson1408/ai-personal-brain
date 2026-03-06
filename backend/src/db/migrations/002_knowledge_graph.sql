-- ============================================================
-- 002: Knowledge Graph + Extended Episodic Types
-- ============================================================

-- Fix episodic_summaries type CHECK to support weekly/monthly
ALTER TABLE episodic_summaries DROP CONSTRAINT IF EXISTS episodic_summaries_type_check;
ALTER TABLE episodic_summaries
  ADD CONSTRAINT episodic_summaries_type_check
  CHECK (type IN ('daily', 'weekly', 'monthly', 'project', 'topic'));

-- ============================================================
-- KNOWLEDGE ENTITIES — Named things the user mentions
-- (people, projects, tools, concepts, places, events)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(500) NOT NULL,
  type          VARCHAR(100) NOT NULL, -- person|project|tool|concept|place|event|organization
  description   TEXT,
  attributes    JSONB DEFAULT '{}',
  mention_count INT DEFAULT 1,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, type)
);

CREATE INDEX IF NOT EXISTS idx_entities_type    ON knowledge_entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name    ON knowledge_entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_seen    ON knowledge_entities(last_seen DESC);

-- ============================================================
-- KNOWLEDGE RELATIONS — Directed edges between entities
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_relations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_entity UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  to_entity   UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  relation    VARCHAR(200) NOT NULL, -- works_on|uses|knows|built_with|deployed_on|part_of|caused_by
  confidence  FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  evidence    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_entity, to_entity, relation)
);

CREATE INDEX IF NOT EXISTS idx_relations_from ON knowledge_relations(from_entity);
CREATE INDEX IF NOT EXISTS idx_relations_to   ON knowledge_relations(to_entity);
CREATE INDEX IF NOT EXISTS idx_relations_rel  ON knowledge_relations(relation);

-- Trigger for relations updated_at
CREATE OR REPLACE TRIGGER update_knowledge_relations_updated_at
  BEFORE UPDATE ON knowledge_relations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Add emotional_weight to memory_embeddings metadata
-- (stored in JSONB metadata column, no schema change needed)
-- ============================================================

-- ============================================================
-- PROACTIVE MEMORY LOG — Track what was surfaced to user
-- ============================================================
CREATE TABLE IF NOT EXISTS proactive_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic       VARCHAR(500) NOT NULL,
  surfaced_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed   BOOLEAN DEFAULT FALSE
);
