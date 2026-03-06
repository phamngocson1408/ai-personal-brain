import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { claudeService, StreamChunk } from '../../core/ai/ClaudeService';
import { memoryOrchestrator } from '../../core/memory/MemoryOrchestrator';

const chatSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(10000),
});

const newSessionSchema = z.object({
  title: z.string().optional(),
});

export async function chatRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/chat — streaming endpoint via SSE
  app.post('/chat', async (request, reply) => {
    const body = chatSchema.safeParse(request.body);
    if (!body.success) {
      reply.status(400).send({ error: 'Invalid request', details: body.error.format() });
      return;
    }

    const { sessionId, message } = body.data;

    // Verify session exists
    const session = await memoryOrchestrator.getSession(sessionId);
    if (!session) {
      reply.status(404).send({ error: 'Session not found' });
      return;
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    let fullAssistantResponse = '';

    try {
      // Stream response (user message is saved AFTER streaming to avoid duplicate in history)
      for await (const chunk of claudeService.chat(sessionId, message)) {
        if (chunk.type === 'text') {
          fullAssistantResponse += chunk.content;
        }

        const data = JSON.stringify(chunk);
        reply.raw.write(`data: ${data}\n\n`);

        if (chunk.type === 'done' || chunk.type === 'error') {
          break;
        }
      }

      // Save user message and complete assistant response to memory
      await memoryOrchestrator.saveUserMessage(sessionId, message);
      if (fullAssistantResponse.length > 0) {
        await memoryOrchestrator.saveAssistantMessage(
          sessionId,
          fullAssistantResponse,
          message
        );
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const errorChunk: StreamChunk = { type: 'error', content: errorMsg };
      reply.raw.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // POST /api/sessions — create a new session
  app.post('/sessions', async (request, reply) => {
    const body = newSessionSchema.safeParse(request.body);
    const title = body.success ? body.data.title : undefined;
    const session = await memoryOrchestrator.createSession(title);
    reply.status(201).send(session);
  });

  // GET /api/sessions — list sessions
  app.get('/sessions', async (request, reply) => {
    const sessions = await memoryOrchestrator.listSessions(20);
    reply.send(sessions);
  });

  // GET /api/sessions/:id/messages — get messages in a session
  app.get('/sessions/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await memoryOrchestrator.getSession(id);
    if (!session) {
      reply.status(404).send({ error: 'Session not found' });
      return;
    }
    const messages = await memoryOrchestrator.getSessionMessages(id);
    reply.send(messages);
  });
}
