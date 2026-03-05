import axios from 'axios';
import { ToolExecutor } from './ToolRegistry';
import { config } from '../../config';

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveSearchResult[];
  };
}

async function searchViaBrave(query: string, count: number): Promise<string> {
  const response = await axios.get<BraveSearchResponse>(
    'https://api.search.brave.com/res/v1/web/search',
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': config.tools.braveSearchApiKey,
      },
      params: { q: query, count, text_decorations: false },
      timeout: 10000,
    }
  );

  const results = response.data?.web?.results ?? [];
  if (results.length === 0) return 'No results found.';

  return results
    .slice(0, count)
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}`
    )
    .join('\n\n');
}

export const webSearchTool: ToolExecutor = {
  name: 'web_search',
  definition: {
    name: 'web_search',
    description:
      'Search the web for current information, news, documentation, or any topic. ' +
      'Use this when you need up-to-date information beyond your training data.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific and concise.',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (1-10). Default: 5.',
        },
      },
      required: ['query'],
    },
  },
  async execute(input) {
    const query = input.query as string;
    const count = Math.min(Math.max(Number(input.count) || 5, 1), 10);

    if (!config.tools.braveSearchApiKey) {
      return `[Web Search] API key not configured. Cannot search for: "${query}"`;
    }

    return searchViaBrave(query, count);
  },
};
