import { FastifyInstance } from 'fastify';
import { semanticMemoryService } from '../../core/memory/SemanticMemoryService';
import { episodicMemoryService } from '../../core/memory/EpisodicMemoryService';
import { conceptualMemoryService } from '../../core/memory/ConceptualMemoryService';
import { memoryOrchestrator } from '../../core/memory/MemoryOrchestrator';
import { episodicRepository } from '../../db/repositories/EpisodicRepository';

export async function memoryRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/memory/stats — memory statistics
  app.get('/memory/stats', async (request, reply) => {
    const stats = await memoryOrchestrator.getMemoryStats();
    reply.send(stats);
  });

  // GET /api/memory/profile — user conceptual profile
  app.get('/memory/profile', async (request, reply) => {
    const profile = await conceptualMemoryService.getFullProfile();
    reply.send(profile);
  });

  // GET /api/memory/search — semantic search
  app.get('/memory/search', async (request, reply) => {
    const { q, k } = request.query as { q?: string; k?: string };
    if (!q) {
      reply.status(400).send({ error: 'Query parameter "q" is required' });
      return;
    }
    const topK = Math.min(parseInt(k || '5'), 20);
    const results = await semanticMemoryService.search(q, topK);
    reply.send(results);
  });

  // GET /api/memory/episodes — episodic summaries
  app.get('/memory/episodes', async (request, reply) => {
    const { type, limit } = request.query as { type?: string; limit?: string };
    const episodes = type
      ? await episodicRepository.findByType(
          type as 'daily' | 'project' | 'topic',
          parseInt(limit || '10')
        )
      : await episodicMemoryService.getRecentEpisodes(parseInt(limit || '10'));
    reply.send(episodes || []);
  });

  // POST /api/memory/episodes/search — search episodic memories
  app.post('/memory/episodes/search', async (request, reply) => {
    const { query, topK } = request.body as { query: string; topK?: number };
    if (!query) {
      reply.status(400).send({ error: 'query is required' });
      return;
    }
    const results = await episodicMemoryService.searchRelatedEpisodes(
      query,
      topK || 5
    );
    reply.send(results);
  });

  // GET /api/memory/documents/search — search documents
  app.get('/memory/documents/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q) {
      reply.status(400).send({ error: 'Query parameter "q" is required' });
      return;
    }
    const results = await semanticMemoryService.searchDocuments(q, 5);
    reply.send(results);
  });
}
