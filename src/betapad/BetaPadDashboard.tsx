import { useState, useMemo } from 'react'
import type {
  BetaPadStore, BetaPadEntry, QuickNote, BugReport,
  FeatureRequest, EntryStatus, EntryType, Tag, Priority,
} from './types'
import { loadStore, formatDuration, downloadText, downloadJson } from './utils'
import {
  exportMarkdown, exportClaudePrompt, exportSelectedAsClaudePrompt,
} from './exports'

// ═══════════════════════════════════════════════════════
//  Review Dashboard — /admin/betapad
// ═══════════════════════════════════════════════════════

const STATUSES: { value: EntryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont-fix', label: "Won't Fix" },
]

export default function BetaPadDashboard() {
  const [store, setStore] = useState<BetaPadStore>(loadStore)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<EntryType | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterTag] = useState<Tag | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<EntryStatus | 'all'>('all')
  const [searchText, setSearchText] = useState('')

  const sessions = Object.values(store.sessions).sort(
    (a, b) => new Date(b.started).getTime() - new Date(a.started).getTime()
  )
  const selectedSession = selectedSessionId ? store.sessions[selectedSessionId] : null

  // All entries across all sessions
  const allEntries = useMemo(() => {
    return sessions.flatMap(s => s.entries)
  }, [sessions])

  // Stats
  const stats = useMemo(() => {
    const pageCount: Record<string, number> = {}
    const tagCount: Record<string, number> = {}
    const severityCount: Record<string, number> = {}

    for (const entry of allEntries) {
      pageCount[entry.route] = (pageCount[entry.route] || 0) + 1
      for (const tag of entry.tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      }
      if (entry.entry_type === 'bug') {
        const sev = (entry as BugReport).severity
        severityCount[sev] = (severityCount[sev] || 0) + 1
      }
    }

    const topPages = Object.entries(pageCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    const topTags = Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)

    return { pageCount, tagCount, severityCount, topPages, topTags }
  }, [allEntries])

  // Cross-session recurring issues
  const recurringPages = useMemo(() => {
    const pageSessionMap: Record<string, Set<string>> = {}
    for (const session of sessions) {
      for (const entry of session.entries) {
        if (!pageSessionMap[entry.route]) pageSessionMap[entry.route] = new Set()
        pageSessionMap[entry.route].add(session.session_id)
      }
    }
    return Object.entries(pageSessionMap)
      .filter(([, sessions]) => sessions.size > 1)
      .sort(([, a], [, b]) => b.size - a.size)
      .map(([page, sessions]) => ({ page, sessionCount: sessions.size }))
  }, [sessions])

  // Filter entries
  const filterEntries = (entries: BetaPadEntry[]) => {
    return entries.filter(e => {
      if (filterType !== 'all' && e.entry_type !== filterType) return false
      if (filterPriority !== 'all' && e.priority !== filterPriority) return false
      if (filterTag !== 'all' && !e.tags.includes(filterTag)) return false
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      if (searchText) {
        const s = searchText.toLowerCase()
        const text = getEntryText(e)
        if (!text.toLowerCase().includes(s) && !e.route.toLowerCase().includes(s)) return false
      }
      return true
    })
  }

  const updateEntryStatus = (entryId: string, sessionId: string, status: EntryStatus) => {
    setStore(prev => {
      const sessions = { ...prev.sessions }
      const sess = sessions[sessionId]
      if (!sess) return prev
      const entries = sess.entries.map(e =>
        e.entry_id === entryId ? { ...e, status } as BetaPadEntry : e
      )
      sessions[sessionId] = { ...sess, entries }
      const next = { ...prev, sessions }
      localStorage.setItem('betapad_store', JSON.stringify(next))
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkAction = (action: string) => {
    if (selectedEntryIds.size === 0) return
    const selectedEntries = allEntries.filter(e => selectedEntryIds.has(e.entry_id))

    switch (action) {
      case 'claude-prompt': {
        const prompt = exportSelectedAsClaudePrompt(selectedEntries)
        navigator.clipboard.writeText(prompt)
        break
      }
      case 'resolved':
      case 'wont-fix':
        setStore(prev => {
          const sessions = { ...prev.sessions }
          for (const sid of Object.keys(sessions)) {
            const sess = sessions[sid]
            sessions[sid] = {
              ...sess,
              entries: sess.entries.map(e =>
                selectedEntryIds.has(e.entry_id) ? { ...e, status: action as EntryStatus } as BetaPadEntry : e
              ),
            }
          }
          const next = { ...prev, sessions }
          localStorage.setItem('betapad_store', JSON.stringify(next))
          return next
        })
        setSelectedEntryIds(new Set())
        break
      case 'export-md': {
        if (selectedSession) downloadText(exportMarkdown(selectedSession), `betapad-selected.md`)
        break
      }
    }
  }

  // ─── Render ───

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e4e4e7',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: '24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>BetaPad Review</h1>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: '4px 0 0' }}>
              {sessions.length} sessions · {allEntries.length} total entries
            </p>
          </div>
          <button
            onClick={() => setStore(loadStore())}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(80,80,100,0.3)',
              background: 'rgba(30,30,40,0.85)', color: '#e4e4e7', cursor: 'pointer', fontSize: 13,
            }}
          >
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Entries" value={allEntries.length} color="#6366f1" />
          <StatCard label="Bugs" value={allEntries.filter(e => e.entry_type === 'bug').length} color="#ef4444" />
          <StatCard label="Features" value={allEntries.filter(e => e.entry_type === 'feature').length} color="#818cf8" />
          <StatCard label="Open Issues" value={allEntries.filter(e => e.status === 'new' || e.status === 'reviewing').length} color="#f59e0b" />
          <StatCard label="Resolved" value={allEntries.filter(e => e.status === 'resolved').length} color="#22c55e" />
        </div>

        {/* Top Pages Heatmap */}
        {stats.topPages.length > 0 && (
          <div style={{
            background: 'rgba(30,30,40,0.85)',
            border: '1px solid rgba(80,80,100,0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Most Reported Pages</h3>
            {stats.topPages.map(([page, count]) => {
              const maxCount = stats.topPages[0][1]
              const pct = (count / maxCount) * 100
              return (
                <div key={page} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ color: '#818cf8' }}>{page}</span>
                    <span style={{ color: '#9ca3af' }}>{count} entries</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(80,80,100,0.2)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Cross-Session Recurring Issues */}
        {recurringPages.length > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>
              Recurring Issues (flagged across multiple sessions)
            </h3>
            {recurringPages.map(({ page, sessionCount }) => (
              <div key={page} style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#fbbf24' }}>{page}</span>
                <span style={{ color: '#9ca3af' }}> — flagged in {sessionCount} sessions</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags Distribution */}
        {stats.topTags.length > 0 && (
          <div style={{
            background: 'rgba(30,30,40,0.85)',
            border: '1px solid rgba(80,80,100,0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Issues by Tag</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stats.topTags.map(([tag, count]) => (
                <span key={tag} style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  fontSize: 12,
                  color: '#818cf8',
                }}>
                  {tag} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} style={selectStyle}>
            <option value="all">All Types</option>
            <option value="note">Notes</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)} style={selectStyle}>
            <option value="all">All Priorities</option>
            <option value="P0">P0-Critical</option>
            <option value="P1">P1-High</option>
            <option value="P2">P2-Medium</option>
            <option value="P3">P3-Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} style={selectStyle}>
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              ...selectStyle,
              flex: 1, minWidth: 150,
            }}
          />
        </div>

        {/* Bulk Actions */}
        {selectedEntryIds.size > 0 && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16, padding: '8px 12px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 12 }}>{selectedEntryIds.size} selected</span>
            <button onClick={() => handleBulkAction('claude-prompt')} style={btnStyle}>Copy as Claude Prompt</button>
            <button onClick={() => handleBulkAction('resolved')} style={btnStyle}>Mark Resolved</button>
            <button onClick={() => handleBulkAction('wont-fix')} style={btnStyle}>Won't Fix</button>
            <button onClick={() => setSelectedEntryIds(new Set())} style={{ ...btnStyle, color: '#9ca3af' }}>Clear</button>
          </div>
        )}

        {/* Sessions List */}
        {!selectedSession ? (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Sessions</h2>
            {sessions.map(sess => (
              <div
                key={sess.session_id}
                onClick={() => setSelectedSessionId(sess.session_id)}
                style={{
                  background: 'rgba(30,30,40,0.85)',
                  border: '1px solid rgba(80,80,100,0.3)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(80,80,100,0.3)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(sess.started).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
                      {formatDuration(sess.total_time)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ color: '#4ade80' }}>{sess.entries.filter(e => e.entry_type === 'note').length} notes</span>
                    <span style={{ color: '#f87171' }}>{sess.entries.filter(e => e.entry_type === 'bug').length} bugs</span>
                    <span style={{ color: '#818cf8' }}>{sess.entries.filter(e => e.entry_type === 'feature').length} features</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {sess.total_pages_visited} pages · {sess.device} · {sess.entries.length} entries
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                No BetaPad sessions yet. Open the overlay (Ctrl+Shift+B) and start capturing!
              </div>
            )}
          </div>
        ) : (
          /* Session Detail View */
          <div>
            <button onClick={() => { setSelectedSessionId(null); setSelectedEntryIds(new Set()) }} style={{ ...btnStyle, marginBottom: 16 }}>
              ← Back to Sessions
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                Session: {new Date(selectedSession.started).toLocaleDateString()}
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => {
                  const prompt = exportClaudePrompt(selectedSession)
                  navigator.clipboard.writeText(prompt)
                }} style={btnStyle}>Copy Claude Prompt</button>
                <button onClick={() => {
                  const date = new Date(selectedSession.started).toISOString().slice(0, 10)
                  downloadText(exportMarkdown(selectedSession), `betapad-${date}.md`)
                }} style={btnStyle}>Export Markdown</button>
                <button onClick={() => {
                  downloadJson(selectedSession, `betapad-${selectedSession.session_id.slice(0, 8)}.json`)
                }} style={btnStyle}>Export JSON</button>
              </div>
            </div>

            {/* Session entries */}
            {filterEntries(selectedSession.entries).map(entry => {
              const isSelected = selectedEntryIds.has(entry.entry_id)
              return (
                <div key={entry.entry_id} style={{
                  background: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(30,30,40,0.85)',
                  border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(80,80,100,0.3)'}`,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(entry.entry_id)}
                      style={{ accentColor: '#6366f1' }}
                    />
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                      background: entry.entry_type === 'bug' ? 'rgba(239,68,68,0.2)' : entry.entry_type === 'feature' ? 'rgba(99,102,241,0.2)' : 'rgba(34,197,94,0.2)',
                      color: entry.entry_type === 'bug' ? '#f87171' : entry.entry_type === 'feature' ? '#818cf8' : '#4ade80',
                    }}>{entry.entry_type}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: getPriorityColor(entry.priority) }}>{entry.priority}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{getEntryText(entry)}</span>
                    <select
                      value={entry.status}
                      onChange={(e) => updateEntryStatus(entry.entry_id, selectedSession.session_id, e.target.value as EntryStatus)}
                      style={{ ...selectStyle, width: 'auto', fontSize: 11, padding: '2px 8px' }}
                    >
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {entry.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: 'rgba(80,80,100,0.3)', color: '#9ca3af',
                      }}>{t}</span>
                    ))}
                    <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>
                      {entry.route} · {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {/* Bug-specific details */}
                  {entry.entry_type === 'bug' && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                      {(entry as BugReport).steps_to_reproduce.length > 0 && (
                        <div>
                          <strong style={{ color: '#e4e4e7' }}>Steps:</strong>{' '}
                          {(entry as BugReport).steps_to_reproduce.map((s, i) => `${i + 1}. ${s.text}`).join(' ')}
                        </div>
                      )}
                      {(entry as BugReport).expected_behavior && (
                        <div><strong style={{ color: '#e4e4e7' }}>Expected:</strong> {(entry as BugReport).expected_behavior}</div>
                      )}
                      {(entry as BugReport).actual_behavior && (
                        <div><strong style={{ color: '#e4e4e7' }}>Actual:</strong> {(entry as BugReport).actual_behavior}</div>
                      )}
                    </div>
                  )}
                  {/* Feature-specific details */}
                  {entry.entry_type === 'feature' && (entry as FeatureRequest).user_story && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                      {(entry as FeatureRequest).user_story}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Flow Breadcrumb */}
            {selectedSession.flow_breadcrumb.length > 0 && (
              <div style={{
                background: 'rgba(30,30,40,0.85)',
                border: '1px solid rgba(80,80,100,0.3)',
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
              }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Session Flow</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 12 }}>
                  {selectedSession.flow_breadcrumb.map((step, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {i > 0 && <span style={{ color: '#9ca3af' }}>→</span>}
                      <span style={{
                        padding: '2px 8px', borderRadius: 4,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: '#818cf8',
                      }}>
                        {step.route} <span style={{ color: '#9ca3af', fontSize: 10 }}>({step.time_spent_seconds}s)</span>
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ───

function getEntryText(entry: BetaPadEntry): string {
  if (entry.entry_type === 'note') return (entry as QuickNote).text.slice(0, 120)
  if (entry.entry_type === 'bug') return (entry as BugReport).title
  return (entry as FeatureRequest).title
}

function getPriorityColor(p: Priority): string {
  switch (p) {
    case 'P0': return '#ef4444'
    case 'P1': return '#f59e0b'
    case 'P2': return '#3b82f6'
    case 'P3': return '#9ca3af'
  }
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(30,30,40,0.85)',
      border: '1px solid rgba(80,80,100,0.3)',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{label}</div>
    </div>
  )
}

// Inline styles for consistency
const selectStyle: React.CSSProperties = {
  background: 'rgba(30,30,40,0.85)',
  border: '1px solid rgba(80,80,100,0.3)',
  borderRadius: 6,
  color: '#e4e4e7',
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid rgba(80,80,100,0.3)',
  background: 'rgba(30,30,40,0.85)',
  color: '#e4e4e7',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
}
