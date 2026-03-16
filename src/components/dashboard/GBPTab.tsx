import { useState, useEffect } from 'react'
import {
  Loader2, MapPin, Star, MessageSquare, Send, RefreshCw, Plus, Trash2, Clock, CheckCircle2,
  AlertCircle, Image, Sparkles, Settings, HelpCircle, BarChart3, TrendingUp, Eye, MousePointer,
  Navigation, Phone, Search, Map
} from 'lucide-react'
import type { GBPConnection, GBPPost, GBPReview, GBPSyncLog, GBPQuestion, GBPInsights } from './types'

type Section = 'posts' | 'reviews' | 'qa' | 'insights' | 'sync' | 'settings'

export default function GBPTab({ facility, adminKey, darkMode, pmsData }: { facility: { id: string; name: string }; adminKey: string; darkMode: boolean; pmsData?: import('@/hooks/usePMSData').PMSData | null }) {
  const [section, setSection] = useState<Section>('posts')
  const [connection, setConnection] = useState<GBPConnection | null>(null)
  const [posts, setPosts] = useState<GBPPost[]>([])
  const [reviews, setReviews] = useState<GBPReview[]>([])
  const [reviewStats, setReviewStats] = useState({ total: 0, avg_rating: 0, responded: 0, response_rate: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number> })
  const [syncLog, setSyncLog] = useState<GBPSyncLog[]>([])
  const [questions, setQuestions] = useState<GBPQuestion[]>([])
  const [qaStats, setQaStats] = useState({ total: 0, answered: 0, unanswered: 0 })
  const [insights, setInsights] = useState<GBPInsights[]>([])
  const [insightsSummary, setInsightsSummary] = useState<{ period?: string; total_impressions?: number; total_actions?: number; [key: string]: unknown } | null>(null)
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
  const [generatingPostAI, setGeneratingPostAI] = useState(false)
  const [postAIPrompt, setPostAIPrompt] = useState('')

  // Review response state
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Record<string, string>>({})
  const [approvingFor, setApprovingFor] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [bulkGenerating, setBulkGenerating] = useState(false)

  // Q&A state
  const [generatingAnswer, setGeneratingAnswer] = useState<string | null>(null)
  const [editingAnswer, setEditingAnswer] = useState<Record<string, string>>({})
  const [approvingAnswer, setApprovingAnswer] = useState<string | null>(null)
  const [bulkGeneratingQA, setBulkGeneratingQA] = useState(false)
  const [qaFilter, setQaFilter] = useState('all')

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
      const [syncRes, postsRes, reviewsRes, qaRes, insightsRes] = await Promise.all([
        fetch(`/api/gbp-sync?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-posts?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-reviews?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-questions?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/gbp-insights?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      ])
      if (syncRes.connection) setConnection(syncRes.connection)
      if (syncRes.syncLog) setSyncLog(syncRes.syncLog)
      if (postsRes.posts) setPosts(postsRes.posts)
      if (reviewsRes.reviews) setReviews(reviewsRes.reviews)
      if (reviewsRes.stats) setReviewStats(reviewsRes.stats)
      if (qaRes.questions) setQuestions(qaRes.questions)
      if (qaRes.stats) setQaStats(qaRes.stats)
      if (insightsRes.insights) setInsights(insightsRes.insights)
      if (insightsRes.summary) setInsightsSummary(insightsRes.summary)
    } catch { /* silent */ }
    setLoading(false)
  }

  // ── Post actions ──

  async function generatePostWithAI() {
    setGeneratingPostAI(true)
    try {
      const res = await fetch('/api/gbp-posts?action=generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id, postType, promptContext: postAIPrompt }),
      })
      const data = await res.json()
      if (data.generated) {
        if (data.generated.title) setPostTitle(data.generated.title)
        if (data.generated.body) setPostBody(data.generated.body)
      }
    } catch { /* silent */ }
    setGeneratingPostAI(false)
  }

  async function createPost(publish: boolean) {
    if (!postBody.trim()) return
    setSubmittingPost(true)
    try {
      const res = await fetch('/api/gbp-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id, postType, title: postTitle || null, body: postBody,
          ctaType: postCta || null, ctaUrl: postCtaUrl || null, imageUrl: postImageUrl || null,
          offerCode: postOfferCode || null, scheduledAt: postScheduledAt || null, publish,
        }),
      })
      if (res.ok) {
        setShowPostForm(false)
        setPostTitle(''); setPostBody(''); setPostCta(''); setPostCtaUrl(''); setPostImageUrl(''); setPostOfferCode(''); setPostScheduledAt(''); setPostAIPrompt('')
        await loadAll()
      }
    } catch { /* silent */ }
    setSubmittingPost(false)
  }

  async function deletePost(id: string) {
    await fetch(`/api/gbp-posts?id=${id}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  // ── Review actions ──

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

  async function bulkGenerateResponses() {
    setBulkGenerating(true)
    try {
      const res = await fetch('/api/gbp-reviews?action=bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      if (res.ok) await loadAll()
    } catch { /* silent */ }
    setBulkGenerating(false)
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

  // ── Q&A actions ──

  async function syncQuestions() {
    setSyncing('qa')
    try {
      await fetch('/api/gbp-questions?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      await loadAll()
    } catch { /* silent */ }
    setSyncing(null)
  }

  async function generateAIAnswer(questionId: string) {
    setGeneratingAnswer(questionId)
    try {
      const res = await fetch('/api/gbp-questions?action=generate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ questionId }),
      })
      const data = await res.json()
      if (data.aiDraft) {
        setEditingAnswer(prev => ({ ...prev, [questionId]: data.aiDraft }))
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ai_draft: data.aiDraft, answer_status: 'ai_drafted' } : q))
      }
    } catch { /* silent */ }
    setGeneratingAnswer(null)
  }

  async function bulkGenerateAnswers() {
    setBulkGeneratingQA(true)
    try {
      const res = await fetch('/api/gbp-questions?action=bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      if (res.ok) await loadAll()
    } catch { /* silent */ }
    setBulkGeneratingQA(false)
  }

  async function approveAnswer(questionId: string) {
    const answerText = editingAnswer[questionId]
    if (!answerText?.trim()) return
    setApprovingAnswer(questionId)
    try {
      await fetch('/api/gbp-questions?action=approve-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ questionId, answerText }),
      })
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, answer_status: 'published', answer_text: answerText } : q))
      setEditingAnswer(prev => { const n = { ...prev }; delete n[questionId]; return n })
    } catch { /* silent */ }
    setApprovingAnswer(null)
  }

  // ── Insights actions ──

  async function syncInsights() {
    setSyncing('insights')
    try {
      await fetch('/api/gbp-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      await loadAll()
    } catch { /* silent */ }
    setSyncing(null)
  }

  // ── Sync + Settings actions ──

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

  // ── Helpers ──

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const chipClass = (status: string, colorMap: Record<string, string>) =>
    `px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status] || (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`

  const postColors: Record<string, string> = {
    draft: darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
    scheduled: darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600',
    published: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
    failed: darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600',
  }
  const responseColors: Record<string, string> = {
    pending: darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-700',
    ai_drafted: darkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600',
    published: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
    skipped: darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500',
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

  const filteredQuestions = qaFilter === 'all' ? questions
    : qaFilter === 'unanswered' ? questions.filter(q => q.answer_status === 'pending' || q.answer_status === 'ai_drafted')
    : questions.filter(q => q.answer_status === qaFilter)

  const pendingReviewCount = reviews.filter(r => r.response_status === 'pending').length
  const pendingQACount = questions.filter(q => q.answer_status === 'pending').length

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
                window.open(`/api/gbp-sync?action=oauth&facilityId=${facility.id}`, '_blank')
              }}>
                Connect GBP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section pills */}
      <div className="flex gap-1 flex-wrap">
        {([
          ['posts', 'Posts', Send, 0],
          ['reviews', 'Reviews', MessageSquare, pendingReviewCount],
          ['qa', 'Q&A', HelpCircle, pendingQACount],
          ['insights', 'Insights', BarChart3, 0],
          ['sync', 'Profile Sync', RefreshCw, 0],
          ['settings', 'Settings', Settings, 0],
        ] as const).map(([id, label, Icon, badge]) => (
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
            {badge > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">{badge}</span>
            )}
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

          {showPostForm && (
            <div className={`border rounded-xl p-4 space-y-3 ${card}`}>
              {/* AI generation prompt */}
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800/40' : 'bg-purple-50 border border-purple-100'}`}>
                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}><Sparkles size={12} className="inline mr-1" />Generate with AI</p>
                <div className="flex gap-2">
                  <input type="text" value={postAIPrompt} onChange={e => setPostAIPrompt(e.target.value)}
                    placeholder="e.g. 10x10 climate units 15% off first month, mention spring cleaning"
                    className={`flex-1 ${inputCls}`} />
                  <button onClick={generatePostWithAI} disabled={generatingPostAI} className={btnPrimary}>
                    {generatingPostAI ? <Loader2 size={13} className="inline animate-spin" /> : <><Sparkles size={13} className="inline mr-1" />Generate</>}
                  </button>
                </div>
              </div>

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
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-medium ${sub}`}>Post Body *</label>
                  <span className={`text-xs ${postBody.length > 1500 ? 'text-red-500' : sub}`}>{postBody.length}/1500</span>
                </div>
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
              {postType === 'offer' && (
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

          {!showPostForm && (
            <div className="flex gap-2 flex-wrap">
              {((): { label: string; body: string; type: string }[] => {
                const templates: { label: string; body: string; type: string }[] = []

                // Only reference units with actual vacancy — NEVER advertise 100% occupied (Section 5.2)
                const availableUnits = pmsData?.units?.filter(u => (u.total_count - u.occupied_count) > 0) || []
                const lowestPrice = availableUnits.length ? Math.min(...availableUnits.map(u => u.web_rate || u.street_rate || 999)) : null
                const activeSpecial = pmsData?.specials?.find(s => s.active)

                // Unit Availability — operator language: specific types, real pricing, real counts
                if (availableUnits.length > 0 && pmsData?.vacantUnits) {
                  const topVacant = [...availableUnits].sort((a, b) => (b.total_count - b.occupied_count) - (a.total_count - a.occupied_count)).slice(0, 3)
                  const sizeList = topVacant.map(u => u.size_label || u.unit_type).join(', ')
                  templates.push({
                    label: 'Unit Availability',
                    body: `${facility.name} has ${pmsData.vacantUnits} units ready for move-in — ${sizeList}${lowestPrice ? ` starting at $${lowestPrice}/mo` : ''}. Drive-up access, month-to-month leases. Call or reserve online today.`,
                    type: 'availability',
                  })
                } else {
                  templates.push({
                    label: 'Unit Availability',
                    body: `${facility.name} has storage units available in multiple sizes. Climate-controlled and standard options with drive-up access. Call us for current pricing and availability.`,
                    type: 'availability',
                  })
                }

                // Promotion — use real PMS special with operator-grounded language, not agency "50% off" defaults
                if (activeSpecial) {
                  const discount = activeSpecial.discount_type === 'percent' ? `${activeSpecial.discount_value}% off` : activeSpecial.discount_type === 'months_free' ? `${activeSpecial.discount_value} month(s) free` : `$${activeSpecial.discount_value} off`
                  const appliesTo = activeSpecial.applies_to?.length ? ` on ${activeSpecial.applies_to.slice(0, 3).join(', ')} units` : ''
                  templates.push({
                    label: activeSpecial.name,
                    body: `${activeSpecial.name} at ${facility.name}: ${discount}${appliesTo}. ${activeSpecial.description || `Available now — limited availability.`} Reserve your unit today.`,
                    type: 'offer',
                  })
                } else if (availableUnits.length > 0 && lowestPrice) {
                  // No active special — use real pricing as the hook instead of fake discounts
                  templates.push({
                    label: 'Current Pricing',
                    body: `Storage at ${facility.name} starts at $${lowestPrice}/mo. ${availableUnits.length} unit types available with month-to-month flexibility. No long-term contracts required. Reserve online or call us.`,
                    type: 'update',
                  })
                } else {
                  templates.push({
                    label: 'Current Pricing',
                    body: `${facility.name} offers competitive rates on all unit sizes. Month-to-month leases, no long-term contracts. Call for current pricing and availability.`,
                    type: 'update',
                  })
                }

                templates.push({ label: 'Holiday Hours', body: `Holiday hours update for ${facility.name}: We'll have adjusted hours this holiday season. Our office team is here to help — check our profile for updated times.`, type: 'event' })
                return templates
              })().map(t => (
                <button key={t.label} onClick={() => { setShowPostForm(true); setPostBody(t.body); setPostType(t.type) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}>
                  <Sparkles size={12} /> {t.label}
                </button>
              ))}
            </div>
          )}

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
                        <span className={chipClass(post.status, postColors)}>{post.status}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{post.post_type}</span>
                        {post.ai_generated && <span className={`text-xs ${sub}`}><Sparkles size={11} className="inline" /> AI</span>}
                      </div>
                      {post.title && <p className={`text-sm font-medium ${text} mb-0.5`}>{post.title}</p>}
                      <p className={`text-sm ${sub} line-clamp-2`}>{post.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs ${sub}`}>{formatDate(post.created_at)}</span>
                        {post.scheduled_at && <span className={`text-xs ${sub}`}><Clock size={11} className="inline" /> {formatDate(post.scheduled_at)}</span>}
                        {post.published_at && <span className={`text-xs ${sub}`}><CheckCircle2 size={11} className="inline" /> {formatDate(post.published_at)}</span>}
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

          {/* Rating distribution */}
          {reviewStats.total > 0 && (
            <div className={`border rounded-xl p-4 ${card}`}>
              <h4 className={`text-xs font-semibold ${sub} mb-3`}>RATING DISTRIBUTION</h4>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = reviewStats.distribution?.[rating] || 0
                  const pct = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className={`text-xs w-8 text-right ${text}`}>{rating} ★</span>
                      <div className={`flex-1 h-4 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${rating >= 4 ? 'bg-emerald-500' : rating === 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs w-12 ${sub}`}>{count} ({Math.round(pct)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
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
            <div className="flex gap-2">
              {pendingReviewCount > 0 && (
                <button onClick={bulkGenerateResponses} disabled={bulkGenerating} className={btnSecondary}>
                  {bulkGenerating ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <Sparkles size={13} className="inline mr-1" />}
                  AI Draft All ({pendingReviewCount})
                </button>
              )}
              {connection?.status === 'connected' && (
                <button onClick={syncReviews} disabled={syncing === 'reviews'} className={btnSecondary}>
                  {syncing === 'reviews' ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <RefreshCw size={13} className="inline mr-1" />}
                  Sync Reviews
                </button>
              )}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className={`border rounded-xl p-8 text-center ${card}`}>
              <MessageSquare size={32} className={`mx-auto mb-2 opacity-40 ${sub}`} />
              <p className={`text-sm ${sub}`}>No reviews {reviewFilter !== 'all' ? 'matching this filter' : 'yet'}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div key={review.id} className={`border rounded-xl p-4 ${card}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-amber-500 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      <span className={`text-sm font-medium ${text}`}>{review.author_name || 'Anonymous'}</span>
                      <span className={chipClass(review.response_status, responseColors)}>{review.response_status.replace(/_/g, ' ')}</span>
                      <span className={`text-xs ${sub}`}>{formatDate(review.review_time)}</span>
                    </div>
                    {review.review_text && <p className={`text-sm ${sub} mt-1`}>{review.review_text}</p>}

                    {review.response_status === 'published' && review.response_text && (
                      <div className={`mt-3 p-3 rounded-lg text-sm ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-100'}`}>
                        <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Your Response</p>
                        <p className={darkMode ? 'text-emerald-200' : 'text-emerald-800'}>{review.response_text}</p>
                      </div>
                    )}

                    {(review.response_status === 'pending' || review.response_status === 'ai_drafted') && (
                      <div className="mt-3 space-y-2">
                        {(editingDraft[review.id] || review.ai_draft) ? (
                          <>
                            <textarea value={editingDraft[review.id] ?? review.ai_draft ?? ''} onChange={e => setEditingDraft(prev => ({ ...prev, [review.id]: e.target.value }))} rows={3} className={inputCls} />
                            <div className="flex gap-2">
                              <button onClick={() => approveResponse(review.id)} disabled={approvingFor === review.id} className={btnPrimary}>
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──── Q&A SECTION ──── */}
      {section === 'qa' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Questions', value: qaStats.total, icon: HelpCircle },
              { label: 'Answered', value: qaStats.answered, icon: CheckCircle2 },
              { label: 'Unanswered', value: qaStats.unanswered, icon: AlertCircle },
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

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              {['all', 'unanswered', 'published'].map(f => (
                <button key={f} onClick={() => setQaFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    qaFilter === f
                      ? (darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                      : (darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50')
                  }`}>
                  {f === 'all' ? 'All' : f === 'unanswered' ? 'Needs Answer' : 'Answered'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {pendingQACount > 0 && (
                <button onClick={bulkGenerateAnswers} disabled={bulkGeneratingQA} className={btnSecondary}>
                  {bulkGeneratingQA ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <Sparkles size={13} className="inline mr-1" />}
                  AI Draft All ({pendingQACount})
                </button>
              )}
              {connection?.status === 'connected' && (
                <button onClick={syncQuestions} disabled={syncing === 'qa'} className={btnSecondary}>
                  {syncing === 'qa' ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <RefreshCw size={13} className="inline mr-1" />}
                  Sync Q&A
                </button>
              )}
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className={`border rounded-xl p-8 text-center ${card}`}>
              <HelpCircle size={32} className={`mx-auto mb-2 opacity-40 ${sub}`} />
              <p className={`text-sm ${sub}`}>No questions {qaFilter !== 'all' ? 'matching this filter' : 'yet'}.</p>
              {connection?.status === 'connected' && <p className={`text-xs mt-1 ${sub}`}>Click "Sync Q&A" to pull questions from GBP.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map(q => (
                <div key={q.id} className={`border rounded-xl p-4 ${card}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <HelpCircle size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-medium ${text}`}>{q.author_name || 'Anonymous'}</span>
                        <span className={chipClass(q.answer_status, responseColors)}>{q.answer_status.replace(/_/g, ' ')}</span>
                        <span className={`text-xs ${sub}`}>{formatDate(q.question_time)}</span>
                        {q.upvote_count > 0 && <span className={`text-xs ${sub}`}>+{q.upvote_count} upvotes</span>}
                      </div>
                      <p className={`text-sm ${text} mb-2`}>{q.question_text}</p>

                      {q.answer_status === 'published' && q.answer_text && (
                        <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-100'}`}>
                          <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Your Answer</p>
                          <p className={darkMode ? 'text-emerald-200' : 'text-emerald-800'}>{q.answer_text}</p>
                        </div>
                      )}

                      {(q.answer_status === 'pending' || q.answer_status === 'ai_drafted') && (
                        <div className="space-y-2">
                          {(editingAnswer[q.id] || q.ai_draft) ? (
                            <>
                              <textarea value={editingAnswer[q.id] ?? q.ai_draft ?? ''} onChange={e => setEditingAnswer(prev => ({ ...prev, [q.id]: e.target.value }))} rows={2} className={inputCls} />
                              <div className="flex gap-2">
                                <button onClick={() => approveAnswer(q.id)} disabled={approvingAnswer === q.id} className={btnPrimary}>
                                  {approvingAnswer === q.id ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <CheckCircle2 size={13} className="inline mr-1" />}
                                  Approve & Publish
                                </button>
                                <button onClick={() => generateAIAnswer(q.id)} disabled={generatingAnswer === q.id} className={btnSecondary}>
                                  <Sparkles size={13} className="inline mr-1" /> Regenerate
                                </button>
                              </div>
                            </>
                          ) : (
                            <button onClick={() => generateAIAnswer(q.id)} disabled={generatingAnswer === q.id} className={btnSecondary}>
                              {generatingAnswer === q.id ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <Sparkles size={13} className="inline mr-1" />}
                              Generate AI Answer
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

      {/* ──── INSIGHTS SECTION ──── */}
      {section === 'insights' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${text}`}>GBP Performance Insights</h3>
            {connection?.status === 'connected' && (
              <button onClick={syncInsights} disabled={syncing === 'insights'} className={btnSecondary}>
                {syncing === 'insights' ? <Loader2 size={13} className="inline animate-spin mr-1" /> : <RefreshCw size={13} className="inline mr-1" />}
                Sync Insights
              </button>
            )}
          </div>

          {insightsSummary ? (
            <>
              {insightsSummary.period && <p className={`text-xs ${sub}`}>Data from {insightsSummary.period}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Search Views', value: insightsSummary.search_views, icon: Search, color: 'text-blue-500' },
                  { label: 'Maps Views', value: insightsSummary.maps_views, icon: Map, color: 'text-emerald-500' },
                  { label: 'Website Clicks', value: insightsSummary.website_clicks, icon: MousePointer, color: 'text-purple-500' },
                  { label: 'Direction Requests', value: insightsSummary.direction_clicks, icon: Navigation, color: 'text-amber-500' },
                  { label: 'Phone Calls', value: insightsSummary.phone_calls, icon: Phone, color: 'text-rose-500' },
                ].map(stat => (
                  <div key={stat.label} className={`border rounded-xl p-4 ${card}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon size={14} className={stat.color} />
                      <span className={`text-xs font-medium ${sub}`}>{stat.label}</span>
                    </div>
                    <p className={`text-xl font-bold ${text}`}>{(stat.value || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`border rounded-xl p-4 ${card}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={14} className="text-blue-500" />
                    <span className={`text-xs font-medium ${sub}`}>Total Impressions</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>{(insightsSummary.total_impressions || 0).toLocaleString()}</p>
                  <p className={`text-xs ${sub} mt-0.5`}>Search + Maps views combined</p>
                </div>
                <div className={`border rounded-xl p-4 ${card}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className={`text-xs font-medium ${sub}`}>Total Actions</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>{(insightsSummary.total_actions || 0).toLocaleString()}</p>
                  <p className={`text-xs ${sub} mt-0.5`}>Clicks + Directions + Calls</p>
                </div>
              </div>

              {Number(insightsSummary.total_impressions) > 0 && (
                <div className={`border rounded-xl p-4 ${card}`}>
                  <h4 className={`text-xs font-semibold ${sub} mb-2`}>ACTION RATE</h4>
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 h-6 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, (Number(insightsSummary.total_actions) / Number(insightsSummary.total_impressions)) * 100)}%` }} />
                    </div>
                    <span className={`text-sm font-bold ${text}`}>
                      {((Number(insightsSummary.total_actions) / Number(insightsSummary.total_impressions)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${sub} mt-1`}>Percentage of viewers who took an action</p>
                </div>
              )}
            </>
          ) : (
            <div className={`border rounded-xl p-8 text-center ${card}`}>
              <BarChart3 size={32} className={`mx-auto mb-2 opacity-40 ${sub}`} />
              <p className={`text-sm ${sub}`}>No insights data yet.</p>
              <p className={`text-xs mt-1 ${sub}`}>
                {connection?.status === 'connected' ? 'Click "Sync Insights" to pull performance data from GBP.' : 'Connect your GBP to start tracking performance metrics.'}
              </p>
            </div>
          )}

          {insights.length > 1 && (
            <div className={`border rounded-xl ${card}`}>
              <div className="p-4 border-b border-inherit">
                <h4 className={`text-sm font-semibold ${text}`}>Historical Performance</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                      <th className="text-left px-4 py-2 font-medium">Period</th>
                      <th className="text-right px-4 py-2 font-medium">Search</th>
                      <th className="text-right px-4 py-2 font-medium">Maps</th>
                      <th className="text-right px-4 py-2 font-medium">Clicks</th>
                      <th className="text-right px-4 py-2 font-medium">Directions</th>
                      <th className="text-right px-4 py-2 font-medium">Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {insights.map(i => (
                      <tr key={i.id} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                        <td className={`px-4 py-2 ${text}`}>{i.period_start} — {i.period_end}</td>
                        <td className={`px-4 py-2 text-right ${sub}`}>{i.search_views}</td>
                        <td className={`px-4 py-2 text-right ${sub}`}>{i.maps_views}</td>
                        <td className={`px-4 py-2 text-right ${sub}`}>{i.website_clicks}</td>
                        <td className={`px-4 py-2 text-right ${sub}`}>{i.direction_clicks}</td>
                        <td className={`px-4 py-2 text-right ${sub}`}>{i.phone_calls}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── PROFILE SYNC SECTION ──── */}
      {section === 'sync' && (
        <div className="space-y-3">
          <h3 className={`text-sm font-semibold ${text}`}>Profile Sync</h3>
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
                <button onClick={() => triggerSync(s.type)} disabled={syncing === s.type || connection?.status !== 'connected'} className={btnPrimary + ' w-full'}>
                  {syncing === s.type ? <><Loader2 size={13} className="inline animate-spin mr-1" /> Syncing...</> : s.label}
                </button>
              </div>
            ))}
          </div>

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
