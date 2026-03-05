import React, { useState, useEffect } from 'react';
import { UserProfile, MemoryStats, SemanticSearchResult } from '../../types';
import { getUserProfile, getMemoryStats, searchMemory } from '../../services/api';
import { Brain, Target, Lightbulb, Zap, Heart, BookOpen, Search, TrendingUp } from 'lucide-react';

const CATEGORY_CONFIG = {
  goals: { icon: Target, label: 'Goals', color: '#f59e0b' },
  beliefs: { icon: Lightbulb, label: 'Beliefs', color: '#10b981' },
  skills: { icon: Zap, label: 'Skills', color: '#6366f1' },
  preferences: { icon: Heart, label: 'Preferences', color: '#ec4899' },
  plans: { icon: TrendingUp, label: 'Plans', color: '#3b82f6' },
  personality: { icon: Brain, label: 'Personality', color: '#8b5cf6' },
  values: { icon: BookOpen, label: 'Values', color: '#14b8a6' },
  habits: { icon: BookOpen, label: 'Habits', color: '#f97316' },
};

type CategoryKey = keyof typeof CATEGORY_CONFIG;

export function MemoryPanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'search'>('profile');

  useEffect(() => {
    getUserProfile().then(setProfile).catch(console.error);
    getMemoryStats().then(setStats).catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMemory(searchQuery, 8);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8, padding: '12px 16px', borderBottom: '1px solid #1e293b',
        }}>
          {[
            { label: 'Messages', value: stats.totalMessages },
            { label: 'Memories', value: stats.totalEmbeddings },
            { label: 'Traits', value: stats.totalTraits },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: '#1e293b', borderRadius: 8, padding: '8px 10px',
              textAlign: 'center', border: '1px solid #334155',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>
                {value.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
        {(['profile', 'search'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 12, fontWeight: 600,
              color: activeTab === tab ? '#6366f1' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
              textTransform: 'capitalize', transition: 'all 0.2s',
            }}
          >
            {tab === 'profile' ? '👤 Profile' : '🔍 Search'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeTab === 'profile' && profile && (
          <div>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
              const items = profile[key as CategoryKey] || [];
              if (items.length === 0) return null;
              const Icon = cfg.icon;
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: 6, fontSize: 11, fontWeight: 700,
                    color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <Icon size={12} />
                    {cfg.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.slice(0, 5).map((item) => (
                      <div key={item.id} style={{
                        background: '#1e293b', borderRadius: 8, padding: '8px 10px',
                        border: `1px solid ${cfg.color}22`,
                        fontSize: 12,
                      }}>
                        <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>
                          {item.key}
                        </div>
                        <div style={{ color: '#94a3b8', lineHeight: 1.4 }}>
                          {item.value}
                        </div>
                        <div style={{
                          marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <div style={{
                            height: 3, flex: 1, background: '#0f172a', borderRadius: 2,
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              width: `${item.confidence * 100}%`,
                              background: cfg.color,
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#475569' }}>
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.values(profile).every((v) => v.length === 0) && (
              <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: 24 }}>
                <Brain size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p>No traits learned yet.<br />Start chatting to build your profile!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search your memories..."
                style={{
                  flex: 1, background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0',
                  fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                style={{
                  padding: '8px 14px', background: '#6366f1', border: 'none',
                  borderRadius: 8, color: 'white', cursor: 'pointer',
                  fontSize: 13, opacity: isSearching ? 0.7 : 1,
                }}
              >
                {isSearching ? '...' : <Search size={14} />}
              </button>
            </div>

            {searchResults.map((result, i) => (
              <div key={i} style={{
                background: '#1e293b', borderRadius: 8, padding: '10px 12px',
                border: '1px solid #334155', marginBottom: 8, fontSize: 12,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <span style={{ color: '#475569' }}>Memory {i + 1}</span>
                  <span style={{ color: '#6366f1', fontWeight: 600 }}>
                    {(result.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.5 }}>
                  {result.content.slice(0, 200)}{result.content.length > 200 ? '...' : ''}
                </p>
              </div>
            ))}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: 24 }}>
                No memories found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
