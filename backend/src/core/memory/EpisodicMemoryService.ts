import Anthropic from '@anthropic-ai/sdk';
import { episodicRepository, EpisodicSummary } from '../../db/repositories/EpisodicRepository';
import { embeddingService } from '../ai/EmbeddingService';
import { Message } from '../../db/repositories/MessageRepository';
import { config } from '../../config';

export class EpisodicMemoryService {
  private claude: Anthropic;

  constructor() {
    this.claude = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async createDailySummary(messages: Message[]): Promise<EpisodicSummary | null> {
    if (messages.length < 3) return null;

    const today = new Date();
    const alreadyExists = await episodicRepository.hasDailySummaryForDate(today);
    if (alreadyExists) return null;

    const conversation = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const response = await this.claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze this conversation and create a structured daily summary.

CONVERSATION:
${conversation}

Return a JSON object with EXACTLY this structure:
{
  "title": "Brief descriptive title for this day's conversations",
  "summary": "2-4 paragraph narrative summary of what was discussed, decided, and learned today",
  "tags": ["tag1", "tag2", "tag3"],
  "key_points": ["point1", "point2", "point3"]
}

Be factual and specific. Focus on actual content, not meta-observations.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const embedding = await embeddingService.embed(
      `${parsed.title} ${parsed.summary}`
    );

    return episodicRepository.create(
      'daily',
      parsed.title,
      parsed.summary,
      parsed.tags,
      embedding,
      startOfDay,
      endOfDay,
      { key_points: parsed.key_points }
    );
  }

  async createTopicSummary(
    topic: string,
    messages: Message[]
  ): Promise<EpisodicSummary | null> {
    if (messages.length < 2) return null;

    const conversation = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const response = await this.claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Create a topic-based summary for the topic: "${topic}"

CONVERSATION:
${conversation}

Return JSON:
{
  "title": "Summary title",
  "summary": "Comprehensive summary of this topic",
  "tags": ["tag1", "tag2"],
  "insights": ["insight1", "insight2"]
}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed: { title: string; summary: string; tags: string[]; insights: string[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    const embedding = await embeddingService.embed(
      `${parsed.title} ${parsed.summary}`
    );

    return episodicRepository.create(
      'topic',
      parsed.title,
      parsed.summary,
      parsed.tags,
      embedding,
      undefined,
      undefined,
      { insights: parsed.insights }
    );
  }

  async searchRelatedEpisodes(
    query: string,
    topK: number = config.memory.episodicTopK
  ): Promise<Array<{ title: string; summary: string; type: string; similarity: number }>> {
    const embedding = await embeddingService.embed(query);
    const results = await episodicRepository.searchSimilar(embedding, topK, 0.55);
    return results.map((r) => ({
      title: r.title,
      summary: r.summary,
      type: r.type,
      similarity: r.similarity,
    }));
  }

  async getRecentEpisodes(limit = 5): Promise<EpisodicSummary[]> {
    return episodicRepository.getRecent(limit);
  }
}

export const episodicMemoryService = new EpisodicMemoryService();
