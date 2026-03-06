import { RetrievedContext } from '../memory/MemoryOrchestrator';

export class PromptBuilder {
  buildSystemPrompt(context: RetrievedContext): string {
    const now = new Date();
    const sections: string[] = [];

    sections.push(`# Personal Brain AI Assistant

You are a deeply personalized AI assistant that knows the user across time.
Today: ${now.toISOString()} (${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})

## CORE PRINCIPLES
1. NEVER fabricate information — clearly distinguish what you know vs. what you're reasoning
2. CLEARLY label the source of every claim:
   - [MEMORY] = from stored conversation history
   - [EPISODIC] = from past session summaries
   - [PROFILE] = from the user's known traits
   - [KNOWLEDGE] = from the user's knowledge graph (entities & relationships)
   - [WEB] = from a web search or URL fetch
   - [REASONING] = your current analysis/inference
3. When you lack data, say so explicitly instead of guessing
4. Build on prior context — reference past conversations when relevant
5. Prioritize accuracy over completeness`);

    // User profile section
    if (context.conceptualProfile.length > 0) {
      sections.push(`## USER PROFILE [PROFILE]
(Traits learned from conversations over time — higher confidence = more reliable)
${context.conceptualProfile}`);
    }

    // Knowledge graph section — associative connections
    if (context.knowledgeGraph && context.knowledgeGraph.length > 0) {
      sections.push(`## KNOWLEDGE GRAPH [KNOWLEDGE]
Named entities and relationships the user has mentioned across all sessions:
${context.knowledgeGraph}`);
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

    // Semantic memory section with temporal context
    if (context.semanticMemories.length > 0) {
      const semantic = context.semanticMemories
        .map((m) => {
          const age = this.formatAge(m.createdAt);
          const emotionFlag = ((m.metadata?.emotional_weight as number) ?? 0) > 0.4 ? ' ⚡' : '';
          return `[${(m.similarity * 100).toFixed(0)}%${emotionFlag}] (${age}) ${m.content}`;
        })
        .join('\n---\n');

      sections.push(`## RELEVANT MEMORIES [MEMORY]
Semantically similar past messages (⚡ = high emotional weight, more memorable):
${semantic}`);
    }

    sections.push(`## TOOL USAGE GUIDELINES
When using tools, follow this flow:
1. Decide if a tool is needed (state your reasoning)
2. Call the tool with precise parameters
3. Inject the result into your response with [WEB] or [TOOL] label
4. Generate your final answer based on the result

Always prefer memory over web search. Only search when memory is insufficient.

## PROACTIVE SURFACING
If you notice in the memory context that:
- The user was working on something that seems unfinished → ask about it naturally
- A topic in this conversation connects to a past episode → mention the connection
- The user repeatedly struggles with the same problem → proactively suggest a solution
- There's a relevant piece of knowledge from the graph → connect it to the current topic

Do this naturally and briefly — don't be intrusive, but be genuinely helpful.`);

    return sections.join('\n\n---\n\n');
  }

  private formatAge(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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
