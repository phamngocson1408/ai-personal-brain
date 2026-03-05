import { query, queryOne, withTransaction } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  title: string | null;
  summary: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export class MessageRepository {
  async createSession(title?: string): Promise<Session> {
    const id = uuidv4();
    const rows = await query<Session>(
      'INSERT INTO sessions (id, title) VALUES ($1, $2) RETURNING *',
      [id, title || null]
    );
    return rows[0];
  }

  async getSession(id: string): Promise<Session | null> {
    return queryOne<Session>('SELECT * FROM sessions WHERE id = $1', [id]);
  }

  async listSessions(limit = 20, offset = 0): Promise<Session[]> {
    return query<Session>(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  }

  async updateSessionTitle(id: string, title: string): Promise<void> {
    await query('UPDATE sessions SET title = $1 WHERE id = $2', [title, id]);
  }

  async saveMessage(
    sessionId: string,
    role: Message['role'],
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Message> {
    const id = uuidv4();
    const rows = await query<Message>(
      `INSERT INTO messages (id, session_id, role, content, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, sessionId, role, content, JSON.stringify(metadata)]
    );
    return rows[0];
  }

  async getSessionMessages(
    sessionId: string,
    limit = 50,
    offset = 0
  ): Promise<Message[]> {
    return query<Message>(
      `SELECT * FROM messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
  }

  async getRecentMessages(limit = 100): Promise<Message[]> {
    return query<Message>(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  async getMessagesByDateRange(start: Date, end: Date): Promise<Message[]> {
    return query<Message>(
      `SELECT * FROM messages
       WHERE created_at >= $1 AND created_at <= $2
       ORDER BY created_at ASC`,
      [start, end]
    );
  }

  async countMessages(): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM messages'
    );
    return parseInt(rows[0].count);
  }
}

export const messageRepository = new MessageRepository();
