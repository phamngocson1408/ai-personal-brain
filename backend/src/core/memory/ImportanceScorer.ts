/**
 * ImportanceScorer — Heuristic scoring to decide if a message is worth embedding.
 *
 * Problem: Embedding every message (including "ok", "thanks", "ừ") pollutes the
 * vector store and degrades retrieval quality. This scorer filters them out cheaply
 * without any API call.
 *
 * Score range: 0.0 (useless) → 1.0 (very valuable)
 * Threshold for embedding: 0.25
 */
export class ImportanceScorer {

  private readonly LOW_VALUE_PATTERNS = [
    // Very short filler responses
    /^(ok|okay|oke|sure|yes|no|yeah|yep|nope|got it|i see|ic|hmm|hm)[\s.!,]*$/i,
    /^(cảm ơn|thanks|thank you|thx|ty|tks|ok bạn|ừ|được|vâng|đúng|uh|uhh)[\s.!,]*$/i,
    /^(bye|goodbye|see you|tạm biệt|ok done|done|alright|noted)[\s.!,]*$/i,
    // Pure emoji or punctuation
    /^[\s\p{Emoji}!?.,:;]+$/u,
    // Extremely short
    /^.{1,15}$/,
  ];

  private readonly HIGH_VALUE_PHRASES = [
    // Vietnamese — personal statements
    'tôi muốn', 'tôi cần', 'tôi đang làm', 'tôi đang học', 'tôi đang gặp',
    'tôi quyết định', 'tôi phát hiện', 'tôi nhận ra', 'tôi hiểu',
    'mục tiêu', 'kế hoạch', 'dự án', 'vấn đề', 'giải pháp', 'ý tưởng',
    'tôi thích', 'tôi ghét', 'tôi lo', 'tôi nghĩ', 'quan trọng',
    // English — personal statements
    'i want to', 'i need to', 'i decided', 'i realized', 'i learned',
    'i am working on', 'i am building', 'i am trying',
    'goal', 'project', 'problem', 'solution', 'idea', 'plan',
    'important', 'critical', 'worried', 'excited', 'frustrated',
    'figured out', 'discovered', 'understand now',
  ];

  score(content: string): number {
    const trimmed = content.trim();

    // Immediate reject for low-value patterns
    for (const pattern of this.LOW_VALUE_PATTERNS) {
      if (pattern.test(trimmed)) return 0;
    }

    let score = 0.1; // baseline
    const lower = trimmed.toLowerCase();

    // Length score — longer messages tend to carry more information
    if (trimmed.length > 300) score += 0.35;
    else if (trimmed.length > 150) score += 0.25;
    else if (trimmed.length > 80) score += 0.15;
    else if (trimmed.length > 40) score += 0.08;

    // High-value phrase bonus (first match only to avoid gaming)
    for (const phrase of this.HIGH_VALUE_PHRASES) {
      if (lower.includes(phrase)) {
        score += 0.25;
        break;
      }
    }

    // Questions are worth remembering — they show what user cares about
    const questionCount = (trimmed.match(/\?/g) || []).length;
    score += Math.min(questionCount * 0.08, 0.15);

    // Exclamation often signals emotion or importance
    if (trimmed.includes('!')) score += 0.05;

    // Numbers, dates, URLs often signal concrete information
    if (/\d{4}|\d+%|\d+\s*(usd|vnd|$)|\bhttps?:\/\//i.test(trimmed)) score += 0.1;

    // Code blocks or technical content
    if (/```|`[^`]+`|function|class |const |import /.test(trimmed)) score += 0.15;

    return Math.min(score, 1.0);
  }

  isWorthEmbedding(content: string, threshold = 0.25): boolean {
    return this.score(content) >= threshold;
  }

  /**
   * Score emotional intensity (0.0–1.0) using heuristic patterns.
   * High-emotion memories are boosted in retrieval — they're more memorable.
   */
  emotionalWeight(content: string): number {
    const lower = content.toLowerCase();
    let weight = 0;

    const highEmotionPhrases = [
      // Vietnamese
      'tuyệt vời', 'xuất sắc', 'tệ quá', 'khó quá', 'lo lắng', 'vui', 'buồn',
      'tức', 'thất vọng', 'hào hứng', 'bất ngờ', 'phấn khởi', 'sợ', 'căng thẳng',
      'không thể tin', 'cuối cùng', 'xong rồi', 'đã làm được',
      // English
      'amazing', 'terrible', 'frustrated', 'excited', 'worried', 'anxious',
      'thrilled', 'disappointed', 'proud', 'finally', 'breakthrough', 'failed',
      'succeeded', 'gave up', 'cant believe', "can't believe", 'incredible',
      'love', 'hate', 'awful', 'perfect', 'worst', 'best',
    ];

    for (const phrase of highEmotionPhrases) {
      if (lower.includes(phrase)) { weight += 0.2; break; }
    }

    // Exclamation marks amplify emotion
    const exclamations = (content.match(/!/g) || []).length;
    weight += Math.min(exclamations * 0.1, 0.2);

    // ALL CAPS words signal strong emotion
    const capsWords = (content.match(/\b[A-Z]{3,}\b/g) || []).length;
    weight += Math.min(capsWords * 0.1, 0.2);

    return Math.min(weight, 1.0);
  }
}

export const importanceScorer = new ImportanceScorer();
