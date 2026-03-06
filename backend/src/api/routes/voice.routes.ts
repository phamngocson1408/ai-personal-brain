import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import OpenAI from 'openai';
import { config } from '../../config';

const ttsSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
});

export async function voiceRoutes(app: FastifyInstance): Promise<void> {
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  // POST /api/tts — convert text to speech, returns MP3 audio stream
  app.post('/tts', async (request, reply) => {
    const body = ttsSchema.safeParse(request.body);
    if (!body.success) {
      reply.status(400).send({ error: 'Invalid request', details: body.error.format() });
      return;
    }

    const { text, voice } = body.data;

    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      reply
        .header('Content-Type', 'audio/mpeg')
        .header('Content-Length', buffer.length)
        .header('Cache-Control', 'no-cache')
        .send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TTS failed';
      reply.status(500).send({ error: msg });
    }
  });
}
