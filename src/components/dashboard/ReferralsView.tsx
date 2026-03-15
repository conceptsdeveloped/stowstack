import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Loader2, Copy, CheckCircle2, Trophy, Gift,
  DollarSign, ArrowUpRight, Send, QrCode, ChevronRight, ArrowLeft,
  Star, Award, Crown, Sparkles, Clock, XCircle, UserPlus
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
  { label: 'Signup', amount: 50, desc: 'When your referral signs up' },
  { label: 'Goes Live', amount: 150, desc: 'When they become an active client' },
  { label: '5 Referrals', amount: 250, desc: 'Milestone bonus at 5 active referrals' },
  { label: '10 Referrals', amount: 500, desc: 'Milestone bonus at 10 active referrals' },
  { label: '25 Referrals', amount: 1000, desc: 'Milestone bonus at 25 active referrals' },
]

const RANK_ICONS = [Crown, Award, Star]
const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

const API = '/api/referrals'

export default function ReferralsView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [credits, setCredits] = useState<CreditEntry[]>([])
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [subTab, setSubTab] = useState<'overview' | 'referrals' | 'credits' | 'leaderboard'>('overview')
  const [showNewCode, setShowNewCode] = useState(false)
  const [showNewReferral, setShowNewReferral] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state for new referral code
  const [newCode, setNewCode] = useState({ facility_id: '', referrer_name: '', referrer_email: '' })
  // Form state for new referral
  const [newRef, setNewRef] = useState({ referred_name: '', referred_email: '', referred_phone: '', facility_name: '', facility_location: '', notes: '' })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500`

  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey }

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(API, { headers })
      if (res.ok) {
        const data = await res.json()
        setCodes(data.codes || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [adminKey])

  const fetchReferrals = useCallback(async (codeId: string) => {
    try {
      const res = await fetch(`${API}?action=referrals&code_id=${codeId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
      }
    } catch { /* ignore */ }
  }, [adminKey])

  const fetchCredits = useCallback(async (codeId: string) => {
    try {
      const res = await fetch(`${API}?action=credits&code_id=${codeId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setCredits(data.credits || [])
      }
    } catch { /* ignore */ }
  }, [adminKey])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=leaderboard`, { headers })
      if (res.ok) {
        const data = await res.json()
        setLeaders(data.leaders || [])
      }
    } catch { /* ignore */ }
  }, [adminKey])

  useEffect(() => { fetchCodes(); fetchLeaderboard() }, [fetchCodes, fetchLeaderboard])

  useEffect(() => {
    if (selectedCode) {
      fetchReferrals(selectedCode.id)
      fetchCredits(selectedCode.id)
    }
  }, [selectedCode, fetchReferrals, fetchCredits])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`https://stowstack.co/r/${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const createCode = async () => {
    if (!newCode.referrer_name || !newCode.referrer_email) return
    setSaving(true)
    try {
      const res = await fetch(API, {
        method: 'POST', headers,
        body: JSON.stringify(newCode),
      })
      if (res.ok) {
        setShowNewCode(false)
        setNewCode({ facility_id: '', referrer_name: '', referrer_email: '' })
        fetchCodes()
      }
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
        fetchReferrals(selectedCode.id)
        fetchCodes()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const updateReferralStatus = async (referralId: string, status: string) => {
    try {
      await fetch(`${API}?action=status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ referral_id: referralId, status }),
      })
      if (selectedCode) {
        fetchReferrals(selectedCode.id)
        fetchCredits(selectedCode.id)
        fetchCodes()
      }
    } catch { /* ignore */ }
  }

  // ── Detail view for a specific referral code ──
  if (selectedCode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedCode(null); setSubTab('overview') }} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={18} className={sub} />
          </button>
          <div>
            <h2 className={`text-lg font-bold ${text}`}>{selectedCode.referrer_name}</h2>
            <p className={`text-sm ${sub}`}>{selectedCode.referrer_email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => copyCode(selectedCode.code)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono ${darkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
              {copiedCode === selectedCode.code ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {selectedCode.code}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals', value: selectedCode.referral_count, icon: Users, color: 'text-blue-500' },
            { label: 'Active', value: selectedCode.active_count, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Credits Earned', value: `$${Number(selectedCode.total_earned).toLocaleString()}`, icon: Trophy, color: 'text-amber-500' },
            { label: 'Balance', value: `$${Number(selectedCode.credit_balance).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={color} />
                <span className={`text-xs font-medium ${sub}`}>{label}</span>
              </div>
              <p className={`text-xl font-bold ${text}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {(['referrals', 'credits'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                subTab === tab
                  ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                  : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
              }`}
            >
              {tab === 'referrals' ? 'Referrals' : 'Credit Ledger'}
            </button>
          ))}
        </div>

        {/* Referrals list */}
        {subTab === 'referrals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${text}`}>Referred Operators</h3>
              <button onClick={() => setShowNewReferral(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                <UserPlus size={14} /> Add Referral
              </button>
            </div>

            {/* New referral form */}
            {showNewReferral && (
              <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
                <h4 className={`text-sm font-semibold ${text}`}>New Referral</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Operator name *" value={newRef.referred_name} onChange={e => setNewRef({ ...newRef, referred_name: e.target.value })} />
                  <input className={inputClass} placeholder="Email *" value={newRef.referred_email} onChange={e => setNewRef({ ...newRef, referred_email: e.target.value })} />
                  <input className={inputClass} placeholder="Phone" value={newRef.referred_phone} onChange={e => setNewRef({ ...newRef, referred_phone: e.target.value })} />
                  <input className={inputClass} placeholder="Facility name" value={newRef.facility_name} onChange={e => setNewRef({ ...newRef, facility_name: e.target.value })} />
                  <input className={inputClass} placeholder="Facility location" value={newRef.facility_location} onChange={e => setNewRef({ ...newRef, facility_location: e.target.value })} />
                  <input className={inputClass} placeholder="Notes" value={newRef.notes} onChange={e => setNewRef({ ...newRef, notes: e.target.value })} />
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

            {referrals.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${card}`}>
                <Users size={32} className={`mx-auto mb-2 ${sub}`} />
                <p className={`text-sm ${sub}`}>No referrals yet. Share the code at your next conference!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className={`rounded-xl border p-4 ${card}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-medium ${text}`}>{ref.referred_name}</p>
                        <p className={`text-sm ${sub}`}>{ref.referred_email}</p>
                        {ref.facility_name && <p className={`text-xs mt-1 ${sub}`}>{ref.facility_name}{ref.facility_location ? ` - ${ref.facility_location}` : ''}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {ref.credit_amount > 0 && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+${ref.credit_amount}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REFERRAL_STATUS_COLORS[ref.status] || 'bg-slate-100 text-slate-600'}`}>
                          {REFERRAL_STATUS_LABELS[ref.status] || ref.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs ${sub}`}>Update status:</span>
                      {['invited', 'signed_up', 'onboarding', 'active', 'churned'].filter(s => s !== ref.status).map(s => (
                        <button key={s} onClick={() => updateReferralStatus(ref.id, s)} className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}>
                          {REFERRAL_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    {ref.notes && <p className={`text-xs mt-2 italic ${sub}`}>{ref.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credit ledger */}
        {subTab === 'credits' && (
          <div className="space-y-3">
            <h3 className={`text-sm font-semibold ${text}`}>Credit History</h3>
            {credits.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${card}`}>
                <DollarSign size={32} className={`mx-auto mb-2 ${sub}`} />
                <p className={`text-sm ${sub}`}>No credits yet. Credits are earned when referrals sign up and go active.</p>
              </div>
            ) : (
              <div className={`rounded-xl border overflow-hidden ${card}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                      <th className={`text-left px-4 py-2 font-medium ${sub}`}>Date</th>
                      <th className={`text-left px-4 py-2 font-medium ${sub}`}>Type</th>
                      <th className={`text-left px-4 py-2 font-medium ${sub}`}>Description</th>
                      <th className={`text-right px-4 py-2 font-medium ${sub}`}>Amount</th>
                      <th className={`text-right px-4 py-2 font-medium ${sub}`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map(c => (
                      <tr key={c.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        <td className={`px-4 py-2 ${sub}`}>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            c.type === 'earned' ? 'bg-emerald-100 text-emerald-700' :
                            c.type === 'bonus' ? 'bg-amber-100 text-amber-700' :
                            c.type === 'redeemed' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.type}
                          </span>
                        </td>
                        <td className={`px-4 py-2 ${text}`}>{c.description}</td>
                        <td className={`px-4 py-2 text-right font-medium ${c.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {c.amount > 0 ? '+' : ''}${Math.abs(c.amount).toLocaleString()}
                        </td>
                        <td className={`px-4 py-2 text-right ${sub}`}>${Number(c.balance_after).toLocaleString()}</td>
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

  // ── Main overview ──
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

      {/* Credit tier explainer */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h3 className={`text-sm font-semibold mb-3 ${text}`}>
          <Gift size={16} className="inline mr-1.5 text-emerald-500" />
          How Credits Work
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CREDIT_TIERS.map(tier => (
            <div key={tier.label} className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className="text-lg font-bold text-emerald-600">${tier.amount}</p>
              <p className={`text-xs font-medium ${text}`}>{tier.label}</p>
              <p className={`text-xs mt-1 ${sub}`}>{tier.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top tabs: codes vs leaderboard */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['overview', 'leaderboard'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              subTab === tab
                ? `border-emerald-600 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`
                : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {tab === 'overview' ? 'Referral Codes' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* New code form */}
      {showNewCode && (
        <div className={`rounded-xl border p-4 space-y-3 ${card}`}>
          <h4 className={`text-sm font-semibold ${text}`}>Create Referral Code</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="Referrer name *" value={newCode.referrer_name} onChange={e => setNewCode({ ...newCode, referrer_name: e.target.value })} />
            <input className={inputClass} placeholder="Referrer email *" value={newCode.referrer_email} onChange={e => setNewCode({ ...newCode, referrer_email: e.target.value })} />
            <input className={inputClass} placeholder="Facility ID (UUID)" value={newCode.facility_id} onChange={e => setNewCode({ ...newCode, facility_id: e.target.value })} />
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

      {/* Codes list */}
      {subTab === 'overview' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : codes.length === 0 ? (
          <div className={`rounded-xl border p-12 text-center ${card}`}>
            <QrCode size={40} className={`mx-auto mb-3 ${sub}`} />
            <p className={`font-medium ${text}`}>No referral codes yet</p>
            <p className={`text-sm mt-1 ${sub}`}>Create a code for an operator to start sharing at conferences and in their network.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {codes.map(code => (
              <div key={code.id} className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${card}`} onClick={() => setSelectedCode(code)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      {code.referrer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium ${text}`}>{code.referrer_name}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); copyCode(code.code) }}
                          className={`flex items-center gap-1 text-xs font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} hover:underline`}
                        >
                          {copiedCode === code.code ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                          {code.code}
                        </button>
                        <span className={`text-xs ${sub}`}>{code.referrer_email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${text}`}>{code.referral_count} referrals</p>
                      <p className={`text-xs ${sub}`}>{code.active_count} active</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">${Number(code.credit_balance).toLocaleString()}</p>
                      <p className={`text-xs ${sub}`}>${Number(code.total_earned).toLocaleString()} earned</p>
                    </div>
                    <ChevronRight size={16} className={sub} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Leaderboard */}
      {subTab === 'leaderboard' && (
        <div className="space-y-3">
          {leaders.length === 0 ? (
            <div className={`rounded-xl border p-12 text-center ${card}`}>
              <Trophy size={40} className={`mx-auto mb-3 ${sub}`} />
              <p className={`font-medium ${text}`}>No referrals yet</p>
              <p className={`text-sm mt-1 ${sub}`}>The leaderboard populates as operators start referring.</p>
            </div>
          ) : (
            leaders.map((leader, i) => {
              const RankIcon = RANK_ICONS[i] || Star
              const rankColor = RANK_COLORS[i] || sub
              return (
                <div key={leader.id} className={`rounded-xl border p-4 flex items-center gap-4 ${card}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-amber-100 text-amber-700' :
                    darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {i < 3 ? <RankIcon size={16} className={rankColor} /> : i + 1}
                  </div>
                  <div className="flex-1">
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
            })
          )}
        </div>
      )}
    </div>
  )
}
