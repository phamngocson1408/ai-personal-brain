import Anthropic from '@anthropic-ai/sdk';
import { conceptualMemoryService } from '../memory/ConceptualMemoryService';
import { ConceptualCategory } from '../../db/repositories/ConceptualRepository';
import { config } from '../../config';

interface ExtractedInsight {
  category: ConceptualCategory;
  key: string;
  value: string;
  confidence: number;
  evidence: string;
}

interface InsightExtractionResult {
  insights: ExtractedInsight[];
}

export class InsightExtractor {
  private claude: Anthropic;

  constructor() {
    this.claude = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async extractFromConversation(
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    // Only extract insights from user messages (what they say reveals who they are)
    if (userMessage.length < 30) return;

    try {
      const response = await this.claude.messages.create({
        model: config.anthropic.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze this message and extract personal traits, goals, beliefs, and preferences.

USER MESSAGE: "${userMessage}"
CONTEXT (assistant response): "${assistantResponse.slice(0, 500)}"

Extract ONLY what is clearly evident. Return JSON:
{
  "insights": [
    {
      "category": "goal|belief|skill|preference|plan|personality|value|habit",
      "key": "short descriptive key",
      "value": "what was revealed",
      "confidence": 0.0-1.0,
      "evidence": "exact quote or paraphrase"
    }
  ]
}

Rules:
- Return empty array if nothing clear is revealed
- confidence should be 0.9+ only for explicit statements
- Be specific, not generic
- Max 3 insights per message`,
          },
        ],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      key: { type: 'string' },
                      value: { type: 'string' },
                      confidence: { type: 'number' },
                      evidence: { type: 'string' },
                    },
                    required: ['category', 'key', 'value', 'confidence', 'evidence'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['insights'],
              additionalProperties: false,
            },
          },
        },
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';
      const result: InsightExtractionResult = JSON.parse(text);

      for (const insight of result.insights) {
        if (this.isValidCategory(insight.category)) {
          await conceptualMemoryService.update(
            insight.category,
            insight.key,
            insight.value,
            insight.confidence,
            [insight.evidence]
          );
        }
      }
    } catch (err) {
      // Non-critical: log and continue
      console.warn('Insight extraction failed:', err);
    }
  }

  private isValidCategory(cat: string): cat is ConceptualCategory {
    return [
      'goal', 'belief', 'skill', 'preference', 'plan',
      'personality', 'value', 'habit', 'relationship',
    ].includes(cat);
  }
}

export const insightExtractor = new InsightExtractor();
