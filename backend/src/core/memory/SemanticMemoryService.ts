import { embeddingRepository, SimilarMemory } from '../../db/repositories/EmbeddingRepository';
import { embeddingService } from '../ai/EmbeddingService';
import { importanceScorer } from './ImportanceScorer';
import { config } from '../../config';

export interface SemanticSearchResult {
  content: string;
  similarity: number;
  messageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class SemanticMemoryService {
  async storeMessage(
    content: string,
    messageId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const embedding = await embeddingService.embed(content);
    // Store emotional weight in metadata for boosted retrieval
    const emotional_weight = importanceScorer.emotionalWeight(content);
    await embeddingRepository.store(content, embedding, messageId, {
      ...metadata,
      emotional_weight,
    });
  }

  async search(
    query: string,
    topK: number = config.memory.semanticTopK
  ): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await embeddingService.embed(query);
    // Fetch more than needed, then re-rank with emotional boost
    const results = await embeddingRepository.searchSimilar(
      queryEmbedding,
      topK * 2,
      0.55
    );

    // Apply emotional weight boost: high-emotion memories surface more readily
    const boosted = results
      .map((r) => {
        const emotionalWeight = (r.metadata?.emotional_weight as number) ?? 0;
        return {
          ...r,
          boostedScore: r.similarity * (1 + 0.15 * emotionalWeight),
        };
      })
      .sort((a, b) => b.boostedScore - a.boostedScore)
      .slice(0, topK);

    return boosted.map((r) => ({
      content: r.content,
      similarity: r.similarity,
      messageId: r.message_id,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));
  }

  async searchDocuments(
    query: string,
    topK = 5
  ): Promise<Array<{ content: string; documentTitle: string; similarity: number }>> {
    const queryEmbedding = await embeddingService.embed(query);
    const results = await embeddingRepository.searchSimilarInDocuments(
      queryEmbedding,
      topK,
      0.65
    );
    return results.map((r) => ({
      content: r.content,
      documentTitle: r.document_title,
      similarity: r.similarity,
    }));
  }

  async storeDocument(
    documentId: string,
    chunks: string[]
  ): Promise<void> {
    if (chunks.length === 0) return;
    const embeddings = await embeddingService.embedBatch(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await embeddingRepository.store(chunks[i], embeddings[i], undefined, {
        document_id: documentId,
        chunk_index: i,
      });
    }
  }

  async getTotalMemoryCount(): Promise<number> {
    return embeddingRepository.count();
  }
}

export const semanticMemoryService = new SemanticMemoryService();
