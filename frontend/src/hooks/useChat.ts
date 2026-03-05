import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ToolCall, StreamChunk } from '../types';
import { streamChat } from '../services/api';
function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || isStreaming || !content.trim()) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: genId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Add placeholder assistant message
      const assistantId = genId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolCalls: [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      let fullContent = '';

      const abort = streamChat(
        sessionId,
        content,
        (chunk: StreamChunk) => {
          if (chunk.type === 'text') {
            fullContent += chunk.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: fullContent }
                  : m
              )
            );
          } else if (chunk.type === 'tool_start') {
            const toolCall: ToolCall = {
              name: chunk.toolName || chunk.content,
              status: 'pending',
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls || []), toolCall] }
                  : m
              )
            );
          } else if (chunk.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;
                const toolCalls = (m.toolCalls || []).map((tc) =>
                  tc.name === chunk.toolName && tc.status === 'pending'
                    ? { ...tc, status: 'complete' as const, result: chunk.content }
                    : tc
                );
                return { ...m, toolCalls };
              })
            );
          }
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          abortRef.current = null;
        },
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: fullContent || `Error: ${err.message}`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsStreaming(false);
          abortRef.current = null;
        }
      );

      abortRef.current = abort;
    },
    [sessionId, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const loadMessages = useCallback(
    (historicalMessages: Array<{ role: 'user' | 'assistant'; content: string; id: string; created_at: string }>) => {
      setMessages(
        historicalMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
      );
    },
    []
  );

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadMessages,
  };
}
