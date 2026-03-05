import { Session, Message, StreamChunk, MemoryStats, UserProfile, SemanticSearchResult } from '../types';

// Khi deploy lên Render: đặt VITE_API_URL=https://your-backend.onrender.com/api
// Khi dev local: proxy qua vite.config.ts, dùng /api như cũ
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '');

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(title?: string): Promise<Session> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listSessions(): Promise<Session[]> {
  const res = await fetch(`${BASE_URL}/sessions`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Chat (SSE Streaming) ────────────────────────────────────────────────────

export function streamChat(
  sessionId: string,
  message: string,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const chunk: StreamChunk = JSON.parse(data);
              onChunk(chunk);
              if (chunk.type === 'done' || chunk.type === 'error') {
                onDone();
                return;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return () => controller.abort();
}

// ─── Memory ──────────────────────────────────────────────────────────────────

export async function getMemoryStats(): Promise<MemoryStats> {
  const res = await fetch(`${BASE_URL}/memory/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/memory/profile`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function searchMemory(query: string, k = 5): Promise<SemanticSearchResult[]> {
  const res = await fetch(`${BASE_URL}/memory/search?q=${encodeURIComponent(query)}&k=${k}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
