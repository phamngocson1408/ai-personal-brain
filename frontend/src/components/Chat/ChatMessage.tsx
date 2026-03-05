import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType, ToolCall } from '../../types';
import { Brain, User, Search, Globe, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  message: ChatMessageType;
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
  const icons: Record<string, React.ReactNode> = {
    web_search: <Search size={12} />,
    fetch_url: <Globe size={12} />,
    ingest_document: <FileText size={12} />,
  };

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#a5b4fc',
      marginBottom: 8,
    }}>
      {toolCall.status === 'pending' ? (
        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
      ) : toolCall.status === 'complete' ? (
        <CheckCircle size={12} style={{ color: '#34d399' }} />
      ) : (
        <XCircle size={12} style={{ color: '#f87171' }} />
      )}
      {icons[toolCall.name] || <Search size={12} />}
      <span>{toolCall.name.replace(/_/g, ' ')}</span>
      {toolCall.result && (
        <span style={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          — {toolCall.result}
        </span>
      )}
    </div>
  );
}

export function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '16px 0',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser ? '#3b82f6' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {isUser ? <User size={18} /> : <Brain size={18} />}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '75%', minWidth: 0 }}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div style={{
          background: isUser ? '#1e40af' : '#1e293b',
          border: `1px solid ${isUser ? '#2563eb' : '#334155'}`,
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '12px 16px',
          lineHeight: 1.6,
          fontSize: 14,
          color: '#e2e8f0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}>
          {isUser ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </p>
          ) : (
            <div className="markdown-body" style={{ minHeight: message.isStreaming ? 20 : 'auto' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return (
                      <code
                        className={className}
                        style={{
                          background: '#0f172a',
                          borderRadius: 4,
                          padding: match ? '12px' : '2px 5px',
                          display: match ? 'block' : 'inline',
                          fontSize: 13,
                          fontFamily: 'Consolas, Monaco, monospace',
                          overflowX: 'auto',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return (
                      <pre style={{
                        background: '#0f172a', borderRadius: 8,
                        padding: 16, overflow: 'auto', marginTop: 8,
                        border: '1px solid #1e293b',
                      }}>
                        {children}
                      </pre>
                    );
                  },
                  p({ children }) {
                    return <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{children}</p>;
                  },
                }}
              >
                {message.content || (message.isStreaming ? '▊' : '')}
              </ReactMarkdown>
              {message.isStreaming && message.content && (
                <span style={{
                  display: 'inline-block', width: 8, height: 16,
                  background: '#6366f1', borderRadius: 2,
                  animation: 'blink 1s step-end infinite',
                }} />
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div style={{
          fontSize: 11, color: '#475569', marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
        }}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
