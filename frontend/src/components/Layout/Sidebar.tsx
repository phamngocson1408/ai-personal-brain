import React from 'react';
import { Session } from '../../types';
import { Plus, MessageSquare, Brain, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onToggleMemoryPanel: () => void;
  showMemoryPanel: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  sessions, currentSessionId, onSelectSession,
  onNewSession, onToggleMemoryPanel, showMemoryPanel,
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
      // On mobile: fixed overlay drawer
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
          marginBottom: 12,
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
          {/* Close button on mobile */}
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

        <button
          onClick={onNewSession}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            color: 'white', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Plus size={14} />
          New Conversation
        </button>
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

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#475569',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '8px 8px 4px',
        }}>
          Conversations
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: '#475569', fontSize: 12 }}>
            <MessageSquare size={20} style={{ marginBottom: 6, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No conversations yet</p>
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 10px',
                background: currentSessionId === session.id ? '#1e293b' : 'none',
                border: `1px solid ${currentSessionId === session.id ? '#334155' : 'transparent'}`,
                borderRadius: 8, cursor: 'pointer',
                marginBottom: 2, transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (currentSessionId !== session.id)
                  e.currentTarget.style.background = '#1a2332';
              }}
              onMouseLeave={(e) => {
                if (currentSessionId !== session.id)
                  e.currentTarget.style.background = 'none';
              }}
            >
              <div style={{
                fontSize: 13, color: '#e2e8f0', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 3,
              }}>
                {session.title || 'New Conversation'}
              </div>
              <div style={{
                fontSize: 10, color: '#475569',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Clock size={9} />
                {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
              </div>
            </button>
          ))
        )}
      </div>

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
