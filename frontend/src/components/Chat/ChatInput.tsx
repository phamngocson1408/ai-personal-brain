import React, { useState, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  isMobile?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled, isMobile }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // On mobile, Enter should add newline not send (use button instead)
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div style={{
      padding: isMobile ? '10px 12px' : '16px 20px',
      borderTop: '1px solid #1e293b',
      background: '#0f1117',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 16,
        padding: isMobile ? '6px 6px 6px 12px' : '8px 8px 8px 16px',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? 'Ask anything...' : 'Ask your brain anything... (Shift+Enter for new line)'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: isMobile ? 16 : 14, lineHeight: 1.6,
            resize: 'none', fontFamily: 'inherit',
            maxHeight: 160, overflowY: 'auto',
            paddingTop: 6, paddingBottom: 6,
          }}
        />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isStreaming ? (
            <button
              onClick={onStop}
              title="Stop generation"
              style={{
                width: isMobile ? 40 : 36,
                height: isMobile ? 40 : 36,
                borderRadius: '50%',
                background: '#ef4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', transition: 'transform 0.1s',
                flexShrink: 0,
              }}
            >
              <Square size={16} fill="white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              title={isMobile ? 'Send' : 'Send message (Enter)'}
              style={{
                width: isMobile ? 40 : 36,
                height: isMobile ? 40 : 36,
                borderRadius: '50%',
                background: input.trim() && !disabled
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : '#334155',
                border: 'none',
                cursor: input.trim() && !disabled ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', transition: 'all 0.2s',
                opacity: input.trim() && !disabled ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      {!isMobile && (
        <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 8 }}>
          Enter to send · Shift+Enter for new line · Your conversations are remembered
        </div>
      )}
    </div>
  );
}
