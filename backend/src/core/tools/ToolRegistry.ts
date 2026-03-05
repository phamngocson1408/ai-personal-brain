import Anthropic from '@anthropic-ai/sdk';

export interface ToolExecutor {
  name: string;
  definition: Anthropic.Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

export interface ToolResult {
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  error?: string;
  durationMs: number;
}

export class ToolRegistry {
  private tools = new Map<string, ToolExecutor>();

  register(executor: ToolExecutor): void {
    this.tools.set(executor.name, executor);
  }

  getDefinitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    const start = Date.now();

    if (!tool) {
      return {
        toolName: name,
        input,
        output: '',
        error: `Tool "${name}" not found`,
        durationMs: Date.now() - start,
      };
    }

    try {
      const output = await tool.execute(input);
      return {
        toolName: name,
        input,
        output,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        toolName: name,
        input,
        output: '',
        error,
        durationMs: Date.now() - start,
      };
    }
  }
}
