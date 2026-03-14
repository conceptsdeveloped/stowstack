import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Building2, RefreshCw, Search, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Calendar, ArrowLeft,
  Users, TrendingUp, Clock, CheckCircle2, XCircle, Loader2,
  StickyNote, KeyRound, Copy, BarChart3, Plus, Trash2,
  DollarSign, Target, Award, ArrowUpRight, ArrowDownRight, Minus,
  ClipboardList, FileText, Send, AlertTriangle, Bell, Sparkles,
  Download, CalendarClock, CheckSquare, MessageSquare,
  Settings, Columns3, CreditCard, Moon, Sun, Keyboard,
  GripVertical, Receipt, ChevronRight, X as XIcon, Command,
  Upload, Image, Film, Globe, Heart, MessageCircle, Bookmark, MoreHorizontal
} from 'lucide-react'
import OnboardingWizard from './OnboardingWizard'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

/* ── Types ── */

interface LeadNote {
  text: string
  at: string
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  facilityName: string
  location: string
  occupancyRange: string
  totalUnits: string
  biggestIssue: string
  formNotes: string | null
  status: string
  createdAt: string
  updatedAt: string
  notes: LeadNote[]
  pmsUploaded?: boolean
  accessCode?: string
  followUpDate?: string
}

/* ── Constants ── */

const STATUSES = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'form_sent', label: 'Form Sent', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'form_completed', label: 'Form Done', color: 'bg-purple-100 text-purple-700' },
  { value: 'audit_generated', label: 'Audit Ready', color: 'bg-amber-100 text-amber-700' },
  { value: 'call_scheduled', label: 'Call Set', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'client_signed', label: 'Signed', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]))

const OCCUPANCY_LABELS: Record<string, string> = {
  'below-60': 'Below 60%',
  '60-75': '60–75%',
  '75-85': '75–85%',
  '85-95': '85–95%',
  'above-95': 'Above 95%',
}

const UNITS_LABELS: Record<string, string> = {
  'under-100': 'Under 100',
  '100-300': '100–300',
  '300-500': '300–500',
  '500+': '500+',
}

const ISSUE_LABELS: Record<string, string> = {
  'standard-units': 'Standard Units',
  'climate-controlled': 'Climate Controlled',
  'drive-up': 'Drive-Up',
  'vehicle-rv-boat': 'Vehicle/RV/Boat',
  'lease-up': 'Lease-Up',
  'low-occupancy': 'Low Occupancy',
  'other': 'Other',
}

/* ── Helpers ── */

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

/* ── Admin Auth Gate ── */

const STORAGE_KEY = 'stowstack_admin_key'

function AdminLogin({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return
    setChecking(true)
    setError(false)
    try {
      const res = await fetch('/api/admin-leads', {
        headers: { 'X-Admin-Key': key.trim() },
      })
      if (res.status === 401) {
        setError(true)
        setChecking(false)
        return
      }
      if (!res.ok) throw new Error()
      localStorage.setItem(STORAGE_KEY, key.trim())
      onAuth(key.trim())
    } catch {
      setError(true)
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StowStack Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your admin key to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="Admin key"
            value={key}
            onChange={e => { setKey(e.target.value); setError(false) }}
            autoFocus
            className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
              error ? 'border-red-300 bg-red-50' : 'border-slate-200'
            }`}
          />
          {error && <p className="text-xs text-red-600">Invalid admin key. Try again.</p>}
          <button
            type="submit"
            disabled={!key.trim() || checking}
            className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : null}
            {checking ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Admin Dashboard ── */

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [adminKey, setAdminKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  if (!adminKey) {
    return <AdminLogin onAuth={setAdminKey} />
  }

  return <AdminDashboardInner adminKey={adminKey} onBack={onBack} onLogout={() => { localStorage.removeItem(STORAGE_KEY); setAdminKey(null) }} />
}

type AdminTab = 'pipeline' | 'kanban' | 'portfolio' | 'insights' | 'billing' | 'settings' | 'facilities'

/* ── Facilities View ── */

interface Facility {
  id: string
  created_at: string
  name: string
  location: string
  contact_name: string
  contact_email: string
  contact_phone: string
  occupancy_range: string
  total_units: string
  biggest_issue: string
  notes: string | null
  status: string
  google_address: string | null
  google_rating: number | null
  review_count: number | null
  website: string | null
  google_maps_url: string | null
  google_phone: string | null
  photos: { index: number; url: string; width: number; height: number }[] | null
  reviews: { author: string; rating: number; text: string; time: string }[] | null
}

interface AdVariation {
  id: string
  facility_id: string
  brief_id: string | null
  created_at: string
  platform: string
  format: string
  angle: string
  content_json: {
    angle: string
    angleLabel: string
    primaryText: string
    headline: string
    description: string
    cta: string
    targetingNote: string
  }
  asset_urls: Record<string, string> | null
  status: string
  feedback: string | null
  version: number
}

const FACILITY_STATUSES = ['intake', 'scraped', 'briefed', 'generating', 'review', 'approved', 'live', 'reporting'] as const

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-slate-100 text-slate-600',
  scraped: 'bg-blue-100 text-blue-700',
  briefed: 'bg-indigo-100 text-indigo-700',
  generating: 'bg-purple-100 text-purple-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  live: 'bg-green-100 text-green-700',
  reporting: 'bg-teal-100 text-teal-700',
}

const VARIATION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const ANGLE_ICONS: Record<string, string> = {
  social_proof: '⭐',
  convenience: '📍',
  urgency: '⏰',
  lifestyle: '🏡',
}

type FacilitySubTab = 'overview' | 'creative' | 'assets' | 'ad-preview' | 'publish'

/* ── Ad Variation Card ── */

function VariationCard({
  v, darkMode, adminKey, onUpdate,
}: {
  v: AdVariation
  darkMode: boolean
  adminKey: string
  onUpdate: (updated: AdVariation) => void
}) {
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [editFields, setEditFields] = useState(v.content_json)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  async function patchVariation(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/facility-creatives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ variationId: v.id, ...body }),
      })
      const data = await res.json()
      if (data.variation) onUpdate(data.variation)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${card}`}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ANGLE_ICONS[v.angle] || '📝'}</span>
          <span className={`text-sm font-semibold ${text}`}>{v.content_json.angleLabel || v.angle}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
            {v.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${sub}`}>v{v.version}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            {v.platform.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Preview or edit mode */}
      <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Primary Text</label>
              <textarea
                value={editFields.primaryText}
                onChange={e => setEditFields({ ...editFields, primaryText: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.primaryText.length > 125 ? 'text-red-500' : sub}`}>{editFields.primaryText.length}/125</p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Headline</label>
              <input
                value={editFields.headline}
                onChange={e => setEditFields({ ...editFields, headline: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.headline.length > 40 ? 'text-red-500' : sub}`}>{editFields.headline.length}/40</p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Description</label>
              <input
                value={editFields.description}
                onChange={e => setEditFields({ ...editFields, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.description.length > 30 ? 'text-red-500' : sub}`}>{editFields.description.length}/30</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>CTA</label>
                <select
                  value={editFields.cta}
                  onChange={e => setEditFields({ ...editFields, cta: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                >
                  {['Learn More', 'Get Quote', 'Book Now', 'Contact Us', 'Sign Up'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Targeting</label>
                <input
                  value={editFields.targetingNote}
                  onChange={e => setEditFields({ ...editFields, targetingNote: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { patchVariation({ content_json: editFields, status: 'approved' }); setEditing(false) }}
                disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save & Approve'}
              </button>
              <button
                onClick={() => { patchVariation({ content_json: editFields }); setEditing(false) }}
                disabled={saving}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
              >
                Save Draft
              </button>
              <button onClick={() => { setEditing(false); setEditFields(v.content_json) }} className={`px-3 py-1.5 text-xs ${sub} hover:underline`}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Meta ad preview mock */}
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <p className={`text-sm leading-relaxed ${text}`}>{v.content_json.primaryText}</p>
              <div className={`mt-3 border-t pt-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-xs uppercase tracking-wide ${sub}`}>stowstack.co</p>
                <p className={`font-semibold text-sm ${text}`}>{v.content_json.headline}</p>
                <p className={`text-xs ${sub}`}>{v.content_json.description}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {v.content_json.cta}
                </span>
                {v.content_json.targetingNote && (
                  <span className={`text-xs ${sub}`}>{v.content_json.targetingNote}</span>
                )}
              </div>
            </div>

            {/* Feedback display */}
            {v.feedback && (
              <div className={`mt-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-medium text-xs uppercase tracking-wide mb-1">Feedback</p>
                {v.feedback}
              </div>
            )}

            {/* Reject with feedback form */}
            {rejecting && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="What needs to change? Be specific so we can regenerate better copy..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { patchVariation({ status: 'rejected', feedback }); setRejecting(false); setFeedback('') }}
                    disabled={!feedback.trim() || saving}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-40"
                  >
                    {saving ? '...' : 'Reject with Notes'}
                  </button>
                  <button onClick={() => { setRejecting(false); setFeedback('') }} className={`px-3 py-1.5 text-xs ${sub} hover:underline`}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {v.status !== 'published' && !rejecting && (
              <div className="flex gap-2 mt-3">
                {v.status !== 'approved' && (
                  <button
                    onClick={() => patchVariation({ status: 'approved' })}
                    disabled={saving}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {saving ? '...' : 'Approve'}
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Edit
                </button>
                {v.status !== 'rejected' && (
                  <button
                    onClick={() => setRejecting(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                )}
                {v.status === 'approved' && (
                  <button
                    onClick={() => patchVariation({ status: 'draft' })}
                    disabled={saving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
                  >
                    Unapprove
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Creative Tab ── */

function CreativeTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => { if (data.variations) setVariations(data.variations) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function generateCopy(feedbackText?: string) {
    setGenerating(true)
    try {
      const body: Record<string, string> = { facilityId: facility.id }
      if (feedbackText) body.feedback = feedbackText

      const res = await fetch('/api/facility-creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.variations) setVariations(prev => [...data.variations, ...prev])
      setShowRegenInput(false)
      setRegenFeedback('')
    } finally {
      setGenerating(false)
    }
  }

  function handleUpdate(updated: AdVariation) {
    setVariations(prev => prev.map(v => v.id === updated.id ? updated : v))
  }

  const approved = variations.filter(v => v.status === 'approved' || v.status === 'published').length
  const total = variations.length

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-5">
      {/* Header with stats + generate button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${text}`}>Ad Variations</h3>
          {total > 0 && (
            <p className={`text-sm ${sub}`}>{approved}/{total} approved</p>
          )}
        </div>
        <div className="flex gap-2">
          {showRegenInput ? (
            <div className="flex items-end gap-2">
              <textarea
                value={regenFeedback}
                onChange={e => setRegenFeedback(e.target.value)}
                placeholder="Direction for new variations..."
                rows={2}
                className={`w-64 px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <button
                onClick={() => generateCopy(regenFeedback || undefined)}
                disabled={generating}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => { setShowRegenInput(false); setRegenFeedback('') }} className={`text-xs ${sub} hover:underline whitespace-nowrap`}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              {total > 0 && (
                <button
                  onClick={() => setShowRegenInput(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Regenerate with Notes
                </button>
              )}
              <button
                onClick={() => generateCopy()}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Generating...' : total > 0 ? 'Generate More' : 'Generate Ad Copy'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && !generating && (
        <div className={`text-center py-16 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <Sparkles size={32} className={`mx-auto mb-3 ${sub}`} />
          <p className={`font-medium ${text}`}>No ad variations yet</p>
          <p className={`text-sm ${sub} mt-1`}>Click "Generate Ad Copy" to create Meta ad variations using Claude AI</p>
        </div>
      )}

      {/* Version groups */}
      {total > 0 && (() => {
        const versions = [...new Set(variations.map(v => v.version))].sort((a, b) => b - a)
        return versions.map(ver => {
          const batch = variations.filter(v => v.version === ver)
          return (
            <div key={ver}>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-3`}>
                Version {ver} · {new Date(batch[0].created_at).toLocaleDateString()}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {batch.map(v => (
                  <VariationCard key={v.id} v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}

/* ── Stock Library Categories ── */

const STOCK_CATEGORIES = ['all', 'exterior', 'interior', 'moving', 'packing', 'lifestyle', 'vehicle'] as const

/* ── Assets Tab ── */

interface Asset {
  id: string
  facility_id: string
  created_at: string
  type: string
  source: string
  url: string
  metadata: Record<string, unknown> | null
}

function AssetsTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState(facility.website || '')
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ images?: { url: string; alt: string }[]; videos?: { url: string; type: string }[]; contact?: { phones: string[]; emails: string[] }; headings?: string[]; pagesScraped?: number; pagesCrawled?: string[]; pageCopy?: string[]; services?: { heading?: string; description?: string }[]; promotions?: { text: string }[] } | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState<string>('all')
  const [stockImages, setStockImages] = useState<{ id: string; url: string; alt: string; category: string }[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => { if (data.assets) setAssets(data.assets) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const res = await fetch(`/api/facility-assets?facilityId=${facility.id}&filename=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: {
            'X-Admin-Key': adminKey,
            'X-Facility-Id': facility.id,
            'X-Filename': file.name,
            'X-File-Type': file.type,
          },
          body: file,
        })
        const data = await res.json()
        if (data.asset) setAssets(prev => [data.asset, ...prev])
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  async function addStockImage(stockItem: { url: string; alt: string }) {
    try {
      const res = await fetch('/api/facility-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id,
          url: stockItem.url,
          type: 'photo',
          source: 'stock_library',
          metadata: { alt: stockItem.alt },
        }),
      })
      const data = await res.json()
      if (data.asset) setAssets(prev => [data.asset, ...prev])
    } catch (err) {
      console.error('Add stock image failed:', err)
    }
  }

  async function deleteAsset(assetId: string) {
    try {
      await fetch('/api/facility-assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ assetId }),
      })
      setAssets(prev => prev.filter(a => a.id !== assetId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  async function loadStockImages(cat: string) {
    setLibraryFilter(cat)
    setStockLoading(true)
    try {
      const res = await fetch(`/api/stock-images?category=${cat}`, { headers: { 'X-Admin-Key': adminKey } })
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch (err) {
      console.error('Stock image load failed:', err)
    } finally {
      setStockLoading(false)
    }
  }

  async function scrapeWebsite() {
    if (!scrapeUrl.trim()) return
    setScraping(true)
    setScrapeResult(null)
    try {
      const res = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ url: scrapeUrl.trim(), facilityId: facility.id }),
      })
      const data = await res.json()
      if (data.scraped) {
        setScrapeResult(data)
        // Refresh assets list since scraper saves images directly
        const assetsRes = await fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
        const assetsData = await assetsRes.json()
        if (assetsData.assets) setAssets(assetsData.assets)
      } else {
        setScrapeResult({ images: [], headings: [data.error || 'Scrape returned no data'] })
      }
    } catch (err) {
      console.error('Scrape failed:', err)
    } finally {
      setScraping(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  const photos = assets.filter(a => a.type === 'photo')
  const videoAssets = assets.filter(a => a.type === 'video')
  const documents = assets.filter(a => a.type === 'document')

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50'
            : darkMode ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files) }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
            <span className={text}>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-emerald-500' : sub}`} />
            <p className={`font-medium ${text}`}>Drop files here or click to upload</p>
            <p className={`text-sm ${sub} mt-1`}>Photos, videos, PDFs — any format</p>
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        {/* Website scraper */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
              <input
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="Enter facility website URL to scrape..."
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
            </div>
            <button
              onClick={scrapeWebsite}
              disabled={scraping || !scrapeUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
            >
              {scraping ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {scraping ? 'Scraping...' : 'Scrape Website'}
            </button>
          </div>
        </div>

        {/* Stock library toggle */}
        <button
          onClick={() => { const next = !showLibrary; setShowLibrary(next); if (next && !stockImages.length) loadStockImages('all') }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border ${
            showLibrary
              ? 'bg-emerald-600 text-white border-emerald-600'
              : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Image size={14} />
          Stock Library
        </button>
      </div>

      {/* Scrape results */}
      {scrapeResult && (
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${text}`}>
              Scraped from Website
              {scrapeResult.pagesScraped && <span className={`ml-2 text-xs font-normal ${sub}`}>({scrapeResult.pagesScraped} pages crawled)</span>}
            </h4>
            <button onClick={() => setScrapeResult(null)} className={`text-xs ${sub} hover:underline`}>Dismiss</button>
          </div>
          <div className={`border-t px-4 py-4 space-y-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {/* Images */}
            {scrapeResult.images && scrapeResult.images.length > 0 ? (
              <>
                <p className={`text-xs ${sub} mb-2`}>{scrapeResult.images.length} images found — already saved to assets</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {scrapeResult.images.slice(0, 24).map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.url} alt={img.alt || ''} className="h-20 w-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className={`text-sm ${sub}`}>No usable images found. The site may use JavaScript-rendered images that require a browser to load.</p>
            )}

            {/* Services discovered */}
            {scrapeResult.services && scrapeResult.services.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Services / Features Found:</p>
                <div className="flex flex-wrap gap-2">
                  {scrapeResult.services.slice(0, 12).map((s, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                      {s.heading || s.description?.slice(0, 60)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Promotions */}
            {scrapeResult.promotions && scrapeResult.promotions.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Promotions / Specials:</p>
                {scrapeResult.promotions.slice(0, 5).map((p, i) => (
                  <p key={i} className={`text-xs ${text} p-2 rounded-lg mb-1 ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>{p.text}</p>
                ))}
              </div>
            )}

            {/* Key copy */}
            {scrapeResult.pageCopy && scrapeResult.pageCopy.length > 0 && (
              <details className={`text-xs ${sub}`}>
                <summary className="font-medium cursor-pointer hover:underline">Site Copy ({scrapeResult.pageCopy.length} paragraphs extracted)</summary>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {scrapeResult.pageCopy.slice(0, 20).map((t, i) => (
                    <p key={i} className={`text-xs ${text} p-2 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>{t}</p>
                  ))}
                </div>
              </details>
            )}

            {/* Videos */}
            {scrapeResult.videos && scrapeResult.videos.length > 0 && (
              <div>
                <p className={`text-xs font-medium ${sub} mb-1`}>Videos found:</p>
                {scrapeResult.videos.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-500 hover:underline">
                    <Film size={12} /> {v.url.slice(0, 80)}...
                  </a>
                ))}
              </div>
            )}

            {/* Contact info */}
            {scrapeResult.contact && (scrapeResult.contact.phones.length > 0 || scrapeResult.contact.emails.length > 0) && (
              <div className="flex gap-4">
                {scrapeResult.contact.phones.length > 0 && (
                  <div>
                    <p className={`text-xs font-medium ${sub} mb-1`}>Phones:</p>
                    {scrapeResult.contact.phones.map((p, i) => <p key={i} className={`text-xs ${text}`}>{p}</p>)}
                  </div>
                )}
                {scrapeResult.contact.emails.length > 0 && (
                  <div>
                    <p className={`text-xs font-medium ${sub} mb-1`}>Emails:</p>
                    {scrapeResult.contact.emails.map((e, i) => <p key={i} className={`text-xs ${text}`}>{e}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Pages crawled */}
            {scrapeResult.pagesCrawled && scrapeResult.pagesCrawled.length > 1 && (
              <details className={`text-xs ${sub}`}>
                <summary className="font-medium cursor-pointer hover:underline">Pages crawled ({scrapeResult.pagesCrawled.length})</summary>
                <div className="mt-1 space-y-0.5">
                  {scrapeResult.pagesCrawled.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-emerald-500 hover:underline truncate">{url}</a>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Stock library */}
      {showLibrary && (
        <div className={`border rounded-xl overflow-hidden ${card}`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${text}`}>Stock Library — Self-Storage Images</h4>
            <div className="flex gap-1 flex-wrap">
              {STOCK_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => loadStockImages(cat)}
                  className={`px-2 py-1 text-xs rounded-md ${
                    libraryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {stockLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-emerald-500" /></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {stockImages.map(stock => {
                  const alreadyAdded = assets.some(a => a.url === stock.url)
                  return (
                    <div key={stock.id} className="relative group">
                      <img src={stock.url} alt={stock.alt} className="h-24 w-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        {alreadyAdded ? (
                          <span className="text-xs text-white font-medium">Added</span>
                        ) : (
                          <button
                            onClick={() => addStockImage(stock)}
                            className="px-2 py-1 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      <p className={`text-xs ${sub} mt-1 truncate`}>{stock.alt}</p>
                    </div>
                  )
                })}
                {stockImages.length === 0 && (
                  <p className={`col-span-6 text-center text-xs ${sub} py-4`}>No images found for this category.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset grid */}
      {assets.length > 0 && (
        <div className="space-y-4">
          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Photos</h4>
                <span className={`text-xs ${sub}`}>({photos.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map(asset => (
                  <div key={asset.id} className="relative group">
                    <img src={asset.url} alt="" className="h-32 w-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">No preview</text></svg>' }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                      <div className="flex gap-1 w-full">
                        <span className={`flex-1 text-xs text-white/80 truncate`}>
                          {asset.source === 'uploaded' ? 'Uploaded' : asset.source === 'website_scrape' ? 'Scraped' : asset.source === 'stock_library' ? 'Stock' : asset.source}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteAsset(asset.id) }}
                          className="p-1 bg-red-600/80 rounded hover:bg-red-600 text-white"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videoAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Film size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Videos</h4>
                <span className={`text-xs ${sub}`}>({videoAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {videoAssets.map(asset => (
                  <div key={asset.id} className={`relative border rounded-lg overflow-hidden ${card}`}>
                    <video src={asset.url} className="h-32 w-full object-cover" preload="metadata" />
                    <div className="p-2 flex items-center justify-between">
                      <span className={`text-xs ${sub} truncate`}>{(asset.metadata as { filename?: string })?.filename || 'Video'}</span>
                      <button onClick={() => deleteAsset(asset.id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className={sub} />
                <h4 className={`text-sm font-semibold ${text}`}>Documents</h4>
                <span className={`text-xs ${sub}`}>({documents.length})</span>
              </div>
              <div className="space-y-2">
                {documents.map(asset => (
                  <div key={asset.id} className={`flex items-center gap-3 p-3 border rounded-lg ${card}`}>
                    <FileText size={18} className={sub} />
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className={`flex-1 text-sm ${text} hover:underline truncate`}>
                      {(asset.metadata as { filename?: string })?.filename || 'Document'}
                    </a>
                    <span className={`text-xs ${sub}`}>{asset.source}</span>
                    <button onClick={() => deleteAsset(asset.id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && !scrapeResult && !showLibrary && (
        <div className={`text-center py-8 ${sub}`}>
          <p className="text-sm">No assets yet. Upload files, scrape a website, or browse the stock library to get started.</p>
        </div>
      )}
    </div>
  )
}

/* ── Facility Detail View ── */

function FacilityDetail({ facility, adminKey, darkMode, onBack, onStatusChange }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
  onBack: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [subTab, setSubTab] = useState<FacilitySubTab>('overview')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    try {
      await fetch('/api/admin-facilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: facility.id, status }),
      })
      onStatusChange(facility.id, status)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back + facility header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className={`mt-1 p-1 rounded-lg hover:bg-slate-100 ${darkMode ? 'hover:bg-slate-800' : ''}`}>
          <ArrowLeft size={18} className={sub} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className={`text-xl font-bold ${text}`}>{facility.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[facility.status] || 'bg-slate-100 text-slate-600'}`}>
              {facility.status}
            </span>
            {facility.google_rating && (
              <span className="text-sm font-semibold text-amber-500">★ {facility.google_rating} ({facility.review_count})</span>
            )}
          </div>
          <p className={`text-sm ${sub} mt-0.5`}>{facility.location}</p>
        </div>
        {/* Status dropdown */}
        <select
          value={facility.status}
          onChange={e => updateStatus(e.target.value)}
          disabled={updatingStatus}
          className={`text-xs px-3 py-1.5 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} disabled:opacity-40`}
        >
          {FACILITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Sub-tab bar */}
      <div className={`flex gap-1 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {([
          ['overview', 'Overview'],
          ['creative', 'Creative'],
          ['assets', 'Assets'],
          ['ad-preview', 'Ad Preview'],
          ['publish', 'Publish'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === id
                ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'overview' && (
        <div className={`border rounded-xl ${card}`}>
          <div className="p-5 space-y-5">
            {/* Contact + facility info + Google */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Contact</p>
                <div className="space-y-1">
                  <p className={text}>{facility.contact_name}</p>
                  <p className={`flex items-center gap-1.5 ${sub}`}><Mail size={13} />{facility.contact_email}</p>
                  <p className={`flex items-center gap-1.5 ${sub}`}><Phone size={13} />{facility.contact_phone}</p>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Facility Info</p>
                <div className="space-y-1">
                  <p className={text}>Occupancy: {facility.occupancy_range}</p>
                  <p className={text}>Units: {facility.total_units}</p>
                  <p className={text}>Issue: {facility.biggest_issue}</p>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Google Data</p>
                {facility.google_address ? (
                  <div className="space-y-1">
                    <p className={sub}>{facility.google_address}</p>
                    <div className="flex gap-2">
                      {facility.website && <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Website ↗</a>}
                      {facility.google_maps_url && <a href={facility.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Maps ↗</a>}
                    </div>
                  </div>
                ) : <p className={sub}>Not scraped yet</p>}
              </div>
            </div>

            {/* Notes */}
            {facility.notes && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-1`}>Notes</p>
                <p className={`text-sm ${text}`}>{facility.notes}</p>
              </div>
            )}

            {/* Photos */}
            {facility.photos && facility.photos.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Photos</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {facility.photos.map(photo => (
                    <img key={photo.index} src={photo.url} alt="" className="h-24 w-36 object-cover rounded-lg shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {facility.reviews && facility.reviews.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Top Reviews</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facility.reviews.map((r, i) => (
                    <div key={i} className={`text-sm p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                        <span className={`font-medium ${text}`}>{r.author}</span>
                        <span className={`text-xs ${sub}`}>{r.time}</span>
                      </div>
                      <p className={sub}>{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className={`text-xs ${sub}`}>Added {new Date(facility.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {subTab === 'creative' && (
        <CreativeTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'assets' && (
        <AssetsTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}

      {subTab === 'ad-preview' && (
        <AdPreviewTab facility={facility} adminKey={adminKey} darkMode={darkMode} onPublish={() => setSubTab('publish')} />
      )}

      {subTab === 'publish' && (
        <PublishTab facility={facility} adminKey={adminKey} darkMode={darkMode} />
      )}
    </div>
  )
}

/* ── Publish Tab ── */

interface PlatformInfo {
  id: string
  name: string
  description: string
  configured: boolean
  connectUrl: string | null
  icon: string
}

interface PlatformConnection {
  id: string
  facility_id: string
  platform: string
  status: string
  account_id: string | null
  account_name: string | null
  page_id: string | null
  page_name: string | null
  created_at: string
  updated_at: string
  token_expires_at: string | null
  metadata: Record<string, unknown> | null
}

interface PublishLogEntry {
  id: string
  facility_id: string
  variation_id: string
  connection_id: string
  platform: string
  status: string
  external_id: string | null
  external_url: string | null
  error_message: string | null
  created_at: string
  content_json: Record<string, string> | null
  angle: string | null
  ad_platform: string | null
}

function PublishTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [publishLog, setPublishLog] = useState<PublishLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    Promise.all([
      fetch(`/api/platform-connections?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/publish-ad?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([connData, creativeData, assetData, logData]) => {
      if (connData.platforms) setPlatforms(connData.platforms)
      if (connData.connections) {
        setConnections(connData.connections)
        const firstConnected = connData.connections.find((c: PlatformConnection) => c.status === 'connected')
        if (firstConnected) setSelectedConnection(firstConnected.id)
      }
      if (creativeData.variations) {
        const approved = creativeData.variations.filter((v: AdVariation) => v.status === 'approved' || v.status === 'published')
        setVariations(approved)
        if (approved.length) setSelectedVariation(approved[0].id)
      }
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length) setSelectedImage(photos[0].url)
      }
      if (logData.logs) setPublishLog(logData.logs)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  function getConnection(platform: string) {
    return connections.find(c => c.platform === platform && c.status === 'connected')
  }

  async function disconnect(connectionId: string) {
    setDisconnecting(connectionId)
    try {
      await fetch('/api/platform-connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ connectionId }),
      })
      setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'disconnected' } : c))
    } catch {} finally {
      setDisconnecting(null)
    }
  }

  async function publishAd() {
    if (!selectedVariation || !selectedConnection) return
    setPublishing(selectedVariation)
    setPublishError(null)
    setPublishSuccess(null)
    try {
      const res = await fetch('/api/publish-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          variationId: selectedVariation,
          connectionId: selectedConnection,
          imageUrl: selectedImage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPublishSuccess(data.externalUrl ? `Ad published! View in Ads Manager →` : 'Ad published successfully!')
        // Refresh publish log
        const logRes = await fetch(`/api/publish-ad?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
        const logData = await logRes.json()
        if (logData.logs) setPublishLog(logData.logs)
      } else {
        setPublishError(data.details || data.error || 'Publishing failed — check Ads Manager for details.')
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Network error — could not reach publish API.')
    } finally {
      setPublishing(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  const connectedPlatforms = connections.filter(c => c.status === 'connected')

  return (
    <div className="space-y-6">
      {/* Platform Connections */}
      <div>
        <h4 className={`text-sm font-semibold ${text} mb-3`}>Platform Connections</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {platforms.map(platform => {
            const conn = getConnection(platform.id)
            return (
              <div key={platform.id} className={`border rounded-xl p-4 ${card}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                    platform.id === 'meta' ? 'bg-blue-600' : 'bg-red-500'
                  }`}>
                    {platform.id === 'meta' ? 'M' : 'G'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${text}`}>{platform.name}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>{platform.description}</p>

                    {conn ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className={`text-xs font-medium text-emerald-500`}>Connected</span>
                        </div>
                        {conn.account_name && (
                          <p className={`text-xs ${sub}`}>Account: {conn.account_name}</p>
                        )}
                        {conn.page_name && (
                          <p className={`text-xs ${sub}`}>Page: {conn.page_name}</p>
                        )}
                        {conn.token_expires_at && (
                          <p className={`text-[10px] ${sub}`}>
                            Token expires: {new Date(conn.token_expires_at).toLocaleDateString()}
                          </p>
                        )}
                        <button
                          onClick={() => disconnect(conn.id)}
                          disabled={disconnecting === conn.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-40"
                        >
                          {disconnecting === conn.id ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {platform.configured ? (
                          <a
                            href={platform.connectUrl || '#'}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                          >
                            Connect {platform.id === 'meta' ? 'Facebook' : 'Google'} Account
                          </a>
                        ) : (
                          <div className={`p-3 rounded-lg border border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                            <p className={`text-xs ${sub}`}>
                              {platform.id === 'meta'
                                ? 'Requires META_APP_ID and META_APP_SECRET environment variables.'
                                : 'Requires GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN environment variables.'}
                            </p>
                            <p className={`text-[10px] ${sub} mt-1`}>Add these in Vercel → Settings → Environment Variables</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Publish Controls */}
      {connectedPlatforms.length > 0 && variations.length > 0 && (
        <div className={`border rounded-xl p-5 ${card}`}>
          <h4 className={`text-sm font-semibold ${text} mb-4`}>Publish an Ad</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Select variation */}
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Ad Copy</label>
              <select
                value={selectedVariation || ''}
                onChange={e => setSelectedVariation(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {variations.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.content_json.angleLabel || v.angle} — {v.content_json.headline?.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>

            {/* Select platform connection */}
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Platform</label>
              <select
                value={selectedConnection || ''}
                onChange={e => setSelectedConnection(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="">Select platform...</option>
                {connectedPlatforms.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.platform === 'meta' ? 'Meta' : 'Google Ads'} — {c.account_name || c.account_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Select image */}
            <div>
              <label className={`text-xs font-medium ${sub} block mb-1.5`}>Image</label>
              <select
                value={selectedImage || ''}
                onChange={e => setSelectedImage(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="">No image</option>
                {assets.map((a, i) => (
                  <option key={a.id} value={a.url}>
                    {a.source === 'website_scrape' ? 'Scraped' : a.source === 'stock_library' ? 'Stock' : 'Uploaded'} image {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={publishAd}
                disabled={!selectedVariation || !selectedConnection || !!publishing}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {publishing ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing...</>
                ) : (
                  <><Send size={14} /> Publish Ad</>
                )}
              </button>
              {selectedImage && (
                <img src={selectedImage} alt="" className="h-10 w-16 object-cover rounded" />
              )}
            </div>
            <p className={`text-xs ${sub}`}>
              Ad will be created as <span className="font-semibold">PAUSED</span> in Ads Manager. Review targeting and budget there, then activate when ready.
            </p>
            {publishError && (
              <div className={`p-3 rounded-lg border text-sm ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-medium text-xs mb-1">Publish Failed</p>
                <p className="text-xs">{publishError}</p>
              </div>
            )}
            {publishSuccess && (
              <div className={`p-3 rounded-lg border text-sm ${darkMode ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-xs">{publishSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No approved variations message */}
      {connectedPlatforms.length > 0 && variations.length === 0 && (
        <div className={`text-center py-6 border rounded-xl ${card}`}>
          <p className={`text-sm ${sub}`}>No approved ad variations yet. Go to the Creative tab to approve some ads first.</p>
        </div>
      )}

      {/* Publish History */}
      {publishLog.length > 0 && (
        <div>
          <h4 className={`text-sm font-semibold ${text} mb-3`}>Publish History</h4>
          <div className="space-y-2">
            {publishLog.map(log => (
              <div key={log.id} className={`flex items-center gap-3 p-3 border rounded-lg ${card}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                  log.platform === 'meta' ? 'bg-blue-600' : 'bg-red-500'
                }`}>
                  {log.platform === 'meta' ? 'M' : 'G'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${text}`}>
                    {log.content_json?.headline || log.angle || 'Ad variation'}
                  </p>
                  <p className={`text-[10px] ${sub}`}>
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  log.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {log.status}
                </span>
                {log.external_url && (
                  <a href={log.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">
                    View ↗
                  </a>
                )}
                {log.error_message && (
                  <span className={`text-[10px] text-red-500 max-w-[200px] truncate`} title={log.error_message}>
                    {log.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Ad Preview Tab ── */

type AdFormat = 'instagram_post' | 'instagram_story' | 'google_display' | 'facebook_feed'

const AD_FORMATS: { id: AdFormat; label: string; width: number; height: number }[] = [
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { id: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { id: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { id: 'google_display', label: 'Google Display', width: 300, height: 250 },
]

function AdPreviewTab({ facility, adminKey, darkMode, onPublish }: { facility: Facility; adminKey: string; darkMode: boolean; onPublish: () => void }) {
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [stockImages, setStockImages] = useState<{ id: string; url: string; alt: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariation, setSelectedVariation] = useState<AdVariation | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeFormat, setActiveFormat] = useState<AdFormat>('instagram_post')
  const [stockCategory, setStockCategory] = useState('all')
  const [imageSource, setImageSource] = useState<'assets' | 'stock'>('assets')

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    Promise.all([
      fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/facility-assets?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/stock-images?category=all`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([creativeData, assetData, stockData]) => {
      if (creativeData.variations?.length) {
        setVariations(creativeData.variations)
        setSelectedVariation(creativeData.variations[0])
      }
      if (assetData.assets) {
        const photos = assetData.assets.filter((a: Asset) => a.type === 'photo')
        setAssets(photos)
        if (photos.length > 0) setSelectedImage(photos[0].url)
      }
      if (stockData.images) setStockImages(stockData.images)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function loadStockCategory(cat: string) {
    setStockCategory(cat)
    try {
      const res = await fetch(`/api/stock-images?category=${cat}`, { headers: { 'X-Admin-Key': adminKey } })
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch {}
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  if (!variations.length) {
    return (
      <div className={`text-center py-12 border rounded-xl ${card}`}>
        <p className={`text-sm ${sub}`}>No ad copy generated yet. Go to the Creative tab first to generate ad variations.</p>
      </div>
    )
  }

  const copy = selectedVariation?.content_json || {}
  const availableImages = imageSource === 'assets'
    ? assets.map(a => ({ id: a.id, url: a.url, alt: '' }))
    : stockImages.filter(s => stockCategory === 'all' || s.category === stockCategory)

  return (
    <div className="space-y-6">
      {/* Format selector */}
      <div className="flex flex-wrap gap-2">
        {AD_FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFormat(f.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
              activeFormat === f.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-[10px] ${activeFormat === f.id ? 'text-emerald-100' : sub}`}>
              {f.width}x{f.height}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ad Preview */}
        <div className="space-y-4">
          <h4 className={`text-sm font-semibold ${text}`}>Preview</h4>
          <div className="flex justify-center">
            <AdMockup
              format={activeFormat}
              image={selectedImage}
              copy={copy}
              facilityName={facility.name}
              darkMode={darkMode}
            />
          </div>
          <button
            onClick={onPublish}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            <Send size={14} /> Publish This Ad
          </button>
        </div>

        {/* Right: Controls */}
        <div className="space-y-5">
          {/* Copy variation selector */}
          <div>
            <h4 className={`text-sm font-semibold ${text} mb-2`}>Ad Copy</h4>
            <div className="space-y-2">
              {variations.filter(v => v.status !== 'rejected').map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariation(v)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    selectedVariation?.id === v.id
                      ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                      : card
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {v.content_json.angleLabel || v.angle}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[v.status] || ''}`}>{v.status}</span>
                  </div>
                  <p className={`text-xs font-medium ${text} truncate`}>{v.content_json.headline}</p>
                  <p className={`text-[11px] ${sub} line-clamp-2 mt-0.5`}>{v.content_json.primaryText}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Image selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className={`text-sm font-semibold ${text}`}>Image</h4>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => setImageSource('assets')}
                  className={`px-2 py-1 text-[11px] rounded ${imageSource === 'assets' ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Facility ({assets.length})
                </button>
                <button
                  onClick={() => setImageSource('stock')}
                  className={`px-2 py-1 text-[11px] rounded ${imageSource === 'stock' ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Stock
                </button>
              </div>
            </div>

            {imageSource === 'stock' && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {['all', 'exterior', 'interior', 'moving', 'packing', 'lifestyle', 'vehicle'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => loadStockCategory(cat)}
                    className={`px-2 py-0.5 text-[10px] rounded ${
                      stockCategory === cat ? 'bg-emerald-600 text-white' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {availableImages.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative rounded-lg overflow-hidden ${
                    selectedImage === img.url ? 'ring-2 ring-emerald-500' : ''
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="h-16 w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </button>
              ))}
              {availableImages.length === 0 && (
                <p className={`col-span-4 text-center text-xs ${sub} py-4`}>
                  {imageSource === 'assets' ? 'No facility photos. Scrape the website or upload images in the Assets tab.' : 'Loading stock images...'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Ad Mockup Renderer ── */

function AdMockup({ format, image, copy, facilityName, darkMode }: {
  format: AdFormat
  image: string | null
  copy: Record<string, string>
  facilityName: string
  darkMode: boolean
}) {
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const headline = copy.headline || 'Your Headline Here'
  const primaryText = copy.primaryText || 'Your ad copy will appear here.'
  const description = copy.description || ''
  const cta = copy.cta || 'Learn More'

  if (format === 'instagram_story') {
    return (
      <div className="w-[270px] h-[480px] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex-shrink-0">
        {/* Background image */}
        {image ? (
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Story progress bars */}
        <div className="absolute top-2 left-3 right-3 flex gap-1">
          <div className="h-0.5 flex-1 bg-white/60 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/30 rounded-full" />
        </div>
        {/* Sponsored tag */}
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">SS</div>
          <div>
            <p className="text-white text-[10px] font-semibold">{facilityName}</p>
            <p className="text-white/60 text-[8px]">Sponsored</p>
          </div>
        </div>
        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <p className="text-white text-sm font-bold leading-tight">{headline}</p>
          <p className="text-white/80 text-[11px] leading-relaxed line-clamp-3">{primaryText}</p>
          {/* Swipe up CTA */}
          <div className="flex justify-center pt-2">
            <div className="bg-white rounded-full px-5 py-1.5 text-[10px] font-bold text-black">{cta}</div>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'instagram_post') {
    return (
      <div className={`w-[320px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Instagram header */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">SS</div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{facilityName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sponsored</p>
          </div>
          <MoreHorizontal size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
        </div>
        {/* Image */}
        <div className="w-full aspect-square bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={32} className={sub} />
            </div>
          )}
          {/* Headline overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-white text-base font-bold">{headline}</p>
          </div>
        </div>
        {/* Engagement bar */}
        <div className={`flex items-center gap-4 px-3 py-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Heart size={20} />
          <MessageCircle size={20} />
          <Send size={20} />
          <div className="flex-1" />
          <Bookmark size={20} />
        </div>
        {/* Caption */}
        <div className="px-3 pb-3">
          <p className={`text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <span className="font-semibold">{facilityName.toLowerCase().replace(/\s+/g, '')} </span>
            {primaryText}
          </p>
          {description && <p className={`text-[10px] ${sub} mt-1`}>{description}</p>}
          <div className="mt-2">
            <span className="inline-block bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1 rounded">{cta}</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'facebook_feed') {
    return (
      <div className={`w-[400px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* FB header */}
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">SS</div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{facilityName}</p>
            <p className={`text-[11px] ${sub}`}>Sponsored · <Globe size={10} className="inline" /></p>
          </div>
          <MoreHorizontal size={18} className={sub} />
        </div>
        {/* Primary text */}
        <div className="px-3 pb-2">
          <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{primaryText}</p>
        </div>
        {/* Image */}
        <div className="w-full aspect-[1.91/1] bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={32} className={sub} />
            </div>
          )}
        </div>
        {/* Link preview bar */}
        <div className={`px-3 py-2 border-t ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          <p className={`text-[10px] uppercase ${sub}`}>stowstack.co</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} truncate`}>{headline}</p>
          <p className={`text-xs ${sub} truncate`}>{description}</p>
        </div>
        {/* CTA button */}
        <div className={`px-3 py-2 border-t flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <button className={`px-4 py-1.5 text-xs font-semibold rounded ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'}`}>{cta}</button>
          <div className={`flex gap-4 ${sub}`}>
            <span className="text-xs">👍 Like</span>
            <span className="text-xs">💬 Comment</span>
            <span className="text-xs">↗ Share</span>
          </div>
        </div>
      </div>
    )
  }

  if (format === 'google_display') {
    return (
      <div className={`w-[300px] border rounded-lg overflow-hidden shadow-2xl flex-shrink-0 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Image */}
        <div className="w-full h-[150px] bg-slate-200 relative">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Image size={24} className={sub} />
            </div>
          )}
          {/* Ad label */}
          <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded">Ad</div>
        </div>
        {/* Content */}
        <div className="p-3 space-y-1.5">
          <p className={`text-sm font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{headline}</p>
          <p className={`text-[11px] ${sub} line-clamp-2`}>{description || primaryText}</p>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] ${sub}`}>{facilityName}</span>
            <button className="bg-blue-600 text-white text-[10px] font-semibold px-3 py-1 rounded">{cta}</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/* ── Facilities List + Detail Router ── */

function FacilitiesView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  useEffect(() => {
    fetch('/api/admin-facilities', { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.facilities) setFacilities(data.facilities)
        else setError(data.error || 'Failed to load facilities')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [adminKey])

  function handleStatusChange(id: string, status: string) {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>
  if (facilities.length === 0) return <div className="text-center py-20 text-slate-400">No facilities yet. Submit an audit request to get started.</div>

  // Detail view
  const selected = facilities.find(f => f.id === selectedId)
  if (selected) {
    return (
      <FacilityDetail
        facility={selected}
        adminKey={adminKey}
        darkMode={darkMode}
        onBack={() => setSelectedId(null)}
        onStatusChange={handleStatusChange}
      />
    )
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className={`text-lg font-semibold ${text}`}>Facilities <span className={`text-sm font-normal ${sub}`}>({facilities.length})</span></h2>
      </div>

      {/* Summary table */}
      <div className={`border rounded-xl overflow-hidden ${card}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
              <th className={`text-left px-4 py-3 font-medium ${sub}`}>Facility</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden sm:table-cell`}>Location</th>
              <th className={`text-left px-4 py-3 font-medium ${sub}`}>Status</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden md:table-cell`}>Rating</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden lg:table-cell`}>Occupancy</th>
              <th className={`text-left px-4 py-3 font-medium ${sub} hidden lg:table-cell`}>Units</th>
              <th className={`text-right px-4 py-3 font-medium ${sub}`}></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(f => (
              <tr
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`border-t cursor-pointer transition-colors ${
                  darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <td className={`px-4 py-3 font-medium ${text}`}>{f.name}</td>
                <td className={`px-4 py-3 ${sub} hidden sm:table-cell`}>{f.location}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>
                    {f.status}
                  </span>
                </td>
                <td className={`px-4 py-3 hidden md:table-cell ${f.google_rating ? 'text-amber-500 font-semibold' : sub}`}>
                  {f.google_rating ? `★ ${f.google_rating}` : '—'}
                </td>
                <td className={`px-4 py-3 ${sub} hidden lg:table-cell`}>{f.occupancy_range || '—'}</td>
                <td className={`px-4 py-3 ${sub} hidden lg:table-cell`}>{f.total_units || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={16} className={sub} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminDashboardInner({ adminKey, onBack, onLogout }: { adminKey: string; onBack: () => void; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('pipeline')
  const [leads, setLeads] = useState<Lead[]>([])
  const [auditCount, setAuditCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [newNote, setNewNote] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [leadScores, setLeadScores] = useState<Record<string, { score: number; grade: string; breakdown: Record<string, number> }>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('stowstack_theme') === 'dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; detail: string; timestamp: string }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)

  const fetchLeads = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin-leads', {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.status === 401) { onLogout(); return }
      if (!res.ok) throw new Error(`Failed to fetch leads (${res.status})`)
      const data = await res.json()
      setLeads(data.leads || [])
      setAuditCount(data.auditCount || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [adminKey, onLogout])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Fetch lead scores
  useEffect(() => {
    if (leads.length === 0) return
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/lead-score', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setLeadScores(data.scores || {})
        }
      } catch { /* silent */ }
    }
    fetchScores()
  }, [leads, adminKey])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch { /* silent */ }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [adminKey])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('stowstack_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K: command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowNotifications(false)
        setShowShortcuts(false)
      }
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      // 1-6 for tabs
      if (e.key === '1') setActiveTab('pipeline')
      if (e.key === '2') setActiveTab('kanban')
      if (e.key === '3') setActiveTab('portfolio')
      if (e.key === '4') setActiveTab('insights')
      if (e.key === '5') setActiveTab('billing')
      if (e.key === '6') setActiveTab('settings')
      if (e.key === 'r') { setLoading(true); fetchLeads() }
      if (e.key === 'n') setShowNotifications(prev => !prev)
      if (e.key === '?') setShowShortcuts(prev => !prev)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchLeads])

  const markNotificationsRead = async () => {
    try {
      await fetch('/api/notifications?markSeen=true', { headers: { 'X-Admin-Key': adminKey } })
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const updateLead = async (id: string, updates: { status?: string; note?: string; followUpDate?: string }) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchLeads()
      if (updates.note) setNewNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const bulkApply = async () => {
    if (!bulkStatus || selectedIds.size === 0) return
    setBulkUpdating(true)
    for (const id of selectedIds) {
      try {
        await fetch('/api/admin-leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, status: bulkStatus }),
        })
      } catch { /* continue */ }
    }
    setSelectedIds(new Set())
    setBulkStatus('')
    setBulkUpdating(false)
    fetchLeads()
  }

  const downloadCsv = async () => {
    try {
      const res = await fetch('/api/export-leads', { headers: { 'X-Admin-Key': adminKey } })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stowstack-leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  /* ── Filtered leads ── */
  const now = new Date()
  const isOverdue = (l: Lead) => l.followUpDate && new Date(l.followUpDate) < now && !['lost', 'client_signed'].includes(l.status)
  const overdueCount = leads.filter(isOverdue).length

  const filtered = leads
    .filter(l => {
      if (filterStatus === 'overdue') return isOverdue(l)
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          l.name.toLowerCase().includes(q) ||
          l.facilityName.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      // Overdue leads sort to top
      const aOverdue = isOverdue(a) ? 0 : 1
      const bOverdue = isOverdue(b) ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  /* ── Pipeline counts ── */
  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const activeLeads = leads.filter(l => !['lost', 'client_signed'].includes(l.status)).length

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className={`p-2 -ml-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StowStack Admin</h1>
              <p className={`text-xs -mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage leads & campaign performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              title="Search (Cmd+K)"
            >
              <Search size={12} />
              <span>Search...</span>
              <kbd className={`text-[10px] px-1 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>⌘K</kbd>
            </button>
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markNotificationsRead() }}
                className={`p-2 rounded-lg transition-colors relative ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                title="Notifications (N)"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  darkMode={darkMode}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-amber-400 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={downloadCsv} className={`flex items-center gap-1.5 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`} title="Export leads as CSV">
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => { setLoading(true); fetchLeads() }} className={`flex items-center gap-2 text-sm transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={onLogout} className={`text-sm transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
              Sign out
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px overflow-x-auto">
          {([
            ['pipeline', 'Pipeline', Users],
            ['kanban', 'Kanban', Columns3],
            ['portfolio', 'Portfolio', BarChart3],
            ['insights', 'Insights', TrendingUp],
            ['billing', 'Billing', CreditCard],
            ['settings', 'Settings', Settings],
            ['facilities', 'Facilities', Building2],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                  : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:border-slate-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          query={commandQuery}
          onQueryChange={setCommandQuery}
          leads={leads}
          darkMode={darkMode}
          onClose={() => { setShowCommandPalette(false); setCommandQuery('') }}
          onSelectLead={(id) => { setExpandedId(id); setActiveTab('pipeline'); setShowCommandPalette(false); setCommandQuery('') }}
          onAction={(action) => {
            if (action === 'pipeline') setActiveTab('pipeline')
            if (action === 'kanban') setActiveTab('kanban')
            if (action === 'portfolio') setActiveTab('portfolio')
            if (action === 'insights') setActiveTab('insights')
            if (action === 'billing') setActiveTab('billing')
            if (action === 'settings') setActiveTab('settings')
            if (action === 'dark') setDarkMode(!darkMode)
            if (action === 'csv') downloadCsv()
            if (action === 'refresh') { setLoading(true); fetchLeads() }
            setShowCommandPalette(false)
            setCommandQuery('')
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <ShortcutsModal darkMode={darkMode} onClose={() => setShowShortcuts(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'portfolio' && (
          <PortfolioView leads={leads} adminKey={adminKey} loading={loading} darkMode={darkMode} />
        )}

        {activeTab === 'insights' && (
          <InsightsView adminKey={adminKey} leads={leads} darkMode={darkMode} />
        )}

        {activeTab === 'kanban' && (
          <KanbanView leads={leads} onUpdateStatus={(id, status) => updateLead(id, { status })} onSelectLead={setExpandedId} darkMode={darkMode} loading={loading} />
        )}

        {activeTab === 'billing' && (
          <BillingView adminKey={adminKey} leads={leads} darkMode={darkMode} />
        )}

        {activeTab === 'settings' && (
          <SettingsView adminKey={adminKey} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
        )}

        {activeTab === 'facilities' && (
          <FacilitiesView adminKey={adminKey} darkMode={darkMode} />
        )}

        {activeTab === 'pipeline' && (<>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Total Leads" value={leads.length} />
          <StatCard icon={TrendingUp} label="Active Pipeline" value={activeLeads} />
          <StatCard icon={CheckCircle2} label="Signed Clients" value={statusCounts['client_signed'] || 0} accent />
          <StatCard icon={Clock} label="Audits Generated" value={auditCount} />
        </div>

        {/* Pipeline Stages */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <PipelineChip
              label="All"
              count={leads.length}
              active={filterStatus === 'all'}
              onClick={() => setFilterStatus('all')}
            />
            {STATUSES.map(s => (
              <PipelineChip
                key={s.value}
                label={s.label}
                count={statusCounts[s.value] || 0}
                active={filterStatus === s.value}
                onClick={() => setFilterStatus(s.value)}
                colorClass={s.color}
              />
            ))}
            {overdueCount > 0 && (
              <PipelineChip
                label="Overdue"
                count={overdueCount}
                active={filterStatus === 'overdue'}
                onClick={() => setFilterStatus('overdue')}
                colorClass="bg-red-100 text-red-700"
              />
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, facility, location, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4 flex items-center gap-2">
            <XCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading leads...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No leads yet</p>
            <p className="text-sm mt-1">Leads from the audit form will appear here</p>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <CheckSquare size={16} />
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
            >
              <option value="">Move to...</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={bulkApply}
              disabled={!bulkStatus || bulkUpdating}
              className="text-xs px-3 py-1.5 bg-emerald-600 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkUpdating ? 'Applying...' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white ml-auto"
            >
              Clear
            </button>
          </div>
        )}

        {/* Lead Cards */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                expanded={expandedId === lead.id}
                onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                onUpdateStatus={(status) => updateLead(lead.id, { status })}
                onAddNote={(note) => updateLead(lead.id, { note })}
                onSetFollowUp={(date) => updateLead(lead.id, { followUpDate: date })}
                newNote={expandedId === lead.id ? newNote : ''}
                onNewNoteChange={setNewNote}
                updating={updating === lead.id}
                adminKey={adminKey}
                score={leadScores[lead.id]}
                selected={selectedIds.has(lead.id)}
                onSelect={() => toggleSelect(lead.id)}
                isOverdue={isOverdue(lead)}
              />
            ))}
          </div>
        )}
        </>)}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  PORTFOLIO VIEW                                          */
/* ═══════════════════════════════════════════════════════ */

interface ClientPortfolioData {
  lead: Lead
  campaigns: CampaignEntry[]
  totals: { spend: number; leads: number; moveIns: number }
  avgCpl: number
  latestRoas: number
}

function PortfolioView({ leads, adminKey, loading, darkMode }: { leads: Lead[]; adminKey: string; loading: boolean; darkMode?: boolean }) {
  const [clientData, setClientData] = useState<ClientPortfolioData[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetched, setFetched] = useState(false)

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  const fetchAllCampaigns = useCallback(async () => {
    if (signedClients.length === 0) return
    setFetching(true)
    const results: ClientPortfolioData[] = []

    for (const lead of signedClients) {
      try {
        const res = await fetch(`/api/client-campaigns?code=${lead.accessCode}`, {
          headers: { 'X-Admin-Key': adminKey },
        })
        if (res.ok) {
          const data = await res.json()
          const campaigns: CampaignEntry[] = data.campaigns || []
          const totals = campaigns.reduce((acc, c) => ({
            spend: acc.spend + c.spend,
            leads: acc.leads + c.leads,
            moveIns: acc.moveIns + c.moveIns,
          }), { spend: 0, leads: 0, moveIns: 0 })
          results.push({
            lead,
            campaigns,
            totals,
            avgCpl: totals.leads > 0 ? totals.spend / totals.leads : 0,
            latestRoas: campaigns.length > 0 ? campaigns[campaigns.length - 1].roas : 0,
          })
        }
      } catch { /* skip */ }
    }

    setClientData(results)
    setFetching(false)
    setFetched(true)
  }, [signedClients.length, adminKey])

  useEffect(() => {
    if (!fetched && !fetching && signedClients.length > 0 && !loading) {
      fetchAllCampaigns()
    }
  }, [signedClients.length, loading])

  // Aggregate metrics
  const withCampaigns = clientData.filter(c => c.campaigns.length > 0)
  const totalSpend = withCampaigns.reduce((s, c) => s + c.totals.spend, 0)
  const totalLeads = withCampaigns.reduce((s, c) => s + c.totals.leads, 0)
  const totalMoveIns = withCampaigns.reduce((s, c) => s + c.totals.moveIns, 0)
  const portfolioCpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const portfolioCostPerMoveIn = totalMoveIns > 0 ? totalSpend / totalMoveIns : 0

  // Build monthly aggregate chart data
  const monthlyMap: Record<string, { spend: number; leads: number; moveIns: number }> = {}
  withCampaigns.forEach(c => {
    c.campaigns.forEach(camp => {
      if (!monthlyMap[camp.month]) monthlyMap[camp.month] = { spend: 0, leads: 0, moveIns: 0 }
      monthlyMap[camp.month].spend += camp.spend
      monthlyMap[camp.month].leads += camp.leads
      monthlyMap[camp.month].moveIns += camp.moveIns
    })
  })
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      cpl: data.leads > 0 ? data.spend / data.leads : 0,
    }))

  // Rankings
  const byMoveIns = [...withCampaigns].sort((a, b) => b.totals.moveIns - a.totals.moveIns)
  const byCpl = [...withCampaigns].sort((a, b) => a.avgCpl - b.avgCpl)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  if (signedClients.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No signed clients yet</p>
        <p className="text-sm mt-1">Campaign analytics will appear here once clients are signed and campaigns are running</p>
      </div>
    )
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading campaign data for {signedClients.length} client{signedClients.length !== 1 ? 's' : ''}...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <PortfolioKpi label="Active Clients" value={withCampaigns.length.toString()} sub={`of ${signedClients.length} signed`} icon={Users} />
        <PortfolioKpi label="Total Ad Spend" value={`$${totalSpend.toLocaleString()}`} sub="all time" icon={DollarSign} />
        <PortfolioKpi label="Total Leads" value={totalLeads.toLocaleString()} sub="across portfolio" icon={Target} />
        <PortfolioKpi label="Total Move-Ins" value={totalMoveIns.toLocaleString()} sub="across portfolio" icon={CheckCircle2} accent />
        <PortfolioKpi label="Avg CPL" value={`$${portfolioCpl.toFixed(2)}`} sub="portfolio wide" icon={TrendingUp} />
        <PortfolioKpi label="Cost/Move-In" value={`$${portfolioCostPerMoveIn.toFixed(0)}`} sub="portfolio wide" icon={Award} />
      </div>

      {/* Campaign Health Alerts */}
      <AlertsBanner adminKey={adminKey} />

      {/* Monthly Portfolio Charts */}
      {monthlyData.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-1">Portfolio Leads & Move-Ins</h3>
            <p className="text-xs text-slate-500 mb-3">Aggregate across all clients by month</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Bar dataKey="leads" name="Leads" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="moveIns" name="Move-Ins" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-1">Portfolio CPL Trend</h3>
            <p className="text-xs text-slate-500 mb-3">Blended cost per lead over time</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="portCplGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'CPL']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="cpl" stroke="#10b981" strokeWidth={2} fill="url(#portCplGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spend Allocation */}
      {withCampaigns.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-sm mb-1">Budget Allocation by Client</h3>
          <p className="text-xs text-slate-500 mb-4">Total ad spend distribution across portfolio</p>
          <div className="space-y-3">
            {byMoveIns.map(c => {
              const pct = totalSpend > 0 ? (c.totals.spend / totalSpend) * 100 : 0
              return (
                <div key={c.lead.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{c.lead.facilityName}</span>
                      <span className="text-xs text-slate-400">{c.lead.location}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-slate-500">${c.totals.spend.toLocaleString()}</span>
                      <span className="font-semibold w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Client Performance Cards */}
      <div>
        <h3 className="font-semibold mb-3">Client Performance</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientData.map(c => (
            <ClientPerformanceCard key={c.lead.id} data={c} />
          ))}
        </div>
      </div>

      {/* Rankings */}
      {withCampaigns.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Award size={15} className="text-emerald-600" /> Top by Move-Ins
            </h3>
            <div className="space-y-2">
              {byMoveIns.slice(0, 5).map((c, i) => (
                <div key={c.lead.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-medium flex-1 truncate">{c.lead.facilityName}</span>
                  <span className="text-sm font-bold text-emerald-600">{c.totals.moveIns}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-600" /> Best CPL
            </h3>
            <div className="space-y-2">
              {byCpl.filter(c => c.avgCpl > 0).slice(0, 5).map((c, i) => (
                <div key={c.lead.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-medium flex-1 truncate">{c.lead.facilityName}</span>
                  <span className="text-sm font-bold text-emerald-600">${c.avgCpl.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  INSIGHTS VIEW (Analytics + Activity Feed)              */
/* ═══════════════════════════════════════════════════════ */

interface AnalyticsData {
  totalLeads: number
  funnel: Record<string, number>
  conversionRate: number
  avgDaysToSign: number
  avgDaysInPipeline: number
  weeklyVelocity: { week: string; leads: number }[]
  stageDistribution: Record<string, number>
  lostRate: number
}

interface ActivityEntry {
  id: string
  type: string
  leadId: string
  leadName: string
  facilityName: string
  detail: string
  meta: Record<string, any>
  timestamp: string
}

function InsightsView({ adminKey, leads, darkMode }: { adminKey: string; leads: Lead[]; darkMode?: boolean }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/lead-analytics', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) setAnalytics(await res.json())
      } catch { /* silent */ }
      finally { setLoadingAnalytics(false) }
    }
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/activity-log?limit=30', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch { /* silent */ }
      finally { setLoadingActivity(false) }
    }
    fetchAnalytics()
    fetchActivity()
  }, [adminKey])

  const STAGE_LABELS: Record<string, string> = {
    submitted: 'Submitted', form_sent: 'Form Sent', form_completed: 'Form Done',
    audit_generated: 'Audit Ready', call_scheduled: 'Call Set', client_signed: 'Signed', lost: 'Lost',
  }

  const ACTIVITY_ICONS: Record<string, { color: string; label: string }> = {
    lead_created: { color: 'bg-blue-100 text-blue-600', label: 'New Lead' },
    status_change: { color: 'bg-indigo-100 text-indigo-600', label: 'Status' },
    note_added: { color: 'bg-amber-100 text-amber-600', label: 'Note' },
    campaign_added: { color: 'bg-green-100 text-green-600', label: 'Campaign' },
    onboarding_step: { color: 'bg-purple-100 text-purple-600', label: 'Onboarding' },
    client_signed: { color: 'bg-emerald-100 text-emerald-700', label: 'Signed!' },
    pms_uploaded: { color: 'bg-cyan-100 text-cyan-600', label: 'PMS Upload' },
  }

  return (
    <div className="space-y-6">
      {/* Analytics KPIs */}
      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading analytics...
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{analytics.conversionRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">lead → signed</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Avg Days to Sign</p>
              <p className="text-2xl font-bold">{analytics.avgDaysToSign}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">from first contact</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Avg Days Active</p>
              <p className="text-2xl font-bold">{analytics.avgDaysInPipeline}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">in pipeline</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Lost Rate</p>
              <p className="text-2xl font-bold text-red-500">{analytics.lostRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">of all leads</p>
            </div>
          </div>

          {/* Funnel + Velocity Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Pipeline Funnel</h3>
              <p className="text-xs text-slate-500 mb-4">Leads that reached each stage</p>
              <div className="space-y-2">
                {['submitted', 'form_sent', 'form_completed', 'audit_generated', 'call_scheduled', 'client_signed'].map(stage => {
                  const count = analytics.stageDistribution[stage] || 0
                  const maxCount = analytics.totalLeads || 1
                  const pct = (count / maxCount) * 100
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-600">{STAGE_LABELS[stage]}</span>
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stage === 'client_signed' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weekly Velocity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Lead Velocity</h3>
              <p className="text-xs text-slate-500 mb-3">New leads per week (last 8 weeks)</p>
              {analytics.weeklyVelocity.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.weeklyVelocity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <Bar dataKey="leads" name="Leads" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No data yet</div>
              )}
            </div>
          </div>

          {/* Lead Score Distribution */}
          {leads.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-sm mb-1">Lead Quality Overview</h3>
              <p className="text-xs text-slate-500 mb-3">Current pipeline by stage, excluding lost</p>
              <div className="flex gap-2 flex-wrap">
                {['submitted', 'form_sent', 'form_completed', 'audit_generated', 'call_scheduled', 'client_signed'].map(stage => {
                  const count = analytics.stageDistribution[stage] || 0
                  if (count === 0) return null
                  return (
                    <div key={stage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-600">{STAGE_LABELS[stage]}</span>
                      <span className="text-xs font-bold text-slate-900">{count}</span>
                    </div>
                  )
                })}
                {analytics.stageDistribution['lost'] > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                    <span className="text-xs text-red-600">Lost</span>
                    <span className="text-xs font-bold text-red-700">{analytics.stageDistribution['lost']}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No analytics data available</p>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-sm mb-1">Activity Feed</h3>
        <p className="text-xs text-slate-500 mb-4">Recent actions across all leads</p>

        {loadingActivity ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No activity yet. Actions will appear here as you manage leads.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {activities.map(act => {
              const info = ACTIVITY_ICONS[act.type] || { color: 'bg-slate-100 text-slate-600', label: act.type }
              const ago = timeAgo(act.timestamp)
              return (
                <div key={act.id} className="flex items-start gap-3">
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${info.color}`}>
                    {info.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{act.detail}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {act.facilityName && <span>{act.facilityName} · </span>}
                      {ago}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PortfolioKpi({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: any; accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={accent ? 'text-emerald-600' : 'text-slate-400'} />
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? 'text-emerald-700' : ''}`}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function ClientPerformanceCard({ data }: { data: ClientPortfolioData }) {
  const { lead, campaigns, totals, avgCpl, latestRoas } = data
  const hasCampaigns = campaigns.length > 0

  // Trend: compare last month to first month CPL
  let cplTrend: 'up' | 'down' | 'flat' = 'flat'
  if (campaigns.length >= 2) {
    const first = campaigns[0].cpl
    const last = campaigns[campaigns.length - 1].cpl
    cplTrend = last < first ? 'down' : last > first ? 'up' : 'flat'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate">{lead.facilityName}</h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} /> {lead.location}
          </p>
        </div>
        {hasCampaigns && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            latestRoas >= 3 ? 'bg-emerald-50 text-emerald-700' :
            latestRoas >= 2 ? 'bg-amber-50 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {latestRoas}x ROAS
          </span>
        )}
      </div>

      {hasCampaigns ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-lg font-bold">{totals.leads}</p>
              <p className="text-[10px] text-slate-500 uppercase">Leads</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{totals.moveIns}</p>
              <p className="text-[10px] text-slate-500 uppercase">Move-Ins</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1">
                ${avgCpl.toFixed(0)}
                {cplTrend === 'down' && <ArrowDownRight size={12} className="text-emerald-500" />}
                {cplTrend === 'up' && <ArrowUpRight size={12} className="text-red-500" />}
                {cplTrend === 'flat' && <Minus size={12} className="text-slate-400" />}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">Avg CPL</p>
            </div>
          </div>

          {/* Mini sparkline */}
          {campaigns.length >= 2 && (
            <div className="h-12 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={campaigns} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <defs>
                    <linearGradient id={`spark-${lead.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="moveIns" stroke="#10b981" strokeWidth={1.5} fill={`url(#spark-${lead.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">{campaigns.length} month{campaigns.length !== 1 ? 's' : ''} of data</span>
            <span className="text-[10px] text-slate-400">${totals.spend.toLocaleString()} total spend</span>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-slate-400">
          <BarChart3 size={20} className="mx-auto mb-1 opacity-40" />
          <p className="text-xs">No campaign data yet</p>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: number; accent?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={accent ? 'text-emerald-600' : 'text-slate-400'} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-emerald-600' : ''}`}>{value}</p>
    </div>
  )
}

function PipelineChip({ label, count, active, onClick, colorClass }: {
  label: string; count: number; active: boolean; onClick: () => void; colorClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : (colorClass || 'bg-slate-200 text-slate-500')
      }`}>
        {count}
      </span>
    </button>
  )
}

function LeadCard({ lead, expanded, onToggle, onUpdateStatus, onAddNote, onSetFollowUp, newNote, onNewNoteChange, updating, adminKey, score, selected, onSelect, isOverdue }: {
  lead: Lead
  expanded: boolean
  onToggle: () => void
  onUpdateStatus: (status: string) => void
  onAddNote: (note: string) => void
  onSetFollowUp: (date: string) => void
  newNote: string
  onNewNoteChange: (v: string) => void
  updating: boolean
  adminKey: string
  score?: { score: number; grade: string; breakdown: Record<string, number> }
  selected?: boolean
  onSelect?: () => void
  isOverdue?: boolean
}) {
  const statusInfo = STATUS_MAP[lead.status] || { label: lead.status, color: 'bg-slate-100 text-slate-600' }

  const gradeColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    D: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      expanded ? 'border-emerald-300 shadow-lg shadow-emerald-600/5' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Summary Row */}
      <div className="flex items-center px-4 sm:px-5 py-4 gap-3">
        <input
          type="checkbox"
          checked={selected || false}
          onChange={(e) => { e.stopPropagation(); onSelect?.() }}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 shrink-0 cursor-pointer"
        />
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">{lead.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {score && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColors[score.grade] || 'bg-slate-100 text-slate-600'}`} title={`Score: ${score.score}/100`}>
                {score.grade} · {score.score}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-0.5">
                <CalendarClock size={9} /> Overdue
              </span>
            )}
            {lead.followUpDate && !isOverdue && (
              <span className="text-[10px] text-slate-400" title="Follow-up scheduled">
                Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={12} /> {lead.facilityName}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {lead.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {timeAgo(lead.createdAt)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 pt-4 space-y-5">
          {/* Contact & Facility Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</h4>
              <div className="space-y-1.5 text-sm">
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                  <Mail size={14} /> {lead.email}
                </a>
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                  <Phone size={14} /> {lead.phone}
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Facility Details</h4>
              <div className="text-sm space-y-1 text-slate-600">
                <p>Occupancy: <span className="font-medium text-slate-900">{OCCUPANCY_LABELS[lead.occupancyRange] || lead.occupancyRange}</span></p>
                <p>Units: <span className="font-medium text-slate-900">{UNITS_LABELS[lead.totalUnits] || lead.totalUnits}</span></p>
                <p>Issue: <span className="font-medium text-slate-900">{ISSUE_LABELS[lead.biggestIssue] || lead.biggestIssue}</span></p>
              </div>
            </div>
          </div>

          {/* Form notes from user */}
          {lead.formNotes && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Submission Notes</h4>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">{lead.formNotes}</p>
            </div>
          )}

          {/* Access Code + Campaign Manager (shown for signed clients) */}
          {lead.accessCode && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                <KeyRound size={16} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">Portal Access Code</p>
                  <p className="text-sm font-mono tracking-wider text-emerald-700">{lead.accessCode}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lead.accessCode!) }}
                  className="p-1.5 text-emerald-500 hover:text-emerald-700 transition-colors"
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>
              </div>
              <OnboardingSection accessCode={lead.accessCode} adminKey={adminKey} />
              <CampaignManager accessCode={lead.accessCode} adminKey={adminKey} />
              <AuditReportSection leadId={lead.id} adminKey={adminKey} />
              <EmailTemplatePicker leadId={lead.id} leadName={lead.name} adminKey={adminKey} />
            </>
          )}

          {/* Audit Report + Email Templates (for all leads) */}
          {!lead.accessCode && (
            <>
              <AuditReportSection leadId={lead.id} adminKey={adminKey} />
              <EmailTemplatePicker leadId={lead.id} leadName={lead.name} adminKey={adminKey} />
            </>
          )}

          {/* Timestamps */}
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={12} /> Created: {formatDate(lead.createdAt)}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> Updated: {formatDate(lead.updatedAt)}</span>
          </div>

          {/* Status Change */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Move to Stage</h4>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => onUpdateStatus(s.value)}
                  disabled={lead.status === s.value || updating}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    lead.status === s.value
                      ? 'ring-2 ring-emerald-500 ring-offset-1 ' + s.color
                      : s.color + ' opacity-60 hover:opacity-100'
                  } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-Up Reminder */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <CalendarClock size={12} /> Follow-Up Reminder
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={lead.followUpDate || ''}
                onChange={e => onSetFollowUp(e.target.value)}
                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              {lead.followUpDate && (
                <button onClick={() => onSetFollowUp('')} className="text-xs text-slate-400 hover:text-red-500">
                  Clear
                </button>
              )}
              {isOverdue && (
                <span className="text-xs text-red-600 font-medium">Overdue since {new Date(lead.followUpDate!).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Admin Message Thread (for signed clients) */}
          {lead.accessCode && (
            <AdminMessageThread accessCode={lead.accessCode} adminKey={adminKey} />
          )}

          {/* Notes */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <StickyNote size={12} /> Internal Notes ({lead.notes?.length || 0})
            </h4>
            {lead.notes?.length > 0 && (
              <div className="space-y-2 mb-3">
                {lead.notes.map((n, i) => (
                  <div key={i} className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-slate-700">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(n.at)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={e => onNewNoteChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) onAddNote(newNote.trim()) }}
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              <button
                onClick={() => newNote.trim() && onAddNote(newNote.trim())}
                disabled={!newNote.trim() || updating}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Onboarding Section (inside lead card for signed clients) ── */

function OnboardingSection({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [completionPct, setCompletionPct] = useState<number | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/client-onboarding?code=${accessCode}`, {
          headers: { 'X-Admin-Key': adminKey },
        })
        if (res.ok) {
          const json = await res.json()
          setCompletionPct(json.completionPct)
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    fetchStatus()
  }, [accessCode, adminKey])

  const completedSteps = completionPct != null ? Math.round(completionPct / 20) : 0

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Campaign Onboarding</span>
          </div>
          {loading ? (
            <span className="text-xs text-slate-400">Loading...</span>
          ) : completionPct === 100 ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Launch Ready</span>
          ) : (
            <span className="text-xs text-slate-500">{completionPct}% complete</span>
          )}
        </div>
        {!loading && (
          <>
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < completedSteps ? 'bg-emerald-500' : 'bg-slate-100'}`} />
              ))}
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="w-full text-center text-xs font-medium py-1.5 rounded-lg transition-all cursor-pointer bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              {completionPct === 100 ? 'View Onboarding Info' : 'Open Wizard'}
            </button>
          </>
        )}
      </div>

      {showWizard && (
        <OnboardingWizard
          accessCode={accessCode}
          adminKey={adminKey}
          onClose={() => setShowWizard(false)}
          onCompletionChange={setCompletionPct}
        />
      )}
    </>
  )
}

/* ── Campaign Manager (inside lead card for signed clients) ── */

interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  costPerMoveIn: number
  roas: number
  occupancyDelta: number
}

function CampaignManager({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Form state
  const [month, setMonth] = useState('')
  const [spend, setSpend] = useState('')
  const [leads, setLeads] = useState('')
  const [moveIns, setMoveIns] = useState('')
  const [roas, setRoas] = useState('')

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client-campaigns?code=${accessCode}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setLoaded(true)
  }

  const addCampaign = async () => {
    if (!month || !spend || !leads) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code: accessCode,
          campaign: {
            month,
            spend: Number(spend),
            leads: Number(leads),
            moveIns: Number(moveIns || 0),
            roas: Number(roas || 0),
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setMonth(''); setSpend(''); setLeads(''); setMoveIns(''); setRoas('')
        setShowForm(false)
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const deleteCampaign = async (m: string) => {
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, month: m }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <BarChart3 size={12} /> Campaign Data ({campaigns.length})
        </h4>
        <div className="flex items-center gap-2">
          {!loaded && (
            <button onClick={fetchCampaigns} disabled={loading}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              {loading ? 'Loading...' : 'Load campaigns'}
            </button>
          )}
          {loaded && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              <Plus size={12} /> Add month
            </button>
          )}
        </div>
      </div>

      {/* Existing campaigns */}
      {campaigns.length > 0 && (
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-2 py-1.5 font-medium text-slate-500">Month</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Spend</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Leads</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">CPL</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Move-Ins</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">ROAS</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.month} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium">{c.month}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">${c.spend.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{c.leads}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">${c.cpl.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-emerald-600 font-medium">{c.moveIns}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{c.roas}x</td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteCampaign(c.month)}
                      className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add campaign form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            <input type="text" placeholder="Month (e.g. Mar 2026)" value={month}
              onChange={e => setMonth(e.target.value)}
              className="col-span-2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Spend" value={spend}
              onChange={e => setSpend(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Leads" value={leads}
              onChange={e => setLeads(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Move-Ins" value={moveIns}
              onChange={e => setMoveIns(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
          </div>
          <div className="flex items-center gap-2">
            <input type="number" step="0.1" placeholder="ROAS (e.g. 4.2)" value={roas}
              onChange={e => setRoas(e.target.value)}
              className="w-32 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <button onClick={addCampaign} disabled={!month || !spend || !leads || saving}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Monthly Goal Setter */}
      {loaded && (
        <GoalSetter accessCode={accessCode} adminKey={adminKey} />
      )}
    </div>
  )
}

/* ── Goal Setter (inside CampaignManager) ── */

function GoalSetter({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [goal, setGoal] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveGoal = async () => {
    if (!goal) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, monthlyGoal: Number(goal) }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
      <Target size={12} className="text-slate-400" />
      <span className="text-xs text-slate-400">Monthly move-in goal:</span>
      <input
        type="number"
        min="0"
        max="999"
        placeholder="e.g. 15"
        value={goal}
        onChange={e => setGoal(e.target.value)}
        className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
      />
      <button onClick={saveGoal} disabled={!goal || saving}
        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40">
        {saving ? '...' : saved ? 'Saved!' : 'Set'}
      </button>
    </div>
  )
}

/* ── Admin Message Thread (inside lead card for signed clients) ── */

function AdminMessageThread({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; timestamp: string }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client-messages?code=${accessCode}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setLoaded(true)
  }

  const sendMessage = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/client-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, text: text.trim(), from: 'admin' }),
      })
      if (res.ok) {
        setText('')
        fetchMessages()
      }
    } catch { /* ignore */ }
    setSending(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <MessageSquare size={12} /> Messages ({messages.length})
        </h4>
        {!loaded && (
          <button onClick={fetchMessages} disabled={loading}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            {loading ? 'Loading...' : 'Load messages'}
          </button>
        )}
      </div>
      {loaded && (
        <>
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
              {messages.map(m => (
                <div key={m.id} className={`text-sm rounded-lg p-2 border ${
                  m.from === 'admin' ? 'bg-emerald-50 border-emerald-100 ml-6' : 'bg-slate-50 border-slate-100 mr-6'
                }`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">{m.from === 'admin' ? 'You' : 'Client'}</span>
                    <span className="text-[10px] text-slate-300">{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700">{m.text}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Reply to client..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && text.trim()) sendMessage() }}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button onClick={sendMessage} disabled={!text.trim() || sending}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40">
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Audit Report Section (inside lead card) ── */

interface AuditReport {
  generatedAt: string
  facility: { name: string; totalUnits: number; occupancy: number; vacantUnits: number }
  vacancyCost: { monthlyLoss: number; annualLoss: number }
  marketOpportunity: { score: number; grade: string }
  projections: {
    recommendedSpend: number; projectedCpl: number; projectedLeadsPerMonth: number
    projectedMoveInsPerMonth: number; projectedMonthlyRevenue: number
    projectedRoas: number; projectedMonthsToFill: number; conversionRate: number
  }
  competitiveInsights: string[]
  recommendations: { title: string; detail: string; priority: string }[]
}

function AuditReportSection({ leadId, adminKey }: { leadId: string; adminKey: string }) {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState('')

  const generate = async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const url = force ? '/api/audit-report' : `/api/audit-report?id=${leadId}`
      const opts: RequestInit = {
        method: force ? 'POST' : 'GET',
        headers: { 'X-Admin-Key': adminKey, ...(force ? { 'Content-Type': 'application/json' } : {}) },
        ...(force ? { body: JSON.stringify({ leadId }) } : {}),
      }
      const res = await fetch(url, opts)
      if (res.ok) {
        const data = await res.json()
        if (data.report) {
          setReport(data.report)
          setExpanded(true)
        } else {
          setError('No report data returned')
        }
      } else {
        setError('Failed to generate report')
      }
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  const gradeColor = report ? (
    report.marketOpportunity.grade === 'Excellent' ? 'text-emerald-600' :
    report.marketOpportunity.grade === 'Strong' ? 'text-blue-600' :
    report.marketOpportunity.grade === 'Moderate' ? 'text-amber-600' : 'text-slate-500'
  ) : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <FileText size={12} /> Marketing Audit
        </h4>
        <div className="flex items-center gap-2">
          {report && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-500 hover:text-slate-700">
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button onClick={() => generate(!report)} disabled={loading}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {loading ? 'Generating...' : report ? 'Regenerate' : 'Generate Audit'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {report && expanded && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 text-sm">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Vacant Units</p>
              <p className="text-lg font-bold text-red-600">{report.facility.vacantUnits}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual Loss</p>
              <p className="text-lg font-bold text-red-600">${report.vacancyCost.annualLoss.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Opportunity</p>
              <p className={`text-lg font-bold ${gradeColor}`}>
                {report.marketOpportunity.grade} ({report.marketOpportunity.score})
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rec. Spend</p>
              <p className="text-lg font-bold text-emerald-600">${report.projections.recommendedSpend.toLocaleString()}/mo</p>
            </div>
          </div>

          {/* Projections */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 mb-2">Projected Performance</h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">CPL</span>
                <span className="font-semibold">${report.projections.projectedCpl}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Leads/mo</span>
                <span className="font-semibold">{report.projections.projectedLeadsPerMonth}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Move-ins/mo</span>
                <span className="font-semibold text-emerald-600">{report.projections.projectedMoveInsPerMonth}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">ROAS</span>
                <span className="font-semibold">{report.projections.projectedRoas}x</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Revenue/mo</span>
                <span className="font-semibold">${report.projections.projectedMonthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Months to fill</span>
                <span className="font-semibold">{report.projections.projectedMonthsToFill}</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          {report.competitiveInsights.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 mb-2">Competitive Insights</h5>
              <div className="space-y-1.5">
                {report.competitiveInsights.map((insight, i) => (
                  <p key={i} className="text-xs text-slate-600 bg-white rounded px-3 py-2 border border-slate-100">
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 mb-2">Recommendations</h5>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      rec.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>{rec.priority}</span>
                    <span className="text-xs font-semibold">{rec.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{rec.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Email Template Picker (inside lead card) ── */

const EMAIL_TEMPLATES = [
  { id: 'follow_up', name: 'Follow Up', icon: '📧', description: 'Warm follow-up after submission' },
  { id: 'audit_delivery', name: 'Audit', icon: '📊', description: 'Send audit report' },
  { id: 'proposal', name: 'Proposal', icon: '📋', description: 'Send pricing & next steps' },
  { id: 'check_in', name: 'Check In', icon: '👋', description: 'Re-engage quiet lead' },
  { id: 'onboarding_reminder', name: 'Onboarding', icon: '🔔', description: 'Remind to complete setup' },
  { id: 'campaign_update', name: 'Update', icon: '📈', description: 'Share performance highlights' },
]

function EmailTemplatePicker({ leadId, leadName, adminKey }: { leadId: string; leadName: string; adminKey: string }) {
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string[]>([])
  const [error, setError] = useState('')

  const sendTemplate = async (templateId: string) => {
    setSending(templateId)
    setError('')
    try {
      const res = await fetch('/api/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ templateId, leadId }),
      })
      if (res.ok) {
        setSent(prev => [...prev, templateId])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send')
      }
    } catch {
      setError('Connection error')
    }
    setSending(null)
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
        <Send size={12} /> Quick Emails
      </h4>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_TEMPLATES.map(t => {
          const isSent = sent.includes(t.id)
          const isSending = sending === t.id
          return (
            <button
              key={t.id}
              onClick={() => sendTemplate(t.id)}
              disabled={isSending || isSent}
              title={`${t.description} — sends to ${leadName}`}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                isSent
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${isSending ? 'opacity-50' : ''} disabled:cursor-not-allowed`}
            >
              {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <CheckCircle2 size={10} /> : null}
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Campaign Health Alerts Banner (inside PortfolioView) ── */

interface CampaignAlert {
  type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  accessCode: string
  facilityName: string
}

function AlertsBanner({ adminKey }: { adminKey: string }) {
  const [alerts, setAlerts] = useState<CampaignAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/campaign-alerts', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetchAlerts()
  }, [adminKey])

  if (loading) return null

  const critical = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')
  const infos = alerts.filter(a => a.severity === 'info')

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <CheckCircle2 size={14} />
        <span className="font-medium">All campaigns healthy — no alerts</span>
      </div>
    )
  }

  const severityIcon = (s: string) => {
    if (s === 'critical') return <XCircle size={12} className="text-red-500 shrink-0" />
    if (s === 'warning') return <AlertTriangle size={12} className="text-amber-500 shrink-0" />
    return <Sparkles size={12} className="text-blue-500 shrink-0" />
  }
  const severityBg = (s: string) => {
    if (s === 'critical') return 'bg-red-50 border-red-200'
    if (s === 'warning') return 'bg-amber-50 border-amber-200'
    return 'bg-blue-50 border-blue-200'
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
          critical.length > 0 ? 'bg-red-50 border-red-200' : warnings.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell size={14} className={critical.length > 0 ? 'text-red-500' : warnings.length > 0 ? 'text-amber-500' : 'text-blue-500'} />
          <span className="text-xs font-semibold">
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
            {critical.length > 0 && <span className="text-red-600 ml-1">({critical.length} critical)</span>}
            {warnings.length > 0 && <span className="text-amber-600 ml-1">({warnings.length} warning{warnings.length !== 1 ? 's' : ''})</span>}
            {infos.length > 0 && <span className="text-blue-600 ml-1">({infos.length} info)</span>}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${severityBg(alert.severity)}`}>
              {severityIcon(alert.severity)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{alert.title}</span>
                  <span className="text-[10px] text-slate-400">{alert.facilityName}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{alert.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  NOTIFICATION PANEL                                     */
/* ═══════════════════════════════════════════════════════ */

function NotificationPanel({ notifications, darkMode, onClose }: {
  notifications: { id: string; type: string; title: string; detail: string; timestamp: string }[]
  darkMode: boolean
  onClose: () => void
}) {
  const typeIcon = (type: string) => {
    if (type === 'new_lead') return <Users size={12} className="text-blue-500" />
    if (type === 'overdue') return <CalendarClock size={12} className="text-red-500" />
    if (type === 'new_message') return <MessageSquare size={12} className="text-purple-500" />
    return <AlertTriangle size={12} className="text-amber-500" />
  }
  const typeBg = (type: string) => {
    if (darkMode) {
      if (type === 'new_lead') return 'bg-blue-900/30 border-blue-800'
      if (type === 'overdue') return 'bg-red-900/30 border-red-800'
      if (type === 'new_message') return 'bg-purple-900/30 border-purple-800'
      return 'bg-amber-900/30 border-amber-800'
    }
    if (type === 'new_lead') return 'bg-blue-50 border-blue-100'
    if (type === 'overdue') return 'bg-red-50 border-red-100'
    if (type === 'new_message') return 'bg-purple-50 border-purple-100'
    return 'bg-amber-50 border-amber-100'
  }

  return (
    <div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 max-h-[480px] overflow-hidden flex flex-col ${
      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <XIcon size={14} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Bell size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">All caught up!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-lg border p-3 ${typeBg(n.type)}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{n.detail}</p>
                    <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  COMMAND PALETTE (Global Search)                        */
/* ═══════════════════════════════════════════════════════ */

function CommandPalette({ query, onQueryChange, leads, darkMode, onClose, onSelectLead, onAction }: {
  query: string
  onQueryChange: (v: string) => void
  leads: Lead[]
  darkMode: boolean
  onClose: () => void
  onSelectLead: (id: string) => void
  onAction: (action: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const q = query.toLowerCase()
  const matchedLeads = q ? leads.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.facilityName.toLowerCase().includes(q) ||
    l.email.toLowerCase().includes(q) ||
    l.location.toLowerCase().includes(q)
  ).slice(0, 5) : []

  const actions = [
    { id: 'pipeline', label: 'Go to Pipeline', icon: Users },
    { id: 'kanban', label: 'Go to Kanban Board', icon: Columns3 },
    { id: 'portfolio', label: 'Go to Portfolio', icon: BarChart3 },
    { id: 'insights', label: 'Go to Insights', icon: TrendingUp },
    { id: 'billing', label: 'Go to Billing', icon: CreditCard },
    { id: 'settings', label: 'Go to Settings', icon: Settings },
    { id: 'dark', label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: darkMode ? Sun : Moon },
    { id: 'csv', label: 'Export Leads as CSV', icon: Download },
    { id: 'refresh', label: 'Refresh Data', icon: RefreshCw },
  ]

  const matchedActions = q ? actions.filter(a => a.label.toLowerCase().includes(q)) : actions

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads, navigate, or run an action..."
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            className={`flex-1 text-sm bg-transparent focus:outline-none ${darkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
          />
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {matchedLeads.length > 0 && (
            <div className="mb-2">
              <p className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Leads</p>
              {matchedLeads.map(l => (
                <button
                  key={l.id}
                  onClick={() => onSelectLead(l.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <Users size={14} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{l.facilityName} · {l.location}</p>
                  </div>
                  <ChevronRight size={12} className={darkMode ? 'text-slate-600' : 'text-slate-300'} />
                </button>
              ))}
            </div>
          )}
          <div>
            <p className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Actions</p>
            {matchedActions.map(a => (
              <button
                key={a.id}
                onClick={() => onAction(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                }`}
              >
                <a.icon size={14} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                <span className="text-sm">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  KEYBOARD SHORTCUTS MODAL                               */
/* ═══════════════════════════════════════════════════════ */

function ShortcutsModal({ darkMode, onClose }: { darkMode: boolean; onClose: () => void }) {
  const shortcuts = [
    { key: '⌘K', desc: 'Open command palette' },
    { key: '1', desc: 'Pipeline view' },
    { key: '2', desc: 'Kanban view' },
    { key: '3', desc: 'Portfolio view' },
    { key: '4', desc: 'Insights view' },
    { key: '5', desc: 'Billing view' },
    { key: '6', desc: 'Settings view' },
    { key: 'R', desc: 'Refresh data' },
    { key: 'N', desc: 'Toggle notifications' },
    { key: '?', desc: 'Show shortcuts' },
    { key: 'ESC', desc: 'Close panel/modal' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-sm rounded-xl border shadow-2xl p-5 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard size={16} />
            Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <XIcon size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{s.desc}</span>
              <kbd className={`text-xs font-mono px-2 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  KANBAN VIEW                                            */
/* ═══════════════════════════════════════════════════════ */

function KanbanView({ leads, onUpdateStatus, onSelectLead, darkMode, loading }: {
  leads: Lead[]
  onUpdateStatus: (id: string, status: string) => void
  onSelectLead: (id: string) => void
  darkMode: boolean
  loading: boolean
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading...
      </div>
    )
  }

  const columns = STATUSES.map(s => ({
    ...s,
    leads: leads.filter(l => l.status === s.value),
  }))

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (dragId) {
      const lead = leads.find(l => l.id === dragId)
      if (lead && lead.status !== status) {
        onUpdateStatus(dragId, status)
      }
    }
    setDragId(null)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map(col => (
          <div
            key={col.value}
            className={`w-64 shrink-0 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.value)}
          >
            <div className={`px-3 py-2.5 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.color}`}>{col.label}</span>
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{col.leads.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {col.leads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => handleDragStart(e, lead.id)}
                  onClick={() => onSelectLead(lead.id)}
                  className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    dragId === lead.id ? 'opacity-50' : ''
                  } ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <GripVertical size={12} className={`mt-0.5 shrink-0 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{lead.name}</p>
                      <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{lead.facilityName}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <MapPin size={9} />
                    <span className="truncate">{lead.location}</span>
                    <span className="ml-auto">{timeAgo(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
              {col.leads.length === 0 && (
                <div className={`text-center py-8 text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  BILLING VIEW                                           */
/* ═══════════════════════════════════════════════════════ */

interface Invoice {
  id: string
  month: string
  amount: number
  adSpend: number
  managementFee: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
  paidDate: string | null
  notes: string
  createdAt: string
}

function BillingView({ adminKey, leads, darkMode }: { adminKey: string; leads: Lead[]; darkMode: boolean }) {
  const [invoices, setInvoices] = useState<Record<string, Invoice[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createCode, setCreateCode] = useState('')
  const [createMonth, setCreateMonth] = useState('')
  const [createAdSpend, setCreateAdSpend] = useState('')
  const [createFee, setCreateFee] = useState('')
  const [createDue, setCreateDue] = useState('')
  const [saving, setSaving] = useState(false)

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/client-billing?all=true', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || {})
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetchAll()
  }, [adminKey])

  const createInvoice = async () => {
    if (!createCode || !createMonth || !createAdSpend || !createFee) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code: createCode,
          month: createMonth,
          adSpend: Number(createAdSpend),
          managementFee: Number(createFee),
          amount: Number(createAdSpend) + Number(createFee),
          dueDate: createDue || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInvoices(prev => ({ ...prev, [createCode]: data.invoices || [] }))
        setShowCreate(false)
        setCreateMonth(''); setCreateAdSpend(''); setCreateFee(''); setCreateDue('')
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  const updateInvoice = async (code: string, invoiceId: string, status: string) => {
    try {
      const res = await fetch('/api/client-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code,
          invoiceId,
          status,
          paidDate: status === 'paid' ? new Date().toISOString() : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInvoices(prev => ({ ...prev, [code]: data.invoices || [] }))
      }
    } catch { /* silent */ }
  }

  const statusColor = (s: string) => {
    if (s === 'paid') return darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
    if (s === 'sent') return darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
    if (s === 'overdue') return darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
    return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
  }

  const allInvoices = Object.values(invoices).flat()
  const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = allInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0)
  const overdueAmount = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading billing data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'collected', color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${totalOutstanding.toLocaleString()}`, sub: 'awaiting payment', color: '' },
          { label: 'Overdue', value: `$${overdueAmount.toLocaleString()}`, sub: 'past due', color: 'text-red-500' },
          { label: 'Invoices', value: String(allInvoices.length), sub: 'total', color: '' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Create Invoice */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Client Invoices</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {showCreate && (
        <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={createCode} onChange={e => setCreateCode(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}>
              <option value="">Client...</option>
              {signedClients.map(c => (<option key={c.id} value={c.accessCode}>{c.facilityName}</option>))}
            </select>
            <input type="text" placeholder="Month (Mar 2026)" value={createMonth} onChange={e => setCreateMonth(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="number" placeholder="Ad Spend" value={createAdSpend} onChange={e => setCreateAdSpend(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="number" placeholder="Mgmt Fee" value={createFee} onChange={e => setCreateFee(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="date" value={createDue} onChange={e => setCreateDue(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-2">
            <button onClick={createInvoice} disabled={!createCode || !createMonth || !createAdSpend || !createFee || saving}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
            <button onClick={() => setShowCreate(false)} className={`px-3 py-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Invoice List by Client */}
      {signedClients.length === 0 ? (
        <div className={`text-center py-16 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Receipt size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No signed clients yet</p>
          <p className="text-xs mt-1">Invoices will appear here once clients are signed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signedClients.map(client => {
            const clientInvoices = invoices[client.accessCode!] || []
            return (
              <div key={client.id} className={`rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div>
                    <h4 className="text-sm font-semibold">{client.facilityName}</h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{client.location}</p>
                  </div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {clientInvoices.length === 0 ? (
                  <div className={`px-4 py-6 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No invoices yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                          {['Month', 'Ad Spend', 'Fee', 'Total', 'Status', 'Actions'].map(h => (
                            <th key={h} className={`px-4 py-2 font-medium ${h === 'Month' ? 'text-left' : h === 'Actions' || h === 'Status' ? 'text-center' : 'text-right'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientInvoices.map(inv => (
                          <tr key={inv.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className="px-4 py-2.5 font-medium">{inv.month}</td>
                            <td className={`px-4 py-2.5 text-right ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>${inv.adSpend.toLocaleString()}</td>
                            <td className={`px-4 py-2.5 text-right ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>${inv.managementFee.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">${inv.amount.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>
                                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <select value={inv.status} onChange={e => updateInvoice(client.accessCode!, inv.id, e.target.value)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  SETTINGS VIEW                                          */
/* ═══════════════════════════════════════════════════════ */

function SettingsView({ adminKey, darkMode, onToggleDarkMode }: {
  adminKey: string; darkMode: boolean; onToggleDarkMode: () => void
}) {
  const [settings, setSettings] = useState({
    companyName: 'StowStack',
    companyEmail: 'anna@storepawpaw.com',
    companyPhone: '',
    notifyNewLeads: true,
    notifyOverdue: true,
    notifyMessages: true,
    notifyAlerts: true,
    emailSignature: '',
    defaultFollowUpDays: 3,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/admin-settings', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setSettings(prev => ({ ...prev, ...data.settings }))
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetch_()
  }, [adminKey])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { /* silent */ }
    setSaving(false)
  }

  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputClass = darkMode
    ? 'bg-slate-700 border-slate-600 text-slate-200 focus:ring-emerald-500/30'
    : 'bg-white border-slate-200 text-slate-900 focus:ring-emerald-500/20'
  const labelClass = `text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Company Info */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 size={16} /> Company Information</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Company Name</label>
            <input type="text" value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })}
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={settings.companyEmail} onChange={e => setSettings({ ...settings, companyEmail: e.target.value })}
                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={settings.companyPhone} onChange={e => setSettings({ ...settings, companyPhone: e.target.value })}
                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email Signature</label>
            <textarea value={settings.emailSignature} onChange={e => setSettings({ ...settings, emailSignature: e.target.value })}
              rows={3} placeholder="Custom email signature..."
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${inputClass}`} />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Bell size={16} /> Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: 'notifyNewLeads', label: 'New lead submissions', desc: 'Get notified when a new lead comes in' },
            { key: 'notifyOverdue', label: 'Overdue follow-ups', desc: 'Alert when a follow-up date has passed' },
            { key: 'notifyMessages', label: 'Client messages', desc: 'Notify on new client messages' },
            { key: 'notifyAlerts', label: 'Campaign alerts', desc: 'CPL spikes, ROAS drops, lead droughts' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.label}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
              </div>
              <div className="relative">
                <input type="checkbox" checked={(settings as any)[item.key]}
                  onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="sr-only peer" />
                <div className={`w-9 h-5 rounded-full transition-colors peer-checked:bg-emerald-500 ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Defaults */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Settings size={16} /> Defaults</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Default follow-up (days after submission)</label>
            <input type="number" min="1" max="30" value={settings.defaultFollowUpDays}
              onChange={e => setSettings({ ...settings, defaultFollowUpDays: Number(e.target.value) })}
              className={`w-24 mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Dark Mode</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Toggle dark theme for the admin dashboard</p>
            </div>
            <button onClick={onToggleDarkMode}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                darkMode ? 'border-amber-600 text-amber-400 hover:bg-amber-900/20' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={saveSettings} disabled={saving}
          className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">Settings saved successfully</span>}
      </div>
    </div>
  )
}
