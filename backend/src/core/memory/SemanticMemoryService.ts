import { embeddingRepository, SimilarMemory } from '../../db/repositories/EmbeddingRepository';
import { embeddingService } from '../ai/EmbeddingService';
import { importanceScorer } from './ImportanceScorer';
import { queryExpander } from './QueryExpander';
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

  /**
   * Tìm kiếm với query expansion: sinh các biến thể ngữ nghĩa của query,
   * search song song với tất cả variants, merge và deduplicate kết quả.
   *
   * Giải quyết vấn đề semantic gap: "thanh lý" → tìm thấy "máy lọc nước cần bán"
   */
  async searchWithExpansion(
    query: string,
    topK: number = config.memory.semanticTopK
  ): Promise<SemanticSearchResult[]> {
    // Sinh query variants song song với việc chuẩn bị (không block)
    const variants = await queryExpander.expand(query);

    // Search tất cả variants song song
    const allResults = await Promise.all(
      variants.map((v) => this.search(v, topK))
    );

    // Merge và deduplicate: giữ kết quả có similarity cao nhất theo messageId
    const seen = new Map<string, SemanticSearchResult>();
    for (const results of allResults) {
      for (const result of results) {
        // Dùng messageId làm key; nếu không có thì dùng content prefix
        const key = result.messageId ?? result.content.slice(0, 80);
        const existing = seen.get(key);
        if (!existing || result.similarity > existing.similarity) {
          seen.set(key, result);
        }
      }
    }

    // Sort theo similarity giảm dần, lấy top-K
    return Array.from(seen.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async getTotalMemoryCount(): Promise<number> {
    return embeddingRepository.count();
  }
}

export const semanticMemoryService = new SemanticMemoryService();
