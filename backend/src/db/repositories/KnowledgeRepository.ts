import { query, queryOne } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeEntity {
  id: string;
  name: string;
  type: string;
  description: string | null;
  attributes: Record<string, unknown>;
  mention_count: number;
  last_seen: Date;
  created_at: Date;
}

export interface KnowledgeRelation {
  id: string;
  from_entity: string;
  to_entity: string;
  relation: string;
  confidence: number;
  evidence: string | null;
  created_at: Date;
}

export interface KnowledgeGraph {
  entities: KnowledgeEntity[];
  relations: Array<KnowledgeRelation & {
    from_name: string;
    from_type: string;
    to_name: string;
    to_type: string;
  }>;
}

export class KnowledgeRepository {

  async upsertEntity(
    name: string,
    type: string,
    description?: string,
    attributes: Record<string, unknown> = {}
  ): Promise<KnowledgeEntity> {
    const id = uuidv4();
    const rows = await query<KnowledgeEntity>(
      `INSERT INTO knowledge_entities (id, name, type, description, attributes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name, type) DO UPDATE SET
         description = COALESCE(EXCLUDED.description, knowledge_entities.description),
         attributes = knowledge_entities.attributes || EXCLUDED.attributes,
         mention_count = knowledge_entities.mention_count + 1,
         last_seen = NOW()
       RETURNING *`,
      [id, name, type, description || null, JSON.stringify(attributes)]
    );
    return rows[0];
  }

  async upsertRelation(
    fromEntityId: string,
    toEntityId: string,
    relation: string,
    confidence: number,
    evidence?: string
  ): Promise<void> {
    const id = uuidv4();
    await query(
      `INSERT INTO knowledge_relations (id, from_entity, to_entity, relation, confidence, evidence)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (from_entity, to_entity, relation) DO UPDATE SET
         confidence = GREATEST(knowledge_relations.confidence, EXCLUDED.confidence),
         evidence = EXCLUDED.evidence,
         updated_at = NOW()`,
      [id, fromEntityId, toEntityId, relation, confidence, evidence || null]
    );
  }

  async getFrequentEntities(limit = 20): Promise<KnowledgeEntity[]> {
    return query<KnowledgeEntity>(
      `SELECT * FROM knowledge_entities
       ORDER BY mention_count DESC, last_seen DESC
       LIMIT $1`,
      [limit]
    );
  }

  async getRelationsForEntities(entityIds: string[]): Promise<KnowledgeGraph['relations']> {
    if (entityIds.length === 0) return [];
    const placeholders = entityIds.map((_, i) => `$${i + 1}`).join(',');
    return query(
      `SELECT
         r.id, r.from_entity, r.to_entity, r.relation, r.confidence, r.evidence, r.created_at,
         fe.name AS from_name, fe.type AS from_type,
         te.name AS to_name, te.type AS to_type
       FROM knowledge_relations r
       JOIN knowledge_entities fe ON fe.id = r.from_entity
       JOIN knowledge_entities te ON te.id = r.to_entity
       WHERE r.from_entity IN (${placeholders})
          OR r.to_entity   IN (${placeholders})
       ORDER BY r.confidence DESC
       LIMIT 30`,
      [...entityIds, ...entityIds]
    );
  }

  async getFullGraph(): Promise<KnowledgeGraph> {
    const entities = await this.getFrequentEntities(30);
    const entityIds = entities.map((e) => e.id);
    const relations = await this.getRelationsForEntities(entityIds);
    return { entities, relations };
  }

  async searchEntitiesByName(name: string): Promise<KnowledgeEntity[]> {
    return query<KnowledgeEntity>(
      `SELECT * FROM knowledge_entities
       WHERE name ILIKE $1
       ORDER BY mention_count DESC
       LIMIT 10`,
      [`%${name}%`]
    );
  }
}

export const knowledgeRepository = new KnowledgeRepository();
