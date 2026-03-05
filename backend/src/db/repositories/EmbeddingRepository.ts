import { query, queryOne } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export interface MemoryEmbedding {
  id: string;
  message_id: string | null;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface SimilarMemory {
  id: string;
  message_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  created_at: Date;
}

export class EmbeddingRepository {
  async store(
    content: string,
    embedding: number[],
    messageId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<MemoryEmbedding> {
    const id = uuidv4();
    // pgvector expects array literal format: '[0.1, 0.2, ...]'
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await query<MemoryEmbedding>(
      `INSERT INTO memory_embeddings (id, message_id, content, embedding, metadata)
       VALUES ($1, $2, $3, $4::vector, $5) RETURNING *`,
      [id, messageId || null, content, vectorStr, JSON.stringify(metadata)]
    );
    return rows[0];
  }

  async searchSimilar(
    embedding: number[],
    topK = 5,
    threshold = 0.7
  ): Promise<SimilarMemory[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    return query<SimilarMemory>(
      `SELECT
        id, message_id, content, metadata, created_at,
        1 - (embedding <=> $1::vector) AS similarity
       FROM memory_embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, threshold, topK]
    );
  }

  async searchSimilarInDocuments(
    embedding: number[],
    topK = 5,
    threshold = 0.7
  ): Promise<Array<{ content: string; document_title: string; similarity: number }>> {
    const vectorStr = `[${embedding.join(',')}]`;
    return query(
      `SELECT
        dc.content,
        d.title AS document_title,
        1 - (dc.embedding <=> $1::vector) AS similarity
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE 1 - (dc.embedding <=> $1::vector) > $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, threshold, topK]
    );
  }

  async count(): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM memory_embeddings'
    );
    return parseInt(rows[0].count);
  }
}

export const embeddingRepository = new EmbeddingRepository();
