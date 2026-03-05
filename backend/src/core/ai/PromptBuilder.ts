import { RetrievedContext } from '../memory/MemoryOrchestrator';

export class PromptBuilder {
  buildSystemPrompt(context: RetrievedContext): string {
    const now = new Date().toISOString();
    const sections: string[] = [];

    sections.push(`# Personal Brain AI Assistant

You are a deeply personalized AI assistant that knows the user across time.
Today: ${now}

## CORE PRINCIPLES
1. NEVER fabricate information — clearly distinguish what you know vs. what you're reasoning
2. CLEARLY label the source of every claim:
   - [MEMORY] = from stored conversation history
   - [EPISODIC] = from past session summaries
   - [PROFILE] = from the user's known traits
   - [WEB] = from a web search or URL fetch
   - [REASONING] = your current analysis/inference
3. When you lack data, say so explicitly instead of guessing
4. Build on prior context — reference past conversations when relevant
5. Prioritize accuracy over completeness`);

    // User profile section
    if (context.conceptualProfile.length > 0) {
      sections.push(`## USER PROFILE (learned over time)
${context.conceptualProfile}`);
    }

    // Episodic memory section
    if (context.episodicSummaries.length > 0) {
      const episodic = context.episodicSummaries
        .map(
          (e) =>
            `### [${e.type.toUpperCase()}] ${e.title} (relevance: ${(e.similarity * 100).toFixed(0)}%)\n${e.summary}`
        )
        .join('\n\n');

      sections.push(`## RELEVANT PAST EPISODES [EPISODIC]
${episodic}`);
    }

    // Semantic memory section
    if (context.semanticMemories.length > 0) {
      const semantic = context.semanticMemories
        .map(
          (m) =>
            `[${(m.similarity * 100).toFixed(0)}%] ${m.content}`
        )
        .join('\n---\n');

      sections.push(`## RELEVANT MEMORIES [MEMORY]
These are semantically similar past messages:
${semantic}`);
    }

    sections.push(`## TOOL USAGE GUIDELINES
When using tools, follow this flow:
1. Decide if a tool is needed (state your reasoning)
2. Call the tool with precise parameters
3. Inject the result into your response with [WEB] or [TOOL] label
4. Generate your final answer based on the result

Always prefer memory over web search. Only search when memory is insufficient.`);

    return sections.join('\n\n---\n\n');
  }

  buildToolResultLabel(toolName: string, result: string, error?: string): string {
    if (error) {
      return `[TOOL ERROR - ${toolName}]: ${error}`;
    }
    const label = toolName === 'web_search' ? '[WEB]' :
                  toolName === 'fetch_url' ? '[WEB FETCH]' :
                  `[TOOL: ${toolName}]`;
    return `${label}\n${result}`;
  }
}

export const promptBuilder = new PromptBuilder();
