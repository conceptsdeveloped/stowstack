import { useState, useEffect } from 'react'
import {
  Loader2, MapPin, Star, MessageSquare, Send, RefreshCw, Plus, Trash2, Clock, CheckCircle2,
  AlertCircle, Image, Sparkles, Settings
} from 'lucide-react'
import type { GBPConnection, GBPPost, GBPReview, GBPSyncLog } from './types'

type Section = 'posts' | 'reviews' | 'sync' | 'settings'

export default function GBPTab({ facility, adminKey, darkMode }: { facility: any; adminKey: string; darkMode: boolean }) {
  const [section, setSection] = useState<Section>('posts')
  const [connection, setConnection] = useState<GBPConnection | null>(null)
  const [posts, setPosts] = useState<GBPPost[]>([])
  const [reviews, setReviews] = useState<GBPReview[]>([])
  const [reviewStats, setReviewStats] = useState({ total: 0, avg_rating: 0, responded: 0, response_rate: 0 })
  const [syncLog, setSyncLog] = useState<GBPSyncLog[]>([])
  const [loading, setLoading] = useState(true)

  // Post form state
  const [showPostForm, setShowPostForm] = useState(false)
  const [postType, setPostType] = useState('update')
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [postCta, setPostCta] = useState('')
  const [postCtaUrl, setPostCtaUrl] = useState('')
  const [postImageUrl, setPostImageUrl] = useState('')
  const [postOfferCode, setPostOfferCode] = useState('')
  const [postScheduledAt, setPostScheduledAt] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Review response state
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Record<string, string>>({})
  const [approvingFor, setApprovingFor] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState('all')

  // Sync state
  const [syncing, setSyncing] = useState<string | null>(null)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-200' : 'text-slate-800'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`
  const btnPrimary = 'px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors'
  const btnSecondary = `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`

  useEffect(() => { loadAll() }, [facility.id, adminKey])

  async function loadAll() {
    setLoading(true)
    try {
      const [syncRes, postsRes, reviewsRes] = await Promise.all([
        fetch(`/api/gbp-sync?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-posts?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-reviews?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      ])
      if (syncRes.connection) setConnection(syncRes.connection)
      if (syncRes.syncLog) setSyncLog(syncRes.syncLog)
      if (postsRes.posts) setPosts(postsRes.posts)
      if (reviewsRes.reviews) setReviews(reviewsRes.reviews)
      if (reviewsRes.stats) setReviewStats(reviewsRes.stats)
    } catch { /* silent */ }
    setLoading(false)
  }

  async function createPost(publish: boolean) {
    if (!postBody.trim()) return
    setSubmittingPost(true)
    try {
      const res = await fetch('/api/gbp-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id,
          postType,
          title: postTitle || null,
          body: postBody,
          ctaType: postCta || null,
          ctaUrl: postCtaUrl || null,
          imageUrl: postImageUrl || null,
          offerCode: postOfferCode || null,
          scheduledAt: postScheduledAt || null,
          publish,
        }),
      })
      if (res.ok) {
        setShowPostForm(false)
        setPostTitle(''); setPostBody(''); setPostCta(''); setPostCtaUrl(''); setPostImageUrl(''); setPostOfferCode(''); setPostScheduledAt('')
        await loadAll()
      }
    } catch { /* silent */ }
    setSubmittingPost(false)
  }

  async function deletePost(id: string) {
    await fetch(`/api/gbp-posts?id=${id}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  async function generateAIResponse(reviewId: string) {
    setGeneratingFor(reviewId)
    try {
      const res = await fetch('/api/gbp-reviews?action=generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ reviewId }),
      })
      const data = await res.json()
      if (data.aiDraft) {
        setEditingDraft(prev => ({ ...prev, [reviewId]: data.aiDraft }))
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ai_draft: data.aiDraft, response_status: 'ai_drafted' } : r))
      }
    } catch { /* silent */ }
    setGeneratingFor(null)
  }

  async function approveResponse(reviewId: string) {
    const responseText = editingDraft[reviewId]
    if (!responseText?.trim()) return
    setApprovingFor(reviewId)
    try {
      await fetch('/api/gbp-reviews?action=approve-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ reviewId, responseText }),
      })
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response_status: 'published', response_text: responseText } : r))
      setEditingDraft(prev => { const n = { ...prev }; delete n[reviewId]; return n })
    } catch { /* silent */ }
    setApprovingFor(null)
  }

  async function syncReviews() {
    setSyncing('reviews')
    try {
      await fetch('/api/gbp-reviews?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      await loadAll()
    } catch { /* silent */ }
    setSyncing(null)
  }

  async function triggerSync(type: string) {
    setSyncing(type)
    try {
      await fetch('/api/gbp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id, type }),
      })
      await loadAll()
    } catch { /* silent */ }
    setSyncing(null)
  }

  async function updateSyncConfig(key: string, value: boolean) {
    if (!connection) return
    const newConfig = { ...connection.sync_config, [key]: value }
    try {
      const res = await fetch('/api/gbp-sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id, syncConfig: newConfig }),
      })
      const data = await res.json()
      if (data.connection) setConnection(data.connection)
    } catch { /* silent */ }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const postStatusChip = (status: string) => {
    const colors: Record<string, string> = {
      draft: darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
      scheduled: darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600',
      published: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
      failed: darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || colors.draft}`}>{status}</span>
  }

  const reviewStatusChip = (status: string) => {
    const colors: Record<string, string> = {
      pending: darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-700',
      ai_drafted: darkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600',
      published: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
      skipped: darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || colors.pending}`}>{status.replace('_', ' ')}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading GBP...
      </div>
    )
  }

  const filteredReviews = reviewFilter === 'all' ? reviews
    : reviewFilter === 'unresponded' ? reviews.filter(r => r.response_status === 'pending' || r.response_status === 'ai_drafted')
    : reviews.filter(r => r.response_status === reviewFilter)

  return (
    <div className="space-y-4">
      {/* Connection banner */}
      <div className={`border rounded-xl p-4 ${card}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connection?.status === 'connected' ? (darkMode ? 'bg-emerald-900/40' : 'bg-emerald-50') : (darkMode ? 'bg-slate-700' : 'bg-slate-100')}`}>
              <MapPin size={18} className={connection?.status === 'connected' ? 'text-emerald-500' : sub} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${text}`}>
                {connection?.status === 'connected' ? connection.location_name || 'Connected' : 'Google Business Profile'}
              </p>
              <p className={`text-xs ${sub}`}>
                {connection?.status === 'connected'
                  ? `Connected · Last synced ${connection.last_sync_at ? formatDate(connection.last_sync_at) : 'never'}`
                  : 'Not connected — connect to enable auto-posting and review management'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection?.status === 'connected' && (
              <button onClick={() => triggerSync('full')} disabled={syncing === 'full'} className={btnSecondary}>
                {syncing === 'full' ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <RefreshCw size={13} className="inline mr-1" />}
                Sync Now
              </button>
            )}
            {(!connection || connection.status !== 'connected') && (
              <button className={btnPrimary} onClick={() => {
                // OAuth flow would redirect to Google consent screen
                window.open(`/api/gbp-sync?action=oauth&facilityId=${facility.id}`, '_blank')
              }}>
                Connect GBP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section pills */}
      <div className="flex gap-1">
        {([
          ['posts', 'Posts', Send],
          ['reviews', 'Reviews', MessageSquare],
          ['sync', 'Profile Sync', RefreshCw],
          ['settings', 'Settings', Settings],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              section === id
                ? (darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                : (darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50')
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ──── POSTS SECTION ──── */}
      {section === 'posts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${text}`}>GBP Posts</h3>
            <button onClick={() => setShowPostForm(!showPostForm)} className={btnPrimary}>
              <Plus size={14} className="inline mr-1" /> New Post
            </button>
          </div>

          {/* Post form */}
          {showPostForm && (
            <div className={`border rounded-xl p-4 space-y-3 ${card}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Post Type</label>
                  <select value={postType} onChange={e => setPostType(e.target.value)} className={`mt-1 ${inputCls}`}>
                    <option value="update">Update</option>
                    <option value="offer">Offer / Special</option>
                    <option value="event">Event</option>
                    <option value="availability">Unit Availability</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Title (optional)</label>
                  <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                    placeholder="e.g. Spring Move-In Special" className={`mt-1 ${inputCls}`} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Post Body *</label>
                <textarea value={postBody} onChange={e => setPostBody(e.target.value)} rows={3}
                  placeholder="Write your GBP update..." className={`mt-1 ${inputCls}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs font-medium ${sub}`}>CTA Button</label>
                  <select value={postCta} onChange={e => setPostCta(e.target.value)} className={`mt-1 ${inputCls}`}>
                    <option value="">None</option>
                    <option value="BOOK">Book</option>
                    <option value="CALL">Call</option>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="SIGN_UP">Sign Up</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub}`}>CTA URL</label>
                  <input type="url" value={postCtaUrl} onChange={e => setPostCtaUrl(e.target.value)}
                    placeholder="https://..." className={`mt-1 ${inputCls}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Image URL</label>
                  <input type="url" value={postImageUrl} onChange={e => setPostImageUrl(e.target.value)}
                    placeholder="https://..." className={`mt-1 ${inputCls}`} />
                </div>
              </div>
              {(postType === 'offer') && (
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Offer / Promo Code</label>
                  <input type="text" value={postOfferCode} onChange={e => setPostOfferCode(e.target.value)}
                    placeholder="e.g. SPRING25" className={`mt-1 ${inputCls}`} />
                </div>
              )}
              <div>
                <label className={`text-xs font-medium ${sub}`}>Schedule (leave empty to post now or save as draft)</label>
                <input type="datetime-local" value={postScheduledAt} onChange={e => setPostScheduledAt(e.target.value)}
                  className={`mt-1 ${inputCls}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => createPost(false)} disabled={submittingPost || !postBody.trim()} className={btnSecondary}>
                  {submittingPost ? <Loader2 size={13} className="inline animate-spin mr-1" /> : null}
                  {postScheduledAt ? 'Schedule' : 'Save Draft'}
                </button>
                {connection?.status === 'connected' && !postScheduledAt && (
                  <button onClick={() => createPost(true)} disabled={submittingPost || !postBody.trim()} className={btnPrimary}>
                    <Send size={13} className="inline mr-1" /> Publish Now
                  </button>
                )}
                <button onClick={() => setShowPostForm(false)} className={`${btnSecondary} ml-auto`}>Cancel</button>
              </div>
            </div>
          )}

          {/* Quick-post templates */}
          {!showPostForm && (
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Unit Availability', body: `We have units available at ${facility.name}! Climate-controlled and standard units in various sizes. Reserve yours today — first month free for new tenants.`, type: 'availability' },
                { label: 'Monthly Special', body: `This month's special at ${facility.name}: 50% off your first month's rent! Limited time offer on select unit sizes. Call or visit us to claim your deal.`, type: 'offer' },
                { label: 'Holiday Hours', body: `Holiday hours update for ${facility.name}: We'll have adjusted hours this holiday season. Our office team is here to help — check our profile for updated times.`, type: 'event' },
              ].map(t => (
                <button key={t.label} onClick={() => { setShowPostForm(true); setPostBody(t.body); setPostType(t.type) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}>
                  <Sparkles size={12} /> {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Posts list */}
          {posts.length === 0 ? (
            <div className={`border rounded-xl p-8 text-center ${card}`}>
              <Send size={32} className={`mx-auto mb-2 opacity-40 ${sub}`} />
              <p className={`text-sm ${sub}`}>No posts yet.</p>
              <p className={`text-xs mt-1 ${sub}`}>Create a post to update your Google Business Profile.</p>
            </div>
          ) : (
            <div className={`border rounded-xl divide-y divide-inherit ${card}`}>
              {posts.map(post => (
                <div key={post.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {postStatusChip(post.status)}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{post.post_type}</span>
                        {post.ai_generated && <span className={`text-xs ${sub}`}><Sparkles size={11} className="inline" /> AI</span>}
                      </div>
                      {post.title && <p className={`text-sm font-medium ${text} mb-0.5`}>{post.title}</p>}
                      <p className={`text-sm ${sub} line-clamp-2`}>{post.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs ${sub}`}>{formatDate(post.created_at)}</span>
                        {post.scheduled_at && <span className={`text-xs ${sub}`}><Clock size={11} className="inline" /> Scheduled: {formatDate(post.scheduled_at)}</span>}
                        {post.published_at && <span className={`text-xs ${sub}`}><CheckCircle2 size={11} className="inline" /> Published: {formatDate(post.published_at)}</span>}
                        {post.error_message && <span className="text-xs text-red-500"><AlertCircle size={11} className="inline" /> {post.error_message}</span>}
                      </div>
                    </div>
                    <button onClick={() => deletePost(post.id)}
                      className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-red-900/30 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── REVIEWS SECTION ──── */}
      {section === 'reviews' && (
        <div className="space-y-3">
          {/* Review stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Avg Rating', value: `★ ${reviewStats.avg_rating}`, icon: Star },
              { label: 'Total Reviews', value: reviewStats.total, icon: MessageSquare },
              { label: 'Responded', value: reviewStats.responded, icon: CheckCircle2 },
              { label: 'Response Rate', value: `${reviewStats.response_rate}%`, icon: Send },
            ].map(stat => (
              <div key={stat.label} className={`border rounded-xl p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={14} className={sub} />
                  <span className={`text-xs font-medium ${sub}`}>{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${text}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {['all', 'unresponded', 'published'].map(f => (
                <button key={f} onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    reviewFilter === f
                      ? (darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                      : (darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50')
                  }`}>
                  {f === 'all' ? 'All' : f === 'unresponded' ? 'Needs Response' : 'Responded'}
                </button>
              ))}
            </div>
            {connection?.status === 'connected' && (
              <button onClick={syncReviews} disabled={syncing === 'reviews'} className={btnSecondary}>
                {syncing === 'reviews' ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <RefreshCw size={13} className="inline mr-1" />}
                Sync Reviews
              </button>
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <div className={`border rounded-xl p-8 text-center ${card}`}>
              <MessageSquare size={32} className={`mx-auto mb-2 opacity-40 ${sub}`} />
              <p className={`text-sm ${sub}`}>No reviews {reviewFilter !== 'all' ? 'matching this filter' : 'yet'}.</p>
              {connection?.status === 'connected' && <p className={`text-xs mt-1 ${sub}`}>Click "Sync Reviews" to pull the latest from GBP.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div key={review.id} className={`border rounded-xl p-4 ${card}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-amber-500 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        <span className={`text-sm font-medium ${text}`}>{review.author_name || 'Anonymous'}</span>
                        {reviewStatusChip(review.response_status)}
                        <span className={`text-xs ${sub}`}>{formatDate(review.review_time)}</span>
                      </div>
                      {review.review_text && <p className={`text-sm ${sub} mt-1`}>{review.review_text}</p>}

                      {/* Published response */}
                      {review.response_status === 'published' && review.response_text && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-100'}`}>
                          <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Your Response</p>
                          <p className={darkMode ? 'text-emerald-200' : 'text-emerald-800'}>{review.response_text}</p>
                        </div>
                      )}

                      {/* AI draft / editing area */}
                      {(review.response_status === 'pending' || review.response_status === 'ai_drafted') && (
                        <div className="mt-3 space-y-2">
                          {(editingDraft[review.id] || review.ai_draft) ? (
                            <>
                              <textarea
                                value={editingDraft[review.id] ?? review.ai_draft ?? ''}
                                onChange={e => setEditingDraft(prev => ({ ...prev, [review.id]: e.target.value }))}
                                rows={3}
                                className={inputCls}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => approveResponse(review.id)}
                                  disabled={approvingFor === review.id}
                                  className={btnPrimary}>
                                  {approvingFor === review.id ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <CheckCircle2 size={13} className="inline mr-1" />}
                                  Approve & Publish
                                </button>
                                <button onClick={() => generateAIResponse(review.id)} disabled={generatingFor === review.id} className={btnSecondary}>
                                  <Sparkles size={13} className="inline mr-1" /> Regenerate
                                </button>
                              </div>
                            </>
                          ) : (
                            <button onClick={() => generateAIResponse(review.id)} disabled={generatingFor === review.id} className={btnSecondary}>
                              {generatingFor === review.id ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <Sparkles size={13} className="inline mr-1" />}
                              Generate AI Response
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── PROFILE SYNC SECTION ──── */}
      {section === 'sync' && (
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold ${text}`}>Profile Sync</h3>

          {/* Sync actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'hours', label: 'Sync Hours', desc: 'Push facility hours to GBP', icon: Clock },
              { type: 'photos', label: 'Sync Photos', desc: 'Upload latest photos to GBP', icon: Image },
              { type: 'full', label: 'Full Sync', desc: 'Sync everything at once', icon: RefreshCw },
            ].map(s => (
              <div key={s.type} className={`border rounded-xl p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={16} className={sub} />
                  <span className={`text-sm font-medium ${text}`}>{s.label}</span>
                </div>
                <p className={`text-xs ${sub} mb-3`}>{s.desc}</p>
                <button
                  onClick={() => triggerSync(s.type)}
                  disabled={syncing === s.type || connection?.status !== 'connected'}
                  className={btnPrimary + ' w-full'}
                >
                  {syncing === s.type ? <><Loader2 size={13} className="inline animate-spin mr-1" /> Syncing...</> : s.label}
                </button>
              </div>
            ))}
          </div>

          {/* Sync log */}
          {syncLog.length > 0 && (
            <div className={`border rounded-xl ${card}`}>
              <div className="p-4 border-b border-inherit">
                <h4 className={`text-sm font-semibold ${text}`}>Sync History</h4>
              </div>
              <div className="divide-y divide-inherit">
                {syncLog.map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                    {log.status === 'success' ? <CheckCircle2 size={14} className="text-emerald-500" />
                      : log.status === 'partial' ? <AlertCircle size={14} className="text-amber-500" />
                      : <AlertCircle size={14} className="text-red-500" />}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${text}`}>{log.sync_type}</span>
                      {log.error_message && <p className="text-xs text-red-400 truncate">{log.error_message}</p>}
                    </div>
                    <span className={`text-xs ${sub}`}>{formatDate(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── SETTINGS SECTION ──── */}
      {section === 'settings' && (
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold ${text}`}>Automation Settings</h3>
          <div className={`border rounded-xl p-4 space-y-4 ${card}`}>
            {[
              { key: 'auto_post', label: 'Auto-Post Updates', desc: 'Automatically publish scheduled posts at their scheduled time' },
              { key: 'auto_respond', label: 'Auto-Respond to Reviews', desc: 'Automatically generate and publish AI responses to new reviews' },
              { key: 'sync_hours', label: 'Auto-Sync Hours', desc: 'Keep GBP hours in sync with facility hours on file' },
              { key: 'sync_photos', label: 'Auto-Sync Photos', desc: 'Automatically push new facility photos to GBP' },
            ].map(setting => (
              <div key={setting.key} className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${text}`}>{setting.label}</p>
                  <p className={`text-xs ${sub}`}>{setting.desc}</p>
                </div>
                <button
                  onClick={() => updateSyncConfig(setting.key, !connection?.sync_config?.[setting.key as keyof typeof connection.sync_config])}
                  disabled={!connection}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    connection?.sync_config?.[setting.key as keyof typeof connection.sync_config]
                      ? 'bg-emerald-500' : (darkMode ? 'bg-slate-600' : 'bg-slate-300')
                  } ${!connection ? 'opacity-40' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    connection?.sync_config?.[setting.key as keyof typeof connection.sync_config] ? 'translate-x-5.5 left-0' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>

          {connection && (
            <div className={`border rounded-xl p-4 ${card}`}>
              <h4 className={`text-sm font-semibold ${text} mb-2`}>Connection Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className={sub}>Status</span>
                <span className={text}>{connection.status}</span>
                <span className={sub}>Location</span>
                <span className={text}>{connection.location_name || '—'}</span>
                <span className={sub}>Google Account</span>
                <span className={text}>{connection.google_account_id || '—'}</span>
                <span className={sub}>Connected</span>
                <span className={text}>{formatDate(connection.created_at)}</span>
                <span className={sub}>Last Sync</span>
                <span className={text}>{formatDate(connection.last_sync_at)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
