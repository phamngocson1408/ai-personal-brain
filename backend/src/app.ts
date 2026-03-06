import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config';
import { runMigrations, closePool } from './db/connection';
import { chatRoutes } from './api/routes/chat.routes';
import { memoryRoutes } from './api/routes/memory.routes';
import { voiceRoutes } from './api/routes/voice.routes';
import { errorHandler } from './api/middlewares/error.middleware';
import { reflectionJob } from './core/jobs/ReflectionJob';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // SSE requires no CSP restrictions
  });

  // ─── Error Handler ──────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ─── Health Check ───────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(chatRoutes, { prefix: '/api' });
  await app.register(memoryRoutes, { prefix: '/api' });
  await app.register(voiceRoutes, { prefix: '/api' });

  return app;
}

async function main() {
  const app = await buildApp();

  // Run DB migrations on startup
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  // Start server
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🧠 Personal Brain API running on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start autonomous background jobs
  reflectionJob.start();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    reflectionJob.stop();
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
