import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Sparkles, Plus, RefreshCw, Send,
  CalendarDays, BarChart3, AlertTriangle,
} from 'lucide-react'
import { Facility } from './types'
import { type SocialPost, PLATFORM_CONFIG } from './social/SocialTypes'
import ContentCalendar from './social/ContentCalendar'
import BatchGenerator from './social/BatchGenerator'
import PostComposer from './social/PostComposer'
import PostCard from './social/PostCard'

/* ════════════════════════════════════════════════════════════════
   Social Media Command Center
   Unified content calendar, AI batch generation, and publishing
   for Facebook, Instagram, and Google Business Profile.

   NEW feature — does NOT modify any existing code.
   Reads from platform_connections + gbp_connections for publishing.
════════════════════════════════════════════════════════════════ */

type SubView = 'calendar' | 'drafts' | 'published' | 'metrics'

export default function SocialCommandCenter({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)
  const [subView, setSubView] = useState<SubView>('calendar')
  const [showGenerator, setShowGenerator] = useState(false)
  const [showComposer, setShowComposer] = useState(false)

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/social-posts?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to load posts')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [facility.id, adminKey])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  /* ── Derived stats ── */
  const drafts = posts.filter(p => p.status === 'draft')
  const scheduled = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')
  const failed = posts.filter(p => p.status === 'failed')

  const platformCounts = {
    facebook: posts.filter(p => p.platform === 'facebook').length,
    instagram: posts.filter(p => p.platform === 'instagram').length,
    gbp: posts.filter(p => p.platform === 'gbp').length,
  }

  async function handlePublishAll(postIds: string[]) {
    for (const id of postIds) {
      await fetch('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ postId: id }),
      })
    }
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className={`ml-3 ${sub}`}>Loading social media hub...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ══════════ HEADER ══════════ */}
      <div className={`border rounded-xl p-4 ${card}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-bold ${text}`}>Social Media Command Center</h2>
            <p className={`text-xs ${sub} mt-0.5`}>Create, schedule, and publish to Facebook, Instagram, and Google Business</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <Sparkles size={14} /> Generate Content
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} /> New Post
            </button>
            <button
              onClick={fetchPosts}
              className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <RefreshCw size={14} className={sub} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ METRICS STRIP ══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        <MetricCard label="Total Posts" value={String(posts.length)} darkMode={darkMode} />
        <MetricCard label="Drafts" value={String(drafts.length)} accent={drafts.length > 0 ? 'text-amber-500' : undefined} darkMode={darkMode} />
        <MetricCard label="Scheduled" value={String(scheduled.length)} accent="text-blue-500" darkMode={darkMode} />
        <MetricCard label="Published" value={String(published.length)} accent="text-emerald-500" darkMode={darkMode} />
        {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
          <MetricCard key={key} label={config.label} value={String(platformCounts[key as keyof typeof platformCounts])} accent={config.textColor} darkMode={darkMode} />
        ))}
      </div>

      {/* ══════════ SUB-VIEW TABS ══════════ */}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {([
          ['calendar', 'Calendar', CalendarDays],
          ['drafts', `Drafts (${drafts.length})`, Sparkles],
          ['published', `Published (${published.length})`, Send],
          ['metrics', 'Overview', BarChart3],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubView(key as SubView)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              subView === key
                ? 'bg-emerald-500 text-white shadow-lg'
                : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════ CALENDAR VIEW ══════════ */}
      {subView === 'calendar' && (
        <ContentCalendar posts={posts} darkMode={darkMode} adminKey={adminKey} onRefresh={fetchPosts} />
      )}

      {/* ══════════ DRAFTS VIEW ══════════ */}
      {subView === 'drafts' && (
        <div className="space-y-3">
          {drafts.length > 0 && (
            <div className="flex items-center justify-between">
              <p className={`text-sm ${sub}`}>{drafts.length} posts ready to review</p>
              <button
                onClick={() => handlePublishAll(scheduled.map(p => p.id))}
                disabled={scheduled.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Send size={12} /> Publish All Scheduled ({scheduled.length})
              </button>
            </div>
          )}
          {drafts.length === 0 ? (
            <EmptyState
              message="No drafts yet"
              action="Generate some content to get started"
              darkMode={darkMode}
              onAction={() => setShowGenerator(true)}
            />
          ) : (
            drafts.map(p => <PostCard key={p.id} post={p} darkMode={darkMode} adminKey={adminKey} onUpdate={fetchPosts} />)
          )}
          {failed.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4">
                <AlertTriangle size={14} className="text-red-500" />
                <h4 className={`text-sm font-medium ${text}`}>Failed ({failed.length})</h4>
              </div>
              {failed.map(p => <PostCard key={p.id} post={p} darkMode={darkMode} adminKey={adminKey} onUpdate={fetchPosts} />)}
            </>
          )}
        </div>
      )}

      {/* ══════════ PUBLISHED VIEW ══════════ */}
      {subView === 'published' && (
        <div className="space-y-2">
          {published.length === 0 ? (
            <EmptyState message="No published posts yet" action="Create and publish your first post" darkMode={darkMode} onAction={() => setShowComposer(true)} />
          ) : (
            published
              .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
              .map(p => <PostCard key={p.id} post={p} darkMode={darkMode} adminKey={adminKey} onUpdate={fetchPosts} />)
          )}
        </div>
      )}

      {/* ══════════ OVERVIEW / METRICS VIEW ══════════ */}
      {subView === 'metrics' && (
        <div className="space-y-4">
          {/* Platform breakdown */}
          <div className={`border rounded-xl p-4 ${card}`}>
            <h3 className={`text-sm font-bold mb-3 ${text}`}>Posts by Platform</h3>
            <div className="space-y-3">
              {(Object.entries(PLATFORM_CONFIG) as [keyof typeof PLATFORM_CONFIG, typeof PLATFORM_CONFIG[keyof typeof PLATFORM_CONFIG]][]).map(([key, config]) => {
                const count = platformCounts[key]
                const pubCount = published.filter(p => p.platform === key).length
                const maxCount = Math.max(...Object.values(platformCounts), 1)
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between">
                      <span className={`text-xs font-medium ${config.textColor}`}>{config.icon} {config.label}</span>
                      <span className={`text-xs ${sub}`}>{count} total · {pubCount} published</span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div
                        className={`h-3 rounded-full ${config.color} transition-all`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Post type breakdown */}
          <div className={`border rounded-xl p-4 ${card}`}>
            <h3 className={`text-sm font-bold mb-3 ${text}`}>Content Mix</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(
                posts.reduce<Record<string, number>>((acc, p) => {
                  acc[p.post_type] = (acc[p.post_type] || 0) + 1
                  return acc
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-lg font-bold ${text}`}>{count}</p>
                    <p className={`text-xs ${sub} capitalize`}>{type.replace(/_/g, ' ')}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className={`border rounded-xl p-4 ${card}`}>
            <h3 className={`text-sm font-bold mb-3 ${text}`}>Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setShowGenerator(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Sparkles size={16} className="text-violet-500 mb-1" />
                <p className={`text-xs font-medium ${text}`}>Generate 2 Weeks of Content</p>
                <p className={`text-[10px] ${sub}`}>AI creates 10 posts across all platforms</p>
              </button>
              <button
                onClick={() => setShowComposer(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Plus size={16} className="text-emerald-500 mb-1" />
                <p className={`text-xs font-medium ${text}`}>Create Single Post</p>
                <p className={`text-[10px] ${sub}`}>Write and publish a custom post</p>
              </button>
              <button
                onClick={() => { if (scheduled.length > 0) handlePublishAll(scheduled.map(p => p.id)) }}
                disabled={scheduled.length === 0}
                className={`p-3 rounded-lg border text-left transition-colors disabled:opacity-40 ${darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Send size={16} className="text-blue-500 mb-1" />
                <p className={`text-xs font-medium ${text}`}>Publish All Scheduled</p>
                <p className={`text-[10px] ${sub}`}>{scheduled.length} posts ready to go</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}
      {showGenerator && (
        <BatchGenerator
          facilityId={facility.id}
          adminKey={adminKey}
          darkMode={darkMode}
          onGenerated={fetchPosts}
          onClose={() => setShowGenerator(false)}
        />
      )}
      {showComposer && (
        <PostComposer
          facilityId={facility.id}
          adminKey={adminKey}
          darkMode={darkMode}
          onCreated={fetchPosts}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  )
}

/* ── Helper components ── */

function MetricCard({ label, value, accent, darkMode }: { label: string; value: string; accent?: string; darkMode: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${darkMode ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
      <p className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-lg font-bold ${accent || (darkMode ? 'text-slate-100' : 'text-slate-900')}`}>{value}</p>
    </div>
  )
}

function EmptyState({ message, action, darkMode, onAction }: { message: string; action: string; darkMode: boolean; onAction: () => void }) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  return (
    <div className="text-center py-10">
      <CalendarDays size={32} className={`mx-auto mb-3 ${sub}`} />
      <p className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{message}</p>
      <p className={`text-sm ${sub} mt-1`}>{action}</p>
      <button onClick={onAction} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
        Get Started
      </button>
    </div>
  )
}
