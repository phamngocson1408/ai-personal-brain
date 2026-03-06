import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { ChatWindow } from './components/Chat/ChatWindow';
import { MemoryPanel } from './components/Memory/MemoryPanel';
import { useChat } from './hooks/useChat';
import { useMobile } from './hooks/useMobile';
import { useVoice } from './hooks/useVoice';
import { Session } from './types';
import { createSession, listSessions, getSessionMessages } from './services/api';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  const {
    isRecording, isSpeaking, voiceEnabled, isSupported: voiceSupported,
    startRecording, stopRecording, speak, stopSpeaking, toggleVoice,
  } = useVoice((transcript) => {
    // When voice transcript is ready, send it as a message
    sendMessage(transcript);
  });

  const { messages, isStreaming, sendMessage, stopStreaming, loadMessages, clearMessages } =
    useChat(currentSession?.id ?? null, speak);

  // Load sessions on mount
  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(console.error);
  }, []);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setCurrentSession(session);
      clearMessages();
      if (isMobile) setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, [clearMessages, isMobile]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;

      setCurrentSession(session);
      clearMessages();
      if (isMobile) setSidebarOpen(false);

      try {
        const msgs = await getSessionMessages(id);
        loadMessages(
          msgs
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              created_at: m.created_at,
            }))
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    },
    [sessions, clearMessages, loadMessages, isMobile]
  );

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      handleNewSession();
    } else if (!currentSession && sessions.length > 0) {
      handleSelectSession(sessions[0].id);
    }
  }, [sessions.length]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#0f1117',
    }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSession?.id ?? null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onToggleMemoryPanel={() => setShowMemoryPanel((v) => !v)}
        showMemoryPanel={showMemoryPanel}
        isMobile={isMobile}
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
          sessionTitle={currentSession?.title ?? null}
          hasSession={!!currentSession}
          onMenuClick={() => setSidebarOpen(true)}
          isMobile={isMobile}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          voiceEnabled={voiceEnabled}
          voiceSupported={voiceSupported}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onToggleVoice={toggleVoice}
          onStopSpeaking={stopSpeaking}
        />

        {/* Memory Panel (slide-in) */}
        {showMemoryPanel && (
          <div style={{
            width: isMobile ? '100%' : 340,
            flexShrink: 0,
            borderLeft: '1px solid #1e293b',
            background: '#0d1117',
            display: 'flex', flexDirection: 'column',
            height: '100%',
            position: isMobile ? 'fixed' : 'relative',
            right: isMobile ? 0 : 'auto',
            top: isMobile ? 0 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            zIndex: isMobile ? 50 : 'auto',
            animation: 'slideIn 0.2s ease-out',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #1e293b',
              fontWeight: 600, fontSize: 13, color: '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Memory & Profile</span>
              {isMobile && (
                <button
                  onClick={() => setShowMemoryPanel(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: 20, lineHeight: 1, padding: 0,
                  }}
                >
                  &times;
                </button>
              )}
            </div>
            <MemoryPanel />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
