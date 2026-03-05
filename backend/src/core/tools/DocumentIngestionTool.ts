import { query as dbQuery } from '../../db/connection';
import { semanticMemoryService } from '../memory/SemanticMemoryService';
import { v4 as uuidv4 } from 'uuid';
import { ToolExecutor } from './ToolRegistry';

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }

  return chunks.filter((c) => c.trim().length > 50);
}

export const documentIngestionTool: ToolExecutor = {
  name: 'ingest_document',
  definition: {
    name: 'ingest_document',
    description:
      'Ingest and store a document into the personal brain memory. ' +
      'The document will be chunked, embedded, and made searchable. ' +
      'Use this for important articles, notes, or reference material.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the document',
        },
        content: {
          type: 'string',
          description: 'Full text content of the document to ingest',
        },
        source: {
          type: 'string',
          description: 'URL or origin source of the document (optional)',
        },
      },
      required: ['title', 'content'],
    },
  },
  async execute(input) {
    const title = input.title as string;
    const content = input.content as string;
    const source = (input.source as string) || '';

    if (content.length < 50) {
      return 'Error: Document content too short to ingest.';
    }

    const docId = uuidv4();
    const chunks = chunkText(content);

    // Store document metadata
    await dbQuery(
      `INSERT INTO documents (id, title, source, content, chunks)
       VALUES ($1, $2, $3, $4, $5)`,
      [docId, title, source, content.slice(0, 50000), chunks.length]
    );

    // Store chunks with embeddings
    await semanticMemoryService.storeDocument(docId, chunks);

    // Store chunk rows
    for (let i = 0; i < chunks.length; i++) {
      await dbQuery(
        `INSERT INTO document_chunks (id, document_id, chunk_index, content)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), docId, i, chunks[i]]
      );
    }

    return (
      `Document "${title}" successfully ingested.\n` +
      `- ID: ${docId}\n` +
      `- Chunks: ${chunks.length}\n` +
      `- Characters: ${content.length}\n` +
      `The document is now searchable in your personal brain memory.`
    );
  },
};
