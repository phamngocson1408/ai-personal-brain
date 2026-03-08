import Anthropic from '@anthropic-ai/sdk';
import { conceptualMemoryService } from '../memory/ConceptualMemoryService';
import { userInstructionsService } from '../memory/UserInstructionsService';
import { ConceptualCategory } from '../../db/repositories/ConceptualRepository';
import { InstructionCategory } from '../../db/repositories/UserInstructionsRepository';
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
        model: 'claude-haiku-4-5-20251001', // haiku: cheaper, fast enough for classification
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

  /**
   * Detect và lưu explicit behavior instructions từ user message.
   * Chạy song song với extractFromConversation() — fire-and-forget.
   *
   * Trigger patterns:
   *   VI: "từ giờ hãy", "luôn luôn", "đừng bao giờ", "hãy nhớ luôn", "từ giờ trở đi"
   *   EN: "from now on", "always", "never", "please always", "don't ever"
   */
  async detectBehaviorInstructions(userMessage: string): Promise<void> {
    const lower = userMessage.toLowerCase().trim();

    // Nhanh: kiểm tra trigger keywords trước khi gọi API
    const triggers = [
      'từ giờ hãy', 'từ giờ trở đi', 'luôn luôn', 'hãy luôn', 'hãy nhớ luôn',
      'đừng bao giờ', 'không được', 'luôn nhớ', 'nhớ là luôn',
      'from now on', 'always ', 'never ', "don't ever", 'please always',
      'remember to always', 'make sure to always',
    ];

    const hasTrigger = triggers.some((t) => lower.includes(t));
    if (!hasTrigger || userMessage.length < 10) return;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Phân tích message này và trích xuất các chỉ dẫn hành vi mà user muốn AI assistant tuân thủ.
Chỉ trích xuất nếu user đang yêu cầu thay đổi hành vi lâu dài (không phải cho câu hỏi cụ thể này).

MESSAGE: "${userMessage}"

Trả về JSON:
{
  "instructions": [
    {
      "instruction": "mô tả ngắn gọn chỉ dẫn (dưới 100 ký tự)",
      "category": "tone|format|topic|general"
    }
  ]
}

- "tone": cách nói chuyện (formal, ngắn gọn, thân mật, ...)
- "format": định dạng trả lời (bullet points, không dùng emoji, ...)
- "topic": chủ đề ưu tiên/tránh né
- "general": các chỉ dẫn khác

Trả về array rỗng nếu không có chỉ dẫn hành vi lâu dài nào.`,
          },
        ],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';
      const result = JSON.parse(text);

      if (!Array.isArray(result.instructions)) return;

      for (const item of result.instructions) {
        if (
          typeof item.instruction === 'string' &&
          item.instruction.trim().length > 0 &&
          ['tone', 'format', 'topic', 'general'].includes(item.category)
        ) {
          await userInstructionsService.add(
            item.instruction.trim(),
            item.category as InstructionCategory,
            'learned'
          );
        }
      }
    } catch {
      // Non-critical: bỏ qua nếu lỗi
    }
  }
}

export const insightExtractor = new InsightExtractor();
