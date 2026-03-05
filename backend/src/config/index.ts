import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'personal_brain',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-opus-4-6',
    maxTokens: 8192,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
  },

  tools: {
    serpApiKey: process.env.SERP_API_KEY || '',
    braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY || '',
  },

  memory: {
    semanticTopK: 5,
    episodicTopK: 3,
    maxContextMessages: 20,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};

export type Config = typeof config;
