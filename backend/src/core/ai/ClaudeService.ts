import Anthropic from '@anthropic-ai/sdk';
import { ToolRegistry } from '../tools/ToolRegistry';
import { webSearchTool } from '../tools/WebSearchTool';
import { urlFetchTool } from '../tools/UrlFetchTool';
import { documentIngestionTool } from '../tools/DocumentIngestionTool';
import { promptBuilder } from './PromptBuilder';
import { memoryOrchestrator, RetrievedContext } from '../memory/MemoryOrchestrator';
import { config } from '../../config';

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error';
  content: string;
  toolName?: string;
}

export class ClaudeService {
  private client: Anthropic;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
    this.toolRegistry = new ToolRegistry();

    // Register all tools
    this.toolRegistry.register(webSearchTool);
    this.toolRegistry.register(urlFetchTool);
    this.toolRegistry.register(documentIngestionTool);
  }

  /**
   * Main chat function with streaming.
   * Yields StreamChunk objects as the response is generated.
   */
  async *chat(
    sessionId: string,
    userMessage: string
  ): AsyncGenerator<StreamChunk> {
    try {
      // 1. Retrieve context from memory orchestrator
      const context = await memoryOrchestrator.retrieveContext(sessionId, userMessage);
      const systemPrompt = promptBuilder.buildSystemPrompt(context);

      // 2. Build conversation history
      const history = context.recentMessages;
      const messages: Anthropic.MessageParam[] = [
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      // 3. Agentic tool loop with streaming
      let fullResponse = '';

      while (true) {
        const stream = this.client.messages.stream({
          model: config.anthropic.model,
          max_tokens: config.anthropic.maxTokens,
          thinking: { type: 'adaptive' },
          system: systemPrompt,
          messages,
          tools: this.toolRegistry.getDefinitions(),
          tool_choice: { type: 'auto' },
        });

        // Stream text deltas to the client
        stream.on('text', (delta) => {
          fullResponse += delta;
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield { type: 'text', content: event.delta.text };
          }
        }

        const message = await stream.finalMessage();

        // 4. Check stop reason
        if (message.stop_reason === 'end_turn') {
          break;
        }

        if (message.stop_reason === 'pause_turn') {
          // Server-side tool hit iteration limit; re-send to continue
          messages.push({ role: 'assistant', content: message.content });
          messages.push({ role: 'user', content: [] });
          continue;
        }

        if (message.stop_reason !== 'tool_use') {
          break;
        }

        // 5. Execute tool calls
        const toolUseBlocks = message.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        );

        messages.push({ role: 'assistant', content: message.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          yield { type: 'tool_start', content: toolUse.name, toolName: toolUse.name };

          const result = await this.toolRegistry.execute(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );

          const resultContent = result.error
            ? `Error: ${result.error}`
            : result.output;

          yield {
            type: 'tool_result',
            content: resultContent.slice(0, 500) + (resultContent.length > 500 ? '...' : ''),
            toolName: toolUse.name,
          };

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultContent,
            is_error: !!result.error,
          });
        }

        messages.push({ role: 'user', content: toolResults });
      }

      yield { type: 'done', content: fullResponse };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield { type: 'error', content: message };
    }
  }

  /**
   * Non-streaming chat — returns the complete response string.
   * Used internally for summaries and insight extraction.
   */
  async chatSimple(
    messages: Anthropic.MessageParam[],
    system?: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: config.anthropic.model,
      max_tokens: 4096,
      messages,
      system,
    });

    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');
  }
}

export const claudeService = new ClaudeService();
