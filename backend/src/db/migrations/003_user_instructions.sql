-- Migration 003: User Instructions & Tool Preferences
-- Cho phép user định hình hành vi assistant qua explicit instructions
-- và enable/disable tools theo nhu cầu

-- user_instructions: lưu các chỉ dẫn hành vi từ user
-- source: explicit = user nói trực tiếp, learned = auto-detect từ thói quen
-- category: tone | format | topic | general
CREATE TABLE IF NOT EXISTS user_instructions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction TEXT        NOT NULL,
  category    VARCHAR(20) NOT NULL DEFAULT 'general',
  active      BOOLEAN     NOT NULL DEFAULT true,
  source      VARCHAR(20) NOT NULL DEFAULT 'explicit',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tool_preferences: bật/tắt từng tool theo yêu cầu user
-- Default: tất cả tools đều bật
CREATE TABLE IF NOT EXISTS tool_preferences (
  tool_name   VARCHAR(50) PRIMARY KEY,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default tool preferences (tất cả bật)
INSERT INTO tool_preferences (tool_name, enabled) VALUES
  ('web_search',       true),
  ('fetch_url',        true),
  ('ingest_document',  true)
ON CONFLICT (tool_name) DO NOTHING;
