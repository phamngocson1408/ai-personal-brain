import React from 'react';
import { Brain, X } from 'lucide-react';

interface Props {
  onToggleMemoryPanel: () => void;
  showMemoryPanel: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  onToggleMemoryPanel, showMemoryPanel,
  isMobile = false, isOpen = true, onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: '#0d1117',
      borderRight: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      ...(isMobile ? {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
      } : {}),
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>Personal Brain</div>
            <div style={{ fontSize: 10, color: '#475569' }}>Your digital memory</div>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', padding: 4, display: 'flex',
                borderRadius: 6,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Memory Panel Toggle */}
      <button
        onClick={onToggleMemoryPanel}
        style={{
          margin: '8px 12px',
          padding: '8px 12px',
          background: showMemoryPanel ? '#1e3a5f' : '#1e293b',
          border: `1px solid ${showMemoryPanel ? '#3b82f6' : '#334155'}`,
          borderRadius: 8, cursor: 'pointer',
          color: showMemoryPanel ? '#60a5fa' : '#94a3b8',
          fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.2s',
        }}
      >
        <Brain size={13} />
        Memory & Profile
      </button>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #1e293b',
        fontSize: 11, color: '#334155', textAlign: 'center',
      }}>
        Powered by Claude Opus 4.6 + pgvector
      </div>
    </div>
  );
}
