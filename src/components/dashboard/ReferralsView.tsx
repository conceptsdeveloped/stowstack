import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Loader2, Copy, CheckCircle2, Trophy, Gift,
  DollarSign, Send, ChevronRight, ArrowLeft, Link2,
  Star, Award, Crown, UserPlus, Mail, TrendingUp, ArrowRight,
  BarChart3, RefreshCw, Search, Trash2, AlertCircle
} from 'lucide-react'

interface ReferralCode {
  id: string
  facility_id: string
  code: string
  referrer_name: string
  referrer_email: string
  credit_balance: number
  total_earned: number
  referral_count: number
  active_count: number
  status: string
  created_at: string
}

interface Referral {
  id: string
  referral_code_id: string
  referred_name: string
  referred_email: string
  referred_phone: string | null
  facility_name: string | null
  facility_location: string | null
  status: string
  credit_amount: number
  credit_issued: boolean
  signed_up_at: string | null
  activated_at: string | null
  notes: string | null
  created_at: string
}

interface CreditEntry {
  id: string
  referral_code_id: string
  referral_id: string | null
  type: string
  amount: number
  description: string
  balance_after: number
  created_at: string
}

interface LeaderEntry {
  id: string
  code: string
  referrer_name: string
  referral_count: number
  total_earned: number
  credit_balance: number
  active_referrals: number
}

const REFERRAL_STATUS_COLORS: Record<string, string> = {
  invited: 'bg-blue-100 text-blue-700',
  signed_up: 'bg-indigo-100 text-indigo-700',
  onboarding: 'bg-purple-100 text-purple-700',
  active: 'bg-emerald-100 text-emerald-700',
  churned: 'bg-red-100 text-red-700',
}

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  invited: 'Invited',
  signed_up: 'Signed Up',
  onboarding: 'Onboarding',
  active: 'Active',
  churned: 'Churned',
}

const CREDIT_TIERS = [
  { label: 'Signup', amount: 99, desc: '1 full month free when they sign up', icon: UserPlus },
  { label: 'Goes Live', amount: 99, desc: 'Another month free when they go active', icon: CheckCircle2 },
  { label: '3 Referrals', amount: 200, desc: '$200 bonus — hit this at your first conference', icon: Star },
  { label: '5 Referrals', amount: 500, desc: '$500 bonus — a free quarter of StowStack', icon: Award },
  { label: '10 Referrals', amount: 1000, desc: '$1,000 bonus — conference champion', icon: Crown },
]

// 25 referrals = $2,500 bonus (shown separately as aspirational tier)
const MEGA_BONUS = { threshold: 25, amount: 2500, desc: 'Network builder tier — $2,500 bonus at 25 active referrals' }

const FUNNEL_STAGES = ['invited', 'signed_up', 'onboarding', 'active'] as const
const FUNNEL_LABELS: Record<string, string> = {
  invited: 'Invited', signed_up: 'Signed Up', onboarding: 'Onboarding', active: 'Active',
}
const FUNNEL_COLORS = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500']

const RANK_ICONS = [Crown, Award, Star]
const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

const API = '/api/referrals'
const REFERRAL_BASE_URL = 'https://stowstack.co/r/'

export default function ReferralsView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [credits, setCredits] = useState<CreditEntry[]>([])
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [subTab, setSubTab] = useState<'overview' | 'referrals' | 'credits' | 'leaderboard' | 'stats'>('overview')
  const [showNewCode, setShowNewCode] = useState(false)
  const [showNewReferral, setShowNewReferral] = useState(false)
  const [showRedeemForm, setShowRedeemForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemDesc, setRedeemDesc] = useState('')

  const [newCode, setNewCode] = useState({ facility_id: '', referrer_name: '', referrer_email: '' })
  const [newRef, setNewRef] = useState({ referred_name: '', referred_email: '', referred_phone: '', facility_name: '', facility_location: '', notes: '' })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const muted = darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500`

  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey }

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(API, { headers })
      if (res.ok) { setCodes((await res.json()).codes || []) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [adminKey])

  const fetchReferrals = useCallback(async (codeId: string) => {
    try {
      const res = await fetch(`${API}?action=referrals&code_id=${codeId}`, { headers })
      if (res.ok) { setReferrals((await res.json()).referrals || []) }
    } catch { /* ignore */ }
  }, [adminKey])

  const fetchCredits = useCallback(async (codeId: string) => {
    try {
      const res = await fetch(`${API}?action=credits&code_id=${codeId}`, { headers })
      if (res.ok) { setCredits((await res.json()).credits || []) }
    } catch { /* ignore */ }
  }, [adminKey])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=leaderboard`, { headers })
      if (res.ok) { setLeaders((await res.json()).leaders || []) }
    } catch { /* ignore */ }
  }, [adminKey])

  useEffect(() => { fetchCodes(); fetchLeaderboard() }, [fetchCodes, fetchLeaderboard])
  useEffect(() => {
    if (selectedCode) { fetchReferrals(selectedCode.id); fetchCredits(selectedCode.id) }
  }, [selectedCode, fetchReferrals, fetchCredits])

  // ── Helpers ──
  const getReferralLink = (code: string) => `${REFERRAL_BASE_URL}${code}`

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getEmailShareLink = (code: string, name: string) => {
    const subject = encodeURIComponent(`${name} thinks you should check out StowStack`)
    const body = encodeURIComponent(
      `Hey,\n\n` +
      `I've been using StowStack for my storage facility and it's been a game-changer for filling vacant units. ` +
      `Ad-specific landing pages, full-funnel attribution, revenue-based A/B testing — the whole deal.\n\n` +
      `They're running an aggressive referral program right now: we each get $99 in account credits when you sign up, ` +
      `and another $99 when you go live. That's basically 2 free months.\n\n` +
      `Here's my referral link:\n${getReferralLink(code)}\n\n` +
      `Let me know if you have any questions — happy to walk you through what it's done for my facility.\n\n` +
      `- ${name}`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }

  const getConversionRate = () => {
    if (referrals.length === 0) return 0
    return Math.round((referrals.filter(r => r.status === 'active').length / referrals.length) * 100)
  }

  const getFunnelData = () => {
    const counts: Record<string, number> = { invited: 0, signed_up: 0, onboarding: 0, active: 0 }
    referrals.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++ })
    // Cumulative: active are also signed up, etc.
    return FUNNEL_STAGES.map(stage => ({ stage, count: counts[stage], label: FUNNEL_LABELS[stage] }))
  }

  const filteredReferrals = referrals.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return r.referred_name.toLowerCase().includes(q) ||
        r.referred_email.toLowerCase().includes(q) ||
        (r.facility_name?.toLowerCase().includes(q) ?? false)
    }
    return true
  })

  const totalCreditsEarned = codes.reduce((s, c) => s + Number(c.total_earned), 0)
  const totalBalance = codes.reduce((s, c) => s + Number(c.credit_balance), 0)
  const totalReferrals = codes.reduce((s, c) => s + c.referral_count, 0)
  const totalActive = codes.reduce((s, c) => s + Number(c.active_count), 0)

  // ── Actions ──
  const createCode = async () => {
    if (!newCode.referrer_name || !newCode.referrer_email) return
    setSaving(true)
    try {
      const res = await fetch(API, { method: 'POST', headers, body: JSON.stringify(newCode) })
      if (res.ok) { setShowNewCode(false); setNewCode({ facility_id: '', referrer_name: '', referrer_email: '' }); fetchCodes() }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const submitReferral = async () => {
    if (!selectedCode || !newRef.referred_name || !newRef.referred_email) return
    setSaving(true)
    try {
      const res = await fetch(`${API}?action=refer`, {
        method: 'POST', headers,
        body: JSON.stringify({ referral_code_id: selectedCode.id, ...newRef }),
      })
      if (res.ok) {
        setShowNewReferral(false)
        setNewRef({ referred_name: '', referred_email: '', referred_phone: '', facility_name: '', facility_location: '', notes: '' })
        fetchReferrals(selectedCode.id); fetchCodes()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const updateReferralStatus = async (referralId: string, status: string) => {
    try {
      await fetch(`${API}?action=status`, { method: 'PATCH', headers, body: JSON.stringify({ referral_id: referralId, status }) })
      if (selectedCode) { fetchReferrals(selectedCode.id); fetchCredits(selectedCode.id); fetchCodes() }
    } catch { /* ignore */ }
  }

  const redeemCredits = async () => {
    if (!selectedCode || !redeemAmount) return
    const amount = parseFloat(redeemAmount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    try {
      const res = await fetch(`${API}?action=redeem`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ code_id: selectedCode.id, amount, description: redeemDesc || 'Account credit applied' }),
      })
      if (res.ok) {
        setShowRedeemForm(false); setRedeemAmount(''); setRedeemDesc('')
        fetchCredits(selectedCode.id); fetchCodes()
        // Refresh selected code balance
        const updated = await fetch(API, { headers })
        if (updated.ok) {
          const data = await updated.json()
          const refreshed = (data.codes || []).find((c: ReferralCode) => c.id === selectedCode.id)
          if (refreshed) setSelectedCode(refreshed)
        }
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const deleteReferral = async (referralId: string) => {
    await updateReferralStatus(referralId, 'churned')
  }

  // ═══════════════════════════════════════════════════
  //  DETAIL VIEW — specific referral code
  // ═══════════════════════════════════════════════════
  if (selectedCode) {
    const funnel = getFunnelData()
    const maxFunnel = Math.max(...funnel.map(f => f.count), 1)

    return (
      <div className="space-y-6">
        {/* Header with back + code info */}
        <div className="flex items-start gap-3">
          <button onClick={() => { setSelectedCode(null); setSubTab('overview') }} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={18} className={sub} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-bold ${text}`}>{selectedCode.referrer_name}</h2>
            <p className={`text-sm ${sub}`}>{selectedCode.referrer_email}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={getEmailShareLink(selectedCode.code, selectedCode.referrer_name)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Mail size={14} /> Share via Email
            </a>
            <button onClick={() => fetchReferrals(selectedCode.id)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Shareable link card */}
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-emerald-500" />
            <span className={`text-sm font-semibold ${text}`}>Referral Link</span>
            <span className={`text-xs ${sub}`}>— share this at conferences or send directly</span>
          </div>
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border font-mono text-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'}`}>
              <Link2 size={14} className="flex-shrink-0 opacity-50" />
              <span className="truncate select-all">{getReferralLink(selectedCode.code)}</span>
            </div>
            <button
              onClick={() => copyToClipboard(getReferralLink(selectedCode.code), `link-${selectedCode.code}`)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                copiedId === `link-${selectedCode.code}`
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {copiedId === `link-${selectedCode.code}` ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => copyToClipboard(selectedCode.code, `code-${selectedCode.code}`)}
              className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded transition-colors ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {copiedId === `code-${selectedCode.code}` ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              Code: {selectedCode.code}
            </button>
            <span className={`text-xs ${sub}`}>Created {new Date(selectedCode.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Referrals', value: selectedCode.referral_count, icon: Users, color: 'text-blue-500' },
            { label: 'Active', value: selectedCode.active_count, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Conversion', value: `${getConversionRate()}%`, icon: TrendingUp, color: 'text-indigo-500' },
            { label: 'Credits Earned', value: `$${Number(selectedCode.total_earned).toLocaleString()}`, icon: Trophy, color: 'text-amber-500' },
            { label: 'Balance', value: `$${Number(selectedCode.credit_balance).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${card}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={14} className={color} />
                <span className={`text-xs font-medium ${sub}`}>{label}</span>
              </div>
              <p className={`text-lg font-bold ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Conversion funnel */}
        {referrals.length > 0 && (
          <div className={`rounded-xl border p-4 ${card}`}>
            <h3 className={`text-sm font-semibold mb-3 ${text}`}>
              <BarChart3 size={16} className="inline mr-1.5 text-indigo-500" />
              Conversion Funnel
            </h3>
            <div className="space-y-2">
              {funnel.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className={`text-xs w-20 text-right ${sub}`}>{stage.label}</span>
                  <div className={`flex-1 h-7 rounded-md overflow-hidden ${muted}`}>
                    <div
                      className={`h-full ${FUNNEL_COLORS[i]} rounded-md transition-all flex items-center px-2`}
                      style={{ width: `${Math.max((stage.count / maxFunnel) * 100, stage.count > 0 ? 8 : 0)}%` }}
                    >
                      {stage.count > 0 && <span className="text-xs font-medium text-white">{stage.count}</span>}
                    </div>
                  </div>
                  {i < funnel.length - 1 && funnel[i].count > 0 && (
                    <span className={`text-xs w-12 ${sub}`}>
                      {funnel[i + 1].count > 0 ? `${Math.round((funnel[i + 1].count / funnel[i].count) * 100)}%` : '0%'}
                    </span>
                  )}
                  {i === funnel.length - 1 && <span className="w-12" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-tabs */}
        <div className={`flex gap-1 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {([
            ['referrals', 'Referrals', Users],
            ['credits', 'Credit Ledger', DollarSign],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                subTab === id
                  ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                  : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Referrals list ── */}
        {subTab === 'referrals' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Search referrals..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {Object.entries(REFERRAL_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button onClick={() => setShowNewReferral(true)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                <UserPlus size={14} /> Add Referral
              </button>
            </div>

            {/* New referral form */}
            {showNewReferral && (
              <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
                <h4 className={`text-sm font-semibold ${text}`}>Refer an Operator</h4>
                <p className={`text-xs ${sub}`}>Met someone at a conference? Add them here and we'll track the referral.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Operator Name *</label>
                    <input className={inputClass} placeholder="e.g. John Smith" value={newRef.referred_name} onChange={e => setNewRef({ ...newRef, referred_name: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Email *</label>
                    <input className={inputClass} placeholder="john@storage.com" type="email" value={newRef.referred_email} onChange={e => setNewRef({ ...newRef, referred_email: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Phone</label>
                    <input className={inputClass} placeholder="(555) 123-4567" value={newRef.referred_phone} onChange={e => setNewRef({ ...newRef, referred_phone: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Facility Name</label>
                    <input className={inputClass} placeholder="ABC Self Storage" value={newRef.facility_name} onChange={e => setNewRef({ ...newRef, facility_name: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Facility Location</label>
                    <input className={inputClass} placeholder="City, ST" value={newRef.facility_location} onChange={e => setNewRef({ ...newRef, facility_location: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Notes</label>
                    <input className={inputClass} placeholder="Where you met, context, etc." value={newRef.notes} onChange={e => setNewRef({ ...newRef, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNewReferral(false)} className={`px-3 py-1.5 text-sm rounded-lg ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Cancel</button>
                  <button onClick={submitReferral} disabled={saving || !newRef.referred_name || !newRef.referred_email} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit Referral
                  </button>
                </div>
              </div>
            )}

            {/* Referral cards */}
            {filteredReferrals.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${card}`}>
                <Users size={32} className={`mx-auto mb-2 ${sub}`} />
                <p className={`text-sm ${sub}`}>
                  {referrals.length === 0
                    ? 'No referrals yet. Share the link at your next conference!'
                    : 'No referrals match your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReferrals.map(ref => {
                  const daysSince = Math.floor((Date.now() - new Date(ref.created_at).getTime()) / 86400000)
                  return (
                    <div key={ref.id} className={`rounded-xl border p-4 ${card}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            ref.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            ref.status === 'churned' ? 'bg-red-100 text-red-700' :
                            darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ref.referred_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium ${text}`}>{ref.referred_name}</p>
                            <p className={`text-sm ${sub} truncate`}>{ref.referred_email}{ref.referred_phone ? ` · ${ref.referred_phone}` : ''}</p>
                            {ref.facility_name && (
                              <p className={`text-xs mt-0.5 ${sub}`}>{ref.facility_name}{ref.facility_location ? ` — ${ref.facility_location}` : ''}</p>
                            )}
                            {ref.notes && <p className={`text-xs mt-1 italic ${sub}`}>{ref.notes}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            {ref.credit_amount > 0 && (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+${ref.credit_amount}</span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REFERRAL_STATUS_COLORS[ref.status] || 'bg-slate-100 text-slate-600'}`}>
                              {REFERRAL_STATUS_LABELS[ref.status] || ref.status}
                            </span>
                          </div>
                          <span className={`text-xs ${sub}`}>
                            {daysSince === 0 ? 'Today' : daysSince === 1 ? '1 day ago' : `${daysSince}d ago`}
                          </span>
                        </div>
                      </div>
                      {/* Status timeline */}
                      <div className={`flex items-center gap-1 mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        {FUNNEL_STAGES.map((stage, i) => {
                          const stageIndex = FUNNEL_STAGES.indexOf(ref.status as typeof FUNNEL_STAGES[number])
                          const isReached = stageIndex >= i
                          const isCurrent = ref.status === stage
                          return (
                            <div key={stage} className="flex items-center gap-1 flex-1">
                              <button
                                onClick={() => updateReferralStatus(ref.id, stage)}
                                className={`flex-1 text-xs py-1 px-1.5 rounded text-center transition-colors ${
                                  isCurrent
                                    ? `${FUNNEL_COLORS[i]} text-white font-medium`
                                    : isReached
                                      ? darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                                      : darkMode ? 'bg-slate-700/50 text-slate-500 hover:bg-slate-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                {FUNNEL_LABELS[stage]}
                              </button>
                              {i < FUNNEL_STAGES.length - 1 && <ArrowRight size={10} className={sub} />}
                            </div>
                          )
                        })}
                        <button
                          onClick={() => deleteReferral(ref.id)}
                          className={`ml-1 p-1 rounded transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-slate-700' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Credit ledger ── */}
        {subTab === 'credits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${text}`}>Credit History</h3>
              {Number(selectedCode.credit_balance) > 0 && (
                <button
                  onClick={() => setShowRedeemForm(!showRedeemForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Gift size={14} /> Redeem Credits
                </button>
              )}
            </div>

            {/* Redeem form */}
            {showRedeemForm && (
              <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${text}`}>Redeem Credits</h4>
                  <span className={`text-sm ${sub}`}>Available: <strong className="text-emerald-600">${Number(selectedCode.credit_balance).toLocaleString()}</strong></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Amount ($) *</label>
                    <input className={inputClass} type="number" placeholder="0.00" min="1" max={Number(selectedCode.credit_balance)} value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${sub} mb-1 block`}>Description</label>
                    <input className={inputClass} placeholder="Applied to March invoice" value={redeemDesc} onChange={e => setRedeemDesc(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowRedeemForm(false)} className={`px-3 py-1.5 text-sm rounded-lg ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Cancel</button>
                  <button
                    onClick={redeemCredits}
                    disabled={saving || !redeemAmount || parseFloat(redeemAmount) <= 0 || parseFloat(redeemAmount) > Number(selectedCode.credit_balance)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                    Apply Credit
                  </button>
                </div>
              </div>
            )}

            {credits.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${card}`}>
                <DollarSign size={32} className={`mx-auto mb-2 ${sub}`} />
                <p className={`text-sm ${sub}`}>No credits yet. Credits are earned when referrals sign up and go active.</p>
              </div>
            ) : (
              <div className={`rounded-xl border overflow-hidden ${card}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={muted}>
                      <th className={`text-left px-4 py-2.5 font-medium ${sub}`}>Date</th>
                      <th className={`text-left px-4 py-2.5 font-medium ${sub}`}>Type</th>
                      <th className={`text-left px-4 py-2.5 font-medium ${sub}`}>Description</th>
                      <th className={`text-right px-4 py-2.5 font-medium ${sub}`}>Amount</th>
                      <th className={`text-right px-4 py-2.5 font-medium ${sub}`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map(c => (
                      <tr key={c.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        <td className={`px-4 py-2.5 ${sub}`}>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            c.type === 'earned' ? 'bg-emerald-100 text-emerald-700' :
                            c.type === 'bonus' ? 'bg-amber-100 text-amber-700' :
                            c.type === 'redeemed' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.type}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 ${text}`}>{c.description}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${c.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {c.amount > 0 ? '+' : ''}${Math.abs(c.amount).toLocaleString()}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${sub}`}>${Number(c.balance_after).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════
  //  MAIN OVERVIEW
  // ═══════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${text}`}>Referral Network</h2>
          <p className={`text-sm ${sub}`}>Operators refer operators. Storage conferences are tight-knit — word of mouth is the channel.</p>
        </div>
        <button onClick={() => setShowNewCode(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> New Referral Code
        </button>
      </div>

      {/* Program summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals', value: totalReferrals, icon: Users, color: 'text-blue-500' },
          { label: 'Active Clients', value: totalActive, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Total Credits Earned', value: `$${totalCreditsEarned.toLocaleString()}`, icon: Trophy, color: 'text-amber-500' },
          { label: 'Outstanding Balance', value: `$${totalBalance.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className={`text-xs font-medium uppercase tracking-wide ${sub}`}>{label}</span>
            </div>
            <p className={`text-xl font-bold ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Credit tier explainer */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h3 className={`text-sm font-semibold mb-3 ${text}`}>
          <Gift size={16} className="inline mr-1.5 text-emerald-500" />
          How Credits Work
        </h3>
        {/* Per-referral value callout */}
        <div className={`rounded-lg p-4 mb-3 border-2 border-emerald-500/30 ${darkMode ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className={`text-2xl font-black text-emerald-600`}>$198</p>
              <p className={`text-xs font-medium ${sub}`}>per referral</p>
            </div>
            <div className={`flex-1 min-w-[200px]`}>
              <p className={`text-sm font-semibold ${text}`}>Every referral earns you 2 months free.</p>
              <p className={`text-xs mt-0.5 ${sub}`}>$99 when they sign up + $99 when they go active. That's $198 in credits applied directly to your StowStack bill. Refer 5 operators and you've earned $1,490 in credits.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CREDIT_TIERS.map(tier => {
            const TierIcon = tier.icon
            return (
              <div key={tier.label} className={`rounded-lg p-3 text-center ${muted}`}>
                <TierIcon size={20} className="mx-auto mb-1.5 text-emerald-500" />
                <p className="text-lg font-bold text-emerald-600">${tier.amount}</p>
                <p className={`text-xs font-medium ${text}`}>{tier.label}</p>
                <p className={`text-xs mt-1 ${sub}`}>{tier.desc}</p>
              </div>
            )
          })}
        </div>
        {/* Mega bonus callout */}
        <div className={`flex items-center gap-3 mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${darkMode ? 'bg-amber-900/50' : 'bg-amber-100'}`}>
            <Trophy size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${text}`}>Network Builder: <span className="text-amber-500">${MEGA_BONUS.amount.toLocaleString()} bonus</span> at {MEGA_BONUS.threshold} active referrals</p>
            <p className={`text-xs ${sub}`}>{MEGA_BONUS.desc}</p>
          </div>
        </div>
        <div className={`flex items-start gap-2 mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <AlertCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className={`text-xs ${sub}`}>
            Credits are applied directly to your StowStack invoice. Credits never expire, stack with milestone bonuses, and have no cap. A 5-referral operator earns <strong className="text-emerald-600">$1,490</strong> total ($198 × 5 per-referral + $200 at 3 + $500 at 5).
          </p>
        </div>
      </div>

      {/* Top tabs */}
      <div className={`flex gap-1 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {([
          ['overview', 'Referral Codes', Link2],
          ['leaderboard', 'Leaderboard', Trophy],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              subTab === id
                ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* New code form */}
      {showNewCode && (
        <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
          <h4 className={`text-sm font-semibold ${text}`}>Create Referral Code</h4>
          <p className={`text-xs ${sub}`}>Generate a unique code for an operator. They'll get a shareable link like <span className="font-mono">stowstack.co/r/CODE</span>.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-xs font-medium ${sub} mb-1 block`}>Referrer Name *</label>
              <input className={inputClass} placeholder="e.g. Mike Johnson" value={newCode.referrer_name} onChange={e => setNewCode({ ...newCode, referrer_name: e.target.value })} />
            </div>
            <div>
              <label className={`text-xs font-medium ${sub} mb-1 block`}>Referrer Email *</label>
              <input className={inputClass} placeholder="mike@storage.com" type="email" value={newCode.referrer_email} onChange={e => setNewCode({ ...newCode, referrer_email: e.target.value })} />
            </div>
            <div>
              <label className={`text-xs font-medium ${sub} mb-1 block`}>Facility ID</label>
              <input className={inputClass} placeholder="Optional — UUID" value={newCode.facility_id} onChange={e => setNewCode({ ...newCode, facility_id: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewCode(false)} className={`px-3 py-1.5 text-sm rounded-lg ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Cancel</button>
            <button onClick={createCode} disabled={saving || !newCode.referrer_name || !newCode.referrer_email} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Generate Code
            </button>
          </div>
        </div>
      )}

      {/* ── Codes list ── */}
      {subTab === 'overview' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : codes.length === 0 ? (
          <div className={`rounded-xl border p-12 text-center ${card}`}>
            <Link2 size={40} className={`mx-auto mb-3 ${sub}`} />
            <p className={`font-medium ${text}`}>No referral codes yet</p>
            <p className={`text-sm mt-1 mb-4 ${sub}`}>Create a code for an operator to start sharing at conferences and in their network.</p>
            <button onClick={() => setShowNewCode(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus size={16} /> Create First Code
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {codes.map(code => {
              const link = getReferralLink(code.code)
              return (
                <div key={code.id} className={`rounded-xl border transition-all hover:shadow-md ${card}`}>
                  <div className="p-4 cursor-pointer" onClick={() => setSelectedCode(code)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                          {code.referrer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-medium ${text}`}>{code.referrer_name}</p>
                          <p className={`text-xs ${sub}`}>{code.referrer_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className={`text-sm font-medium ${text}`}>{code.referral_count} referrals</p>
                          <p className={`text-xs ${sub}`}>{code.active_count} active</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">${Number(code.credit_balance).toLocaleString()}</p>
                          <p className={`text-xs ${sub}`}>${Number(code.total_earned).toLocaleString()} earned</p>
                        </div>
                        <ChevronRight size={16} className={sub} />
                      </div>
                    </div>
                  </div>
                  {/* Inline shareable link */}
                  <div className={`px-4 pb-3 pt-0 flex items-center gap-2`}>
                    <div className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono truncate ${darkMode ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                      <Link2 size={12} className="flex-shrink-0 opacity-50" />
                      <span className="truncate">{link}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); copyToClipboard(link, `list-${code.code}`) }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        copiedId === `list-${code.code}`
                          ? 'bg-emerald-100 text-emerald-700'
                          : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {copiedId === `list-${code.code}` ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                    <a
                      href={getEmailShareLink(code.code, code.referrer_name)}
                      onClick={e => e.stopPropagation()}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Mail size={12} /> Email
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Leaderboard ── */}
      {subTab === 'leaderboard' && (
        <div className="space-y-3">
          {leaders.length === 0 ? (
            <div className={`rounded-xl border p-12 text-center ${card}`}>
              <Trophy size={40} className={`mx-auto mb-3 ${sub}`} />
              <p className={`font-medium ${text}`}>No referrals yet</p>
              <p className={`text-sm mt-1 ${sub}`}>The leaderboard populates as operators start referring.</p>
            </div>
          ) : (<>
            {/* Top 3 podium */}
            {leaders.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[leaders[1], leaders[0], leaders[2]].map((leader, displayIdx) => {
                  const actualRank = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2
                  const RankIcon = RANK_ICONS[actualRank]
                  const rankColor = RANK_COLORS[actualRank]
                  const podiumHeight = displayIdx === 1 ? 'pt-0' : 'pt-6'
                  return (
                    <div key={leader.id} className={podiumHeight}>
                      <div className={`rounded-xl border p-4 text-center ${card} ${displayIdx === 1 ? 'ring-2 ring-yellow-400/50' : ''}`}>
                        <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2 ${
                          actualRank === 0 ? 'bg-yellow-100' : actualRank === 1 ? 'bg-slate-100' : 'bg-amber-100'
                        }`}>
                          <RankIcon size={24} className={rankColor} />
                        </div>
                        <p className={`font-bold text-sm ${text}`}>{leader.referrer_name}</p>
                        <p className={`text-xs font-mono mt-0.5 ${sub}`}>{leader.code}</p>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-lg font-bold text-emerald-600">{leader.referral_count}</p>
                          <p className={`text-xs ${sub}`}>referrals</p>
                          <p className={`text-xs font-medium ${text}`}>${Number(leader.total_earned).toLocaleString()} earned</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Rest of leaderboard */}
            {leaders.slice(leaders.length >= 3 ? 3 : 0).map((leader, i) => {
              const rank = (leaders.length >= 3 ? 3 : 0) + i
              return (
                <div key={leader.id} className={`rounded-xl border p-4 flex items-center gap-4 ${card}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${text}`}>{leader.referrer_name}</p>
                    <p className={`text-xs font-mono ${sub}`}>{leader.code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${text}`}>{leader.referral_count} referrals</p>
                    <p className={`text-xs ${sub}`}>{leader.active_referrals} active</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-bold text-emerald-600">${Number(leader.total_earned).toLocaleString()}</p>
                    <p className={`text-xs ${sub}`}>earned</p>
                  </div>
                </div>
              )
            })}
          </>)}
        </div>
      )}
    </div>
  )
}
