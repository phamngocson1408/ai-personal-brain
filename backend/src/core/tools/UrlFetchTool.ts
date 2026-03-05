import axios from 'axios';
import * as cheerio from 'cheerio';
import { ToolExecutor } from './ToolRegistry';

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, nav, footer, header, aside, [aria-hidden="true"]').remove();
  $('noscript, iframe, form, button, input, select, textarea').remove();

  // Get main content area if available
  const mainContent =
    $('main, article, [role="main"], .content, #content, .post-content').first();

  const text = mainContent.length > 0
    ? mainContent.text()
    : $('body').text();

  return text
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
    .slice(0, 15000); // Limit to avoid overwhelming context
}

export const urlFetchTool: ToolExecutor = {
  name: 'fetch_url',
  definition: {
    name: 'fetch_url',
    description:
      'Fetch and extract the text content of a web page. ' +
      'Use this to read articles, documentation, or any web page in detail.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL of the page to fetch (must start with http:// or https://)',
        },
        extract_mode: {
          type: 'string',
          enum: ['full', 'summary'],
          description: 'full = return all text; summary = return first 3000 chars. Default: full',
        },
      },
      required: ['url'],
    },
  },
  async execute(input) {
    const url = input.url as string;
    const mode = (input.extract_mode as string) || 'full';

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `Error: Invalid URL. Must start with http:// or https://`;
    }

    const response = await axios.get<string>(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PersonalBrain/1.0; +https://github.com/personal-brain)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024, // 5MB
      responseType: 'text',
    });

    const contentType = response.headers['content-type'] || '';

    let text: string;
    if (contentType.includes('text/html')) {
      text = extractTextFromHtml(response.data);
    } else {
      text = String(response.data).slice(0, 15000);
    }

    if (mode === 'summary') {
      text = text.slice(0, 3000);
    }

    return `URL: ${url}\nContent-Type: ${contentType}\n\n${text}`;
  },
};
