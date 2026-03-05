import { query, queryOne } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export interface EpisodicSummary {
  id: string;
  type: 'daily' | 'project' | 'topic';
  title: string;
  summary: string;
  tags: string[];
  period_start: Date | null;
  period_end: Date | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SimilarEpisodic {
  id: string;
  type: string;
  title: string;
  summary: string;
  tags: string[];
  similarity: number;
  period_start: Date | null;
  period_end: Date | null;
}

export class EpisodicRepository {
  async create(
    type: EpisodicSummary['type'],
    title: string,
    summary: string,
    tags: string[],
    embedding: number[],
    periodStart?: Date,
    periodEnd?: Date,
    metadata: Record<string, unknown> = {}
  ): Promise<EpisodicSummary> {
    const id = uuidv4();
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await query<EpisodicSummary>(
      `INSERT INTO episodic_summaries
         (id, type, title, summary, tags, embedding, period_start, period_end, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9)
       RETURNING *`,
      [
        id, type, title, summary, tags,
        vectorStr, periodStart || null, periodEnd || null,
        JSON.stringify(metadata)
      ]
    );
    return rows[0];
  }

  async findByType(
    type: EpisodicSummary['type'],
    limit = 10
  ): Promise<EpisodicSummary[]> {
    return query<EpisodicSummary>(
      `SELECT * FROM episodic_summaries
       WHERE type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [type, limit]
    );
  }

  async findByDate(date: Date): Promise<EpisodicSummary[]> {
    return query<EpisodicSummary>(
      `SELECT * FROM episodic_summaries
       WHERE type = 'daily'
         AND period_start::date = $1::date`,
      [date]
    );
  }

  async searchSimilar(
    embedding: number[],
    topK = 3,
    threshold = 0.6
  ): Promise<SimilarEpisodic[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    return query<SimilarEpisodic>(
      `SELECT
        id, type, title, summary, tags, period_start, period_end,
        1 - (embedding <=> $1::vector) AS similarity
       FROM episodic_summaries
       WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, threshold, topK]
    );
  }

  async getRecent(limit = 5): Promise<EpisodicSummary[]> {
    return query<EpisodicSummary>(
      `SELECT * FROM episodic_summaries ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  async hasDailySummaryForDate(date: Date): Promise<boolean> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM episodic_summaries
       WHERE type = 'daily' AND period_start::date = $1::date`,
      [date]
    );
    return parseInt(rows[0].count) > 0;
  }
}

export const episodicRepository = new EpisodicRepository();
