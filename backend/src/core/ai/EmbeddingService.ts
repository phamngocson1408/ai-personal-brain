import OpenAI from 'openai';
import { config } from '../../config';

class EmbeddingService {
  private client: OpenAI;
  private cache = new Map<string, number[]>();

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async embed(text: string): Promise<number[]> {
    // Normalize and truncate to avoid token limits
    const normalized = text.replace(/\s+/g, ' ').trim().slice(0, 8000);
    const cacheKey = normalized;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const response = await this.client.embeddings.create({
      model: config.openai.embeddingModel,
      input: normalized,
      dimensions: config.openai.embeddingDimensions,
    });

    const embedding = response.data[0].embedding;

    // Cache up to 1000 entries to reduce API calls
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: config.openai.embeddingModel,
      input: texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000)),
      dimensions: config.openai.embeddingDimensions,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

export const embeddingService = new EmbeddingService();
