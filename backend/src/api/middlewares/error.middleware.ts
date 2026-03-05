import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode || 500;

  console.error(`[${request.method}] ${request.url} - ${statusCode}: ${error.message}`);

  reply.status(statusCode).send({
    error: true,
    message:
      statusCode === 500
        ? 'An internal server error occurred'
        : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
