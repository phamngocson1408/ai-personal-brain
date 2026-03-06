import Anthropic from '@anthropic-ai/sdk';
import { knowledgeRepository, KnowledgeGraph } from '../../db/repositories/KnowledgeRepository';
import { config } from '../../config';

interface ExtractedEntity {
  name: string;
  type: 'person' | 'project' | 'tool' | 'concept' | 'place' | 'event' | 'organization';
  description?: string;
}

interface ExtractedRelation {
  from: string;
  to: string;
  relation: string;
  confidence: number;
  evidence?: string;
}

interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

/**
 * KnowledgeGraphService — Extracts and queries a lightweight knowledge graph.
 *
 * After each conversation turn, extracts:
 * - Entities: named things the user mentions (projects, tools, people, concepts)
 * - Relations: connections between entities (user WORKS_ON project, project USES tool)
 *
 * This enables associative thinking — connecting ideas across sessions.
 * Uses claude-haiku for cost efficiency.
 */
export class KnowledgeGraphService {
  private claude: Anthropic;

  constructor() {
    this.claude = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async extractAndStore(userMessage: string, assistantResponse: string): Promise<void> {
    if (userMessage.length < 20) return;

    try {
      const result = await this.extract(userMessage, assistantResponse);

      // Upsert entities first, collect ID map
      const entityMap = new Map<string, string>(); // name → id

      for (const entity of result.entities) {
        const stored = await knowledgeRepository.upsertEntity(
          entity.name,
          entity.type,
          entity.description
        );
        entityMap.set(entity.name.toLowerCase(), stored.id);
      }

      // Upsert relations
      for (const rel of result.relations) {
        const fromId = entityMap.get(rel.from.toLowerCase());
        const toId = entityMap.get(rel.to.toLowerCase());

        if (fromId && toId && fromId !== toId) {
          await knowledgeRepository.upsertRelation(
            fromId, toId, rel.relation, rel.confidence, rel.evidence
          );
        }
      }
    } catch (err) {
      console.warn('[KnowledgeGraph] Extraction failed:', err);
    }
  }

  private async extract(userMessage: string, assistantResponse: string): Promise<ExtractionResult> {
    const response = await this.claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Extract named entities and their relationships from this conversation.

USER: "${userMessage.slice(0, 600)}"
ASSISTANT: "${assistantResponse.slice(0, 300)}"

Return JSON (empty arrays if nothing clear):
{
  "entities": [
    { "name": "exact name", "type": "person|project|tool|concept|place|event|organization", "description": "brief description" }
  ],
  "relations": [
    { "from": "entity name", "to": "entity name", "relation": "works_on|uses|knows|built_with|deployed_on|part_of|caused_by|related_to", "confidence": 0.7, "evidence": "brief quote" }
  ]
}

Rules:
- Only extract SPECIFIC named things, not generic words
- "TypeScript", "Render", "PostgreSQL" = tools
- Project names, people's names, company names = entities
- Skip vague terms like "system", "code", "thing"
- Max 5 entities, max 5 relations`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { entities: [], relations: [] };
    } catch {
      return { entities: [], relations: [] };
    }
  }

  async getGraphForPrompt(): Promise<string> {
    try {
      const graph = await knowledgeRepository.getFullGraph();
      return this.formatGraph(graph);
    } catch {
      return '';
    }
  }

  private formatGraph(graph: KnowledgeGraph): string {
    if (graph.entities.length === 0) return '';

    const lines: string[] = [];

    // Top entities by mention
    const topEntities = graph.entities.slice(0, 15);
    const byType = new Map<string, string[]>();

    for (const e of topEntities) {
      if (!byType.has(e.type)) byType.set(e.type, []);
      const desc = e.description ? ` (${e.description})` : '';
      byType.get(e.type)!.push(`${e.name}${desc} [×${e.mention_count}]`);
    }

    for (const [type, names] of byType) {
      lines.push(`${type.toUpperCase()}: ${names.join(', ')}`);
    }

    // Key relations
    if (graph.relations.length > 0) {
      lines.push('');
      lines.push('Connections:');
      for (const r of graph.relations.slice(0, 10)) {
        lines.push(`  ${r.from_name} → ${r.relation.replace(/_/g, ' ')} → ${r.to_name}`);
      }
    }

    return lines.join('\n');
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
