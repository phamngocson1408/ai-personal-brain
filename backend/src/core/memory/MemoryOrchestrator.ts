import { rawMemoryService } from './RawMemoryService';
import { semanticMemoryService, SemanticSearchResult } from './SemanticMemoryService';
import { episodicMemoryService } from './EpisodicMemoryService';
import { conceptualMemoryService } from './ConceptualMemoryService';
import { insightExtractor } from '../insights/InsightExtractor';
import { config } from '../../config';

export interface RetrievedContext {
  semanticMemories: SemanticSearchResult[];
  episodicSummaries: Array<{ title: string; summary: string; type: string; similarity: number }>;
  conceptualProfile: string;
  recentMessages: Array<{ role: string; content: string }>;
}

/**
 * MemoryOrchestrator — Central coordinator for all memory operations.
 *
 * Flow for SAVING:
 *   1. Save raw message to DB
 *   2. Generate embedding → store in vector DB
 *   3. Run insight extraction (async, non-blocking)
 *   4. Trigger daily summary if needed (async, non-blocking)
 *
 * Flow for RETRIEVAL:
 *   1. Search semantic memory (vector similarity)
 *   2. Search episodic summaries (vector similarity)
 *   3. Fetch high-confidence conceptual traits
 *   4. Get recent conversation context
 */
export class MemoryOrchestrator {

  // ─── SAVE ───────────────────────────────────────────────────────────────────

  async saveUserMessage(
    sessionId: string,
    content: string
  ): Promise<{ messageId: string }> {
    // 1. Save raw
    const message = await rawMemoryService.saveMessage(sessionId, 'user', content);

    // 2. Embed + store vector (awaited so it's available for search immediately)
    await semanticMemoryService.storeMessage(content, message.id, {
      role: 'user',
      session_id: sessionId,
    });

    return { messageId: message.id };
  }

  async saveAssistantMessage(
    sessionId: string,
    content: string,
    userMessage: string
  ): Promise<void> {
    // 1. Save raw
    const message = await rawMemoryService.saveMessage(
      sessionId,
      'assistant',
      content
    );

    // 2. Embed + store
    await semanticMemoryService.storeMessage(content, message.id, {
      role: 'assistant',
      session_id: sessionId,
    });

    // 3 & 4. Run insight extraction and daily summary asynchronously (fire-and-forget)
    this.runBackgroundTasks(sessionId, userMessage, content).catch((err) =>
      console.error('Background memory tasks failed:', err)
    );
  }

  private async runBackgroundTasks(
    sessionId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    // Extract conceptual insights from the conversation
    await insightExtractor.extractFromConversation(userMessage, assistantResponse);

    // Create daily summary if needed (runs once per day)
    const todaysMessages = await rawMemoryService.getTodaysMessages();
    if (todaysMessages.length >= 5) {
      await episodicMemoryService.createDailySummary(todaysMessages);
    }
  }

  // ─── RETRIEVE ────────────────────────────────────────────────────────────────

  async retrieveContext(
    sessionId: string,
    query: string
  ): Promise<RetrievedContext> {
    // Run all retrievals in parallel for performance
    const [semanticMemories, episodicSummaries, conceptualProfile, recentMessages] =
      await Promise.all([
        semanticMemoryService.search(query, config.memory.semanticTopK),
        episodicMemoryService.searchRelatedEpisodes(query, config.memory.episodicTopK),
        conceptualMemoryService.formatForSystemPrompt(),
        rawMemoryService.getRecentConversationHistory(
          sessionId,
          config.memory.maxContextMessages
        ),
      ]);

    return { semanticMemories, episodicSummaries, conceptualProfile, recentMessages };
  }

  // ─── SESSIONS ────────────────────────────────────────────────────────────────

  async createSession(title?: string) {
    return rawMemoryService.createSession(title);
  }

  async getSession(id: string) {
    return rawMemoryService.getSession(id);
  }

  async listSessions(limit = 20) {
    return rawMemoryService.listSessions(limit);
  }

  async getSessionMessages(sessionId: string) {
    return rawMemoryService.getSessionMessages(sessionId);
  }

  // ─── STATS ───────────────────────────────────────────────────────────────────

  async getMemoryStats() {
    const [totalMessages, totalEmbeddings, totalTraits] = await Promise.all([
      import('../../db/repositories/MessageRepository').then((m) =>
        m.messageRepository.countMessages()
      ),
      semanticMemoryService.getTotalMemoryCount(),
      conceptualMemoryService.countTraits(),
    ]);

    return { totalMessages, totalEmbeddings, totalTraits };
  }
}

export const memoryOrchestrator = new MemoryOrchestrator();
