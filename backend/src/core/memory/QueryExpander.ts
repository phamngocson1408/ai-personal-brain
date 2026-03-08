import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';

/**
 * QueryExpander — Sinh ra các biến thể ngữ nghĩa của query trước khi vector search.
 *
 * Vấn đề: Query "đồ cần thanh lý" có thể không khớp với memory "máy lọc nước cần bán"
 * vì vector similarity < 0.55, dù ý nghĩa tương đương với con người.
 *
 * Giải pháp: Dùng Claude Haiku để sinh 3 biến thể query (đồng nghĩa, paraphrase,
 * tiếng Anh), rồi search song song với tất cả variants và merge kết quả.
 *
 * Chi phí: ~$0.001 mỗi lần gọi (Haiku rất rẻ).
 * Latency: ~300-500ms thêm vào, chạy song song với các retrieval khác.
 */
export class QueryExpander {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  /**
   * Sinh tối đa 3 biến thể ngữ nghĩa của query gốc.
   * Luôn trả về mảng bắt đầu bằng query gốc.
   */
  async expand(query: string): Promise<string[]> {
    // Query ngắn hoặc đơn giản thì không cần expand
    if (query.trim().length < 10) {
      return [query];
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Tạo 3 cách diễn đạt khác nhau cho câu tìm kiếm sau, giữ nguyên ý nghĩa.
Trả về CHỈ một JSON array, không có giải thích.

Câu gốc: "${query}"

Yêu cầu:
- Dùng từ đồng nghĩa và cách diễn đạt khác
- Có thể mix tiếng Việt và tiếng Anh
- Mỗi biến thể ngắn gọn (dưới 20 từ)
- Không lặp lại câu gốc

Ví dụ output: ["biến thể 1", "biến thể 2", "biến thể 3"]`,
          },
        ],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return [query];

      const variants = parsed
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .slice(0, 3);

      return [query, ...variants];
    } catch {
      // Nếu Haiku fail hoặc parse lỗi, fallback về query gốc
      return [query];
    }
  }
}

export const queryExpander = new QueryExpander();
