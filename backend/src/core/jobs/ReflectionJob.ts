import Anthropic from '@anthropic-ai/sdk';
import { rawMemoryService } from '../memory/RawMemoryService';
import { episodicMemoryService } from '../memory/EpisodicMemoryService';
import { conceptualMemoryService } from '../memory/ConceptualMemoryService';
import { conceptualRepository } from '../../db/repositories/ConceptualRepository';
import { ConceptualCategory } from '../../db/repositories/ConceptualRepository';
import { config } from '../../config';

/**
 * ReflectionJob — Autonomous daily background job.
 *
 * Inspired by how the human brain consolidates memories during sleep:
 * 1. Reviews the day's conversations
 * 2. Extracts patterns and updates the user profile
 * 3. Applies memory decay to stale traits
 * 4. Creates weekly synthesis if it's been 7+ days
 *
 * Uses claude-haiku (cheap) not claude-opus (expensive).
 * Runs once per day via setInterval.
 */
export class ReflectionJob {
  private claude: Anthropic;
  private lastRunDate: string = '';
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.claude = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  start(): void {
    // Check every hour if a daily reflection is needed
    this.intervalHandle = setInterval(() => {
      this.runIfNeeded().catch((err) =>
        console.error('[ReflectionJob] Error:', err)
      );
    }, 60 * 60 * 1000); // every 1 hour

    console.log('[ReflectionJob] Started — daily reflection scheduled');
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastRunDate === today) return;

    // Only run between 2AM–4AM local time to minimize interference
    const hour = new Date().getHours();
    if (hour < 2 || hour > 4) return;

    console.log('[ReflectionJob] Running daily reflection...');
    this.lastRunDate = today;
    await this.run();
  }

  async run(): Promise<void> {
    try {
      await Promise.all([
        this.consolidateDailyMemories(),
        this.applyMemoryDecay(),
      ]);

      // Weekly synthesis every 7 days
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 0) { // Sunday
        await this.createWeeklySynthesis();
      }

      console.log('[ReflectionJob] Daily reflection complete');
    } catch (err) {
      console.error('[ReflectionJob] Reflection failed:', err);
    }
  }

  // ─── Daily Consolidation ─────────────────────────────────────────────────

  private async consolidateDailyMemories(): Promise<void> {
    const todaysMessages = await rawMemoryService.getTodaysMessages();
    if (todaysMessages.length < 2) return;

    // Extract deeper patterns from today's full conversation
    const conversation = todaysMessages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
      .join('\n\n');

    const response = await this.claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a day's worth of conversations to update a user's long-term profile.

CONVERSATIONS TODAY:
${conversation.slice(0, 3000)}

Extract ONLY clear, concrete, non-obvious insights about this person.
Return JSON array (empty if nothing new):
[
  {
    "category": "goal|belief|skill|preference|plan|personality|value|habit",
    "key": "concise_key",
    "value": "specific value learned",
    "confidence": 0.0-1.0
  }
]

Rules:
- confidence >= 0.8 only for explicitly stated facts
- Skip generic/obvious things
- Max 5 insights total`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';

    let insights: Array<{ category: string; key: string; value: string; confidence: number }> = [];
    try {
      // Extract JSON array from response (may have surrounding text)
      const match = text.match(/\[[\s\S]*\]/);
      insights = match ? JSON.parse(match[0]) : [];
    } catch {
      return;
    }

    const validCategories: ConceptualCategory[] = [
      'goal', 'belief', 'skill', 'preference', 'plan',
      'personality', 'value', 'habit', 'relationship',
    ];

    for (const insight of insights) {
      if (validCategories.includes(insight.category as ConceptualCategory)) {
        await conceptualMemoryService.update(
          insight.category as ConceptualCategory,
          insight.key,
          insight.value,
          insight.confidence,
          ['[daily-reflection]']
        );
      }
    }

    // Also trigger episodic summary for today
    await episodicMemoryService.createDailySummary(todaysMessages);
  }

  // ─── Memory Decay ─────────────────────────────────────────────────────────

  private async applyMemoryDecay(): Promise<void> {
    const result = await conceptualRepository.applyDecay();
    if (result.decayed > 0 || result.deleted > 0) {
      console.log(
        `[ReflectionJob] Memory decay: ${result.decayed} traits decayed, ${result.deleted} forgotten`
      );
    }
  }

  // ─── Weekly Synthesis ─────────────────────────────────────────────────────

  private async createWeeklySynthesis(): Promise<void> {
    // Get last 7 days of messages
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const weekMessages = await rawMemoryService.getMessagesInDateRange(start, end);

    if (weekMessages.length < 10) return;

    const profile = await conceptualMemoryService.formatForSystemPrompt();
    const sample = weekMessages
      .filter((m) => m.role === 'user')
      .slice(-30)
      .map((m) => m.content.slice(0, 200))
      .join('\n---\n');

    const response = await this.claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this week's conversations to identify patterns and growth.

CURRENT PROFILE:
${profile || 'No profile yet'}

THIS WEEK'S MESSAGES (sample):
${sample.slice(0, 2000)}

Return JSON:
{
  "title": "Week of [date] — [theme]",
  "summary": "2-3 paragraph synthesis of patterns, progress, recurring themes",
  "recurring_themes": ["theme1", "theme2"],
  "growth_areas": ["area1", "area2"]
}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return;
      const parsed = JSON.parse(match[0]);

      // Store as episodic summary (weekly type)
      const { embeddingService } = await import('../ai/EmbeddingService');
      const { episodicRepository } = await import('../../db/repositories/EpisodicRepository');

      const embedding = await embeddingService.embed(
        `${parsed.title} ${parsed.summary}`
      );

      await episodicRepository.create(
        'weekly' as any,
        parsed.title,
        parsed.summary,
        parsed.recurring_themes || [],
        embedding,
        start,
        end,
        { growth_areas: parsed.growth_areas }
      );

      console.log('[ReflectionJob] Weekly synthesis created:', parsed.title);
    } catch (err) {
      console.warn('[ReflectionJob] Weekly synthesis parse failed:', err);
    }
  }
}

export const reflectionJob = new ReflectionJob();
