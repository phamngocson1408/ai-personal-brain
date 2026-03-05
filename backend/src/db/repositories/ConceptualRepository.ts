import { query, queryOne } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export type ConceptualCategory =
  | 'goal'
  | 'belief'
  | 'skill'
  | 'preference'
  | 'plan'
  | 'personality'
  | 'value'
  | 'habit'
  | 'relationship';

export interface ConceptualMemory {
  id: string;
  category: ConceptualCategory;
  key: string;
  value: string;
  confidence: number;
  evidence: string[];
  source_count: number;
  last_updated: Date;
  created_at: Date;
}

export class ConceptualRepository {
  async upsert(
    category: ConceptualCategory,
    key: string,
    value: string,
    confidence: number,
    evidence: string[]
  ): Promise<ConceptualMemory> {
    const id = uuidv4();
    const rows = await query<ConceptualMemory>(
      `INSERT INTO conceptual_memory
         (id, category, key, value, confidence, evidence, source_count)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       ON CONFLICT (category, key) DO UPDATE SET
         value = EXCLUDED.value,
         confidence = GREATEST(conceptual_memory.confidence, EXCLUDED.confidence),
         evidence = (conceptual_memory.evidence || EXCLUDED.evidence)[1:10],
         source_count = conceptual_memory.source_count + 1,
         last_updated = NOW()
       RETURNING *`,
      [id, category, key, value, confidence, evidence]
    );
    return rows[0];
  }

  async getAll(): Promise<ConceptualMemory[]> {
    return query<ConceptualMemory>(
      `SELECT * FROM conceptual_memory
       ORDER BY confidence DESC, last_updated DESC`
    );
  }

  async getByCategory(
    category: ConceptualCategory
  ): Promise<ConceptualMemory[]> {
    return query<ConceptualMemory>(
      `SELECT * FROM conceptual_memory
       WHERE category = $1
       ORDER BY confidence DESC, last_updated DESC`,
      [category]
    );
  }

  async getHighConfidence(threshold = 0.7): Promise<ConceptualMemory[]> {
    return query<ConceptualMemory>(
      `SELECT * FROM conceptual_memory
       WHERE confidence >= $1
       ORDER BY category, confidence DESC`,
      [threshold]
    );
  }

  async getProfileSummary(): Promise<Record<ConceptualCategory, ConceptualMemory[]>> {
    const all = await this.getAll();
    const profile: Partial<Record<ConceptualCategory, ConceptualMemory[]>> = {};
    for (const item of all) {
      if (!profile[item.category]) profile[item.category] = [];
      profile[item.category]!.push(item);
    }
    return profile as Record<ConceptualCategory, ConceptualMemory[]>;
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM conceptual_memory WHERE id = $1', [id]);
  }

  async count(): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM conceptual_memory'
    );
    return parseInt(rows[0].count);
  }
}

export const conceptualRepository = new ConceptualRepository();
