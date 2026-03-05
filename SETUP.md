# AI Personal Brain — Setup & Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│              SSE Streaming ← → Fastify API               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  MEMORY ORCHESTRATOR                     │
│                                                          │
│  User Message                                            │
│      ↓ Save Raw → messages table                         │
│      ↓ Embed → memory_embeddings (pgvector)              │
│      ↓ [async] Insight Extraction → conceptual_memory    │
│      ↓ [async] Daily Summary → episodic_summaries        │
│                                                          │
│  When Answering:                                         │
│      → Semantic Search (vector similarity)               │
│      → Episodic Search (past summaries)                  │
│      → Conceptual Profile (traits)                       │
│      → Inject all into Claude system prompt              │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              CLAUDE SERVICE (claude-opus-4-6)            │
│                                                          │
│  Tool Loop:                                              │
│      1. Decide → call tool?                              │
│      2. Execute tool (web_search / fetch_url / ingest)   │
│      3. Inject result into context                       │
│      4. Generate streaming final response                │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              PostgreSQL 16 + pgvector                    │
│  messages / memory_embeddings / episodic_summaries       │
│  conceptual_memory / documents / document_chunks         │
└─────────────────────────────────────────────────────────┘
```

## Folder Structure

```
ai-personal-brain/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── middlewares/error.middleware.ts
│   │   │   └── routes/
│   │   │       ├── chat.routes.ts        ← SSE streaming + sessions
│   │   │       └── memory.routes.ts      ← Memory search & profile
│   │   ├── config/index.ts               ← All env config
│   │   ├── core/
│   │   │   ├── ai/
│   │   │   │   ├── ClaudeService.ts      ← Main AI service
│   │   │   │   ├── EmbeddingService.ts   ← OpenAI embeddings
│   │   │   │   └── PromptBuilder.ts      ← System prompt builder
│   │   │   ├── insights/
│   │   │   │   └── InsightExtractor.ts   ← Auto trait extraction
│   │   │   ├── memory/
│   │   │   │   ├── MemoryOrchestrator.ts ← Central coordinator
│   │   │   │   ├── RawMemoryService.ts
│   │   │   │   ├── SemanticMemoryService.ts
│   │   │   │   ├── EpisodicMemoryService.ts
│   │   │   │   └── ConceptualMemoryService.ts
│   │   │   └── tools/
│   │   │       ├── ToolRegistry.ts
│   │   │       ├── WebSearchTool.ts
│   │   │       ├── UrlFetchTool.ts
│   │   │       └── DocumentIngestionTool.ts
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   ├── migrations/001_initial.sql
│   │   │   └── repositories/
│   │   │       ├── MessageRepository.ts
│   │   │       ├── EmbeddingRepository.ts
│   │   │       ├── EpisodicRepository.ts
│   │   │       └── ConceptualRepository.ts
│   │   └── app.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ChatWindow.tsx
│   │   │   ├── Layout/Sidebar.tsx
│   │   │   └── Memory/MemoryPanel.tsx
│   │   ├── hooks/useChat.ts
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- Docker Desktop
- API Keys: Anthropic + OpenAI

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start PostgreSQL with pgvector

```bash
docker run -d \
  --name personal-brain-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=personal_brain \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 4. Start Backend

```bash
cd backend
npm install
npm run dev
# Migrations run automatically on startup
# API: http://localhost:3001
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

## Docker Compose (Production)

```bash
# Copy and fill in your env
cp .env.example .env

# Start everything
docker compose up -d

# View logs
docker compose logs -f backend

# Stop
docker compose down
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Create new session |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/:id/messages` | Get session messages |
| `POST` | `/api/chat` | **SSE streaming chat** |
| `GET` | `/api/memory/stats` | Memory statistics |
| `GET` | `/api/memory/profile` | User's conceptual profile |
| `GET` | `/api/memory/search?q=...` | Semantic memory search |
| `GET` | `/api/memory/episodes` | Episodic summaries |
| `POST` | `/api/memory/episodes/search` | Search episodes |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude Opus 4.6 for chat |
| `OPENAI_API_KEY` | ✅ | text-embedding-3-small |
| `DB_*` | ✅ | PostgreSQL connection |
| `BRAVE_SEARCH_API_KEY` | ❌ | Web search (free tier available) |

## Future Upgrades

### 1. Knowledge Graph
```
PostgreSQL → Apache AGE extension (graph queries)
Track: Person → WorksOn → Project
       Person → Learned → Skill
       Idea → RelatesTo → Idea
```

### 2. Autonomous Reflection Loop
```
Every 24h (cron job):
  → Analyze last 7 days of conversations
  → Update conceptual memory
  → Generate weekly insight report
  → Identify knowledge gaps
```

### 3. Weekly Insight Report
```typescript
// backend/src/jobs/WeeklyReportJob.ts
async generateWeeklyReport(): Promise<string> {
  const [profile, episodes, stats] = await Promise.all([...]);
  return claudeService.chatSimple([
    { role: 'user', content: `Generate a personal weekly review...` }
  ]);
}
```

### 4. Self-Improvement Loop
```
Claude analyzes its own responses → identifies patterns →
  → Updates system prompt templates
  → Adjusts insight extraction prompts
  → Reports accuracy metrics
```

### 5. Cost Optimization
```
Strategy:
├── Use claude-haiku-4-5 for InsightExtractor (simple classification)
├── Use claude-haiku-4-5 for EpisodicSummaries (structured output)
├── Use claude-opus-4-6 ONLY for main chat
├── Cache embeddings in Redis (avoid re-embedding same content)
├── Prompt caching: cache system prompt across turns (saves ~70%)
└── Batch embedding API calls
```

## Performance Tips

1. **Index tuning**: Rebuild pgvector IVFFlat indexes when > 100k rows:
   ```sql
   DROP INDEX idx_embeddings_vector;
   CREATE INDEX idx_embeddings_vector ON memory_embeddings
     USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 200);
   ```

2. **Prompt caching**: Add `cache_control: { type: "ephemeral" }` to system prompt
   for 90% cost reduction on repeated context.

3. **Connection pooling**: The pg Pool is configured with max=20. Adjust for your load.
