import { messageRepository, Message, Session } from '../../db/repositories/MessageRepository';

export class RawMemoryService {
  async createSession(title?: string): Promise<Session> {
    return messageRepository.createSession(title);
  }

  async getSession(id: string): Promise<Session | null> {
    return messageRepository.getSession(id);
  }

  async listSessions(limit = 20): Promise<Session[]> {
    return messageRepository.listSessions(limit);
  }

  async saveMessage(
    sessionId: string,
    role: Message['role'],
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    return messageRepository.saveMessage(sessionId, role, content, metadata);
  }

  async getSessionMessages(sessionId: string, limit = 50): Promise<Message[]> {
    return messageRepository.getSessionMessages(sessionId, limit);
  }

  async getRecentConversationHistory(
    sessionId: string,
    maxMessages = 20
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await messageRepository.getSessionMessages(
      sessionId,
      maxMessages
    );
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async getMessagesInDateRange(start: Date, end: Date): Promise<Message[]> {
    return messageRepository.getMessagesByDateRange(start, end);
  }

  async getTodaysMessages(): Promise<Message[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.getMessagesInDateRange(start, end);
  }
}

export const rawMemoryService = new RawMemoryService();
