import React, { useState, useRef, useCallback } from 'react';
import { Send, Square, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
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

export function ChatInput({
  onSend, onStop, isStreaming, disabled, isMobile,
  isRecording, isSpeaking, voiceEnabled, voiceSupported,
  onStartRecording, onStopRecording, onToggleVoice, onStopSpeaking,
}: Props) {
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
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const btnSize = isMobile ? 40 : 36;

  return (
    <div style={{ padding: isMobile ? '10px 12px' : '16px 20px', borderTop: '1px solid #1e293b', background: '#0f1117' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: '#1e293b',
        border: `1px solid ${isRecording ? '#ef4444' : '#334155'}`,
        borderRadius: 16,
        padding: isMobile ? '6px 6px 6px 12px' : '8px 8px 8px 16px',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening...' : isMobile ? 'Ask anything...' : 'Ask your brain anything... (Shift+Enter for new line)'}
          disabled={disabled || isRecording}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: isRecording ? '#94a3b8' : '#e2e8f0',
            fontSize: isMobile ? 16 : 14, lineHeight: 1.6,
            resize: 'none', fontFamily: 'inherit',
            maxHeight: 160, overflowY: 'auto',
            paddingTop: 6, paddingBottom: 6,
          }}
        />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Voice output toggle */}
          {voiceSupported && onToggleVoice && (
            <button
              onClick={isSpeaking ? onStopSpeaking : onToggleVoice}
              title={isSpeaking ? 'Stop speaking' : voiceEnabled ? 'Disable voice reply' : 'Enable voice reply'}
              style={{
                width: btnSize, height: btnSize, borderRadius: '50%',
                background: isSpeaking ? '#8b5cf6' : voiceEnabled ? '#1e3a5f' : 'transparent',
                border: `1px solid ${isSpeaking || voiceEnabled ? '#6366f1' : '#334155'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isSpeaking || voiceEnabled ? '#6366f1' : '#64748b',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {isSpeaking ? <VolumeX size={16} /> : voiceEnabled ? <Volume2 size={16} /> : <Volume2 size={16} />}
            </button>
          )}

          {/* Microphone button */}
          {voiceSupported && (onStartRecording || onStopRecording) && (
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={disabled || isStreaming}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              style={{
                width: btnSize, height: btnSize, borderRadius: '50%',
                background: isRecording
                  ? 'radial-gradient(circle, #ef4444, #dc2626)'
                  : 'transparent',
                border: `1px solid ${isRecording ? '#ef4444' : '#334155'}`,
                cursor: disabled || isStreaming ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isRecording ? 'white' : '#64748b',
                transition: 'all 0.2s', flexShrink: 0,
                animation: isRecording ? 'pulse 1s infinite' : 'none',
                opacity: disabled || isStreaming ? 0.4 : 1,
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              title="Stop generation"
              style={{
                width: btnSize, height: btnSize, borderRadius: '50%',
                background: '#ef4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', transition: 'transform 0.1s', flexShrink: 0,
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
                width: btnSize, height: btnSize, borderRadius: '50%',
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
          Enter to send · Shift+Enter for new line
          {voiceEnabled && ' · Voice reply on'}
          {isSpeaking && ' · Speaking...'}
        </div>
      )}
    </div>
  );
}
