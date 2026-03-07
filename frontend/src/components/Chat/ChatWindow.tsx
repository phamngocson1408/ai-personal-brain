import React, { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Brain, Sparkles, Menu } from 'lucide-react';

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  hasSession: boolean;
  onMenuClick?: () => void;
  isMobile?: boolean;
  isRecording?: boolean;
  isSpeaking?: boolean;
  voiceEnabled?: boolean;
  voiceSupported?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onToggleVoice?: () => void;
  onStopSpeaking?: () => void;
}

function EmptyState({ isMobile }: { isMobile?: boolean }) {
  const suggestions = [
    'What have I been working on lately?',
    'What are my main goals?',
    'Summarize my recent conversations',
    'What skills am I developing?',
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? 20 : 40, textAlign: 'center',
    }}>
      <div style={{
        width: isMobile ? 60 : 80,
        height: isMobile ? 60 : 80,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: isMobile ? 16 : 24,
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
      }}>
        <Brain size={isMobile ? 28 : 40} />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: isMobile ? 18 : 24, fontWeight: 700, color: '#e2e8f0' }}>
        Your Personal Brain
      </h2>
      <p style={{ margin: '0 0 24px', color: '#64748b', maxWidth: 400, lineHeight: 1.6, fontSize: isMobile ? 13 : 14 }}>
        I remember everything you tell me. Ask me anything — I'll search your memories,
        browse the web, and connect your ideas.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 8, maxWidth: 500, width: '100%',
      }}>
        {suggestions.map((s) => (
          <div
            key={s}
            style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 12, padding: '10px 14px',
              fontSize: 13, color: '#94a3b8', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <Sparkles size={12} style={{ marginRight: 6, opacity: 0.7 }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({ messages, isStreaming, onSend, onStop, hasSession, onMenuClick, isMobile, isRecording, isSpeaking, voiceEnabled, voiceSupported, onStartRecording, onStopRecording, onToggleVoice, onStopSpeaking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px',
        borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#0d1117',
      }}>
        {/* Hamburger menu on mobile */}
        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, display: 'flex',
              borderRadius: 6, flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <Brain size={isMobile ? 16 : 20} style={{ color: '#6366f1', flexShrink: 0 }} />
        <span style={{
          fontWeight: 600, fontSize: isMobile ? 13 : 15, color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          Personal Brain
        </span>
        {isStreaming && (
          <span style={{
            fontSize: 12, color: '#6366f1', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
              animation: 'pulse 1s infinite',
            }} />
            {!isMobile && 'Thinking...'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 12px' : '0 20px' }}>
        {messages.length === 0 ? (
          <EmptyState isMobile={isMobile} />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        disabled={!hasSession}
        isMobile={isMobile}
        isRecording={isRecording}
        isSpeaking={isSpeaking}
        voiceEnabled={voiceEnabled}
        voiceSupported={voiceSupported}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onToggleVoice={onToggleVoice}
        onStopSpeaking={onStopSpeaking}
      />

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          color: #e2e8f0; margin: 12px 0 6px;
        }
        .markdown-body blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 12px; margin-left: 0;
          color: #94a3b8;
        }
        .markdown-body table { border-collapse: collapse; width: 100%; font-size: 13px; }
        .markdown-body th, .markdown-body td {
          border: 1px solid #334155; padding: 8px 12px; text-align: left;
        }
        .markdown-body th { background: #1e293b; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  );
}
