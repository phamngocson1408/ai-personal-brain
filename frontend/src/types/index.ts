export interface Session {
  id: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error';
  content: string;
  toolName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface ToolCall {
  name: string;
  result?: string;
  status: 'pending' | 'complete' | 'error';
}

export interface MemoryStats {
  totalMessages: number;
  totalEmbeddings: number;
  totalTraits: number;
}

export interface ConceptualTrait {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  evidence: string[];
  last_updated: string;
}

export interface UserProfile {
  goals: ConceptualTrait[];
  beliefs: ConceptualTrait[];
  skills: ConceptualTrait[];
  preferences: ConceptualTrait[];
  plans: ConceptualTrait[];
  personality: ConceptualTrait[];
  values: ConceptualTrait[];
  habits: ConceptualTrait[];
}

export interface SemanticSearchResult {
  content: string;
  similarity: number;
  messageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
