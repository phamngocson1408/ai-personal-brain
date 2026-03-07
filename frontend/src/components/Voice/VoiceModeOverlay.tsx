import React from 'react';
import { X } from 'lucide-react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Props {
  voiceState: VoiceState;
  lastUserText: string;
  assistantText: string;
  onExit: () => void;
  onOrbClick: () => void;
}

const STATE_CONFIG: Record<VoiceState, {
  label: string;
  orbBg: string;
  glow: string;
  anim: string;
  orbSize: number;
}> = {
  idle: {
    label: 'Tap to speak',
    orbBg: 'radial-gradient(circle at 38% 32%, #4338ca, #1e1b4b 70%)',
    glow: 'rgba(99,102,241,0.12)',
    anim: 'none',
    orbSize: 140,
  },
  listening: {
    label: 'Listening...',
    orbBg: 'radial-gradient(circle at 38% 32%, #ef4444, #7f1d1d 70%)',
    glow: 'rgba(239,68,68,0.35)',
    anim: 'voicePulse 1.4s ease-in-out infinite',
    orbSize: 160,
  },
  thinking: {
    label: 'Thinking...',
    orbBg: 'radial-gradient(circle at 38% 32%, #6366f1, #312e81 70%)',
    glow: 'rgba(99,102,241,0.25)',
    anim: 'voiceSpin 3s linear infinite',
    orbSize: 150,
  },
  speaking: {
    label: 'Speaking  —  tap to interrupt',
    orbBg: 'radial-gradient(circle at 38% 32%, #8b5cf6, #4c1d95 70%)',
    glow: 'rgba(139,92,246,0.4)',
    anim: 'voiceBreathe 0.85s ease-in-out infinite alternate',
    orbSize: 160,
  },
};

export function VoiceModeOverlay({ voiceState, lastUserText, assistantText, onExit, onOrbClick }: Props) {
  const cfg = STATE_CONFIG[voiceState];
  const canClick = voiceState === 'speaking' || voiceState === 'idle';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'radial-gradient(ellipse at 50% 35%, #0e1420 0%, #060810 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, padding: '24px 20px',
    }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute', top: 24, right: 24,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '50%', width: 44, height: 44,
          cursor: 'pointer', color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#334155'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; }}
      >
        <X size={20} />
      </button>

      {/* User transcript */}
      <div style={{
        minHeight: 28,
        maxWidth: 480, textAlign: 'center',
        fontSize: 15, color: '#475569',
        fontStyle: 'italic', lineHeight: 1.5,
        opacity: lastUserText ? 1 : 0,
        transition: 'opacity 0.4s',
      }}>
        {lastUserText ? `"${lastUserText}"` : ''}
      </div>

      {/* Animated orb */}
      <div
        onClick={canClick ? onOrbClick : undefined}
        style={{
          width: cfg.orbSize, height: cfg.orbSize,
          borderRadius: '50%',
          background: cfg.orbBg,
          boxShadow: `0 0 50px ${cfg.glow}, 0 0 100px ${cfg.glow}, inset 0 0 40px rgba(255,255,255,0.06)`,
          cursor: canClick ? 'pointer' : 'default',
          animation: cfg.anim,
          transition: 'width 0.4s ease, height 0.4s ease, background 0.5s ease, box-shadow 0.5s ease',
          flexShrink: 0,
        }}
      />

      {/* State label */}
      <div style={{
        fontSize: 13, color: '#475569',
        fontWeight: 500, letterSpacing: '0.04em',
        transition: 'color 0.3s',
      }}>
        {cfg.label}
      </div>

      {/* Assistant text */}
      <div style={{
        maxWidth: 520, textAlign: 'center',
        fontSize: 16, color: '#e2e8f0', lineHeight: 1.75,
        padding: assistantText ? '16px 24px' : '0',
        background: assistantText ? '#1a2333' : 'transparent',
        borderRadius: 16,
        border: assistantText ? '1px solid #1e3a5f' : 'none',
        maxHeight: 220, overflowY: 'auto',
        opacity: assistantText ? 1 : 0,
        transition: 'opacity 0.4s',
        minHeight: assistantText ? undefined : 0,
      }}>
        {assistantText}
      </div>

      <style>{`
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes voiceBreathe {
          from { transform: scale(0.91); }
          to   { transform: scale(1.09); }
        }
        @keyframes voiceSpin {
          0%   { filter: hue-rotate(0deg)  brightness(1);   }
          50%  { filter: hue-rotate(25deg) brightness(1.25); }
          100% { filter: hue-rotate(0deg)  brightness(1);   }
        }
      `}</style>
    </div>
  );
}
