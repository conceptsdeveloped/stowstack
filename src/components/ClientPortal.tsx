import { useState, useEffect } from 'react'
import {
  Building2, TrendingUp, DollarSign, Users, BarChart3,
  Phone, Mail, ArrowLeft, Loader2, LogOut,
  Target, Eye, MousePointerClick, CheckCircle2, ClipboardList,
  MessageSquare, ArrowUpRight, ArrowDownRight, Send
} from 'lucide-react'
import OnboardingWizard from './OnboardingWizard'
import { usePMSData } from '@/hooks/usePMSData'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

/* ── Types ── */

interface ClientData {
  facilityId?: string
  email: string
  name: string
  facilityName: string
  location: string
  occupancyRange: string
  totalUnits: string
  signedAt: string
  accessCode: string
  campaigns: Campaign[]
  monthlyGoal?: number
}

interface Campaign {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  costPerMoveIn: number
  roas: number
  occupancyDelta: number
}

/* ── Helpers ── */

const STORAGE_KEY = 'stowstack_client'

const OCCUPANCY_LABELS: Record<string, string> = {
  'below-60': 'Below 60%',
  '60-75': '60–75%',
  '75-85': '75–85%',
  '85-95': '85–95%',
  'above-95': 'Above 95%',
}

/* ── Login Screen ── */

function ClientLogin({ onAuth }: { onAuth: (data: ClientData) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !code.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/client-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), accessCode: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: email.trim(), accessCode: code.trim(), _loginAt: Date.now() }))
      onAuth(data.client)
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  const submitForgotCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      await fetch('/api/resend-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      setForgotSent(true)
    } catch { /* silent */ }
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Client Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {showForgot ? 'Recover your access code' : 'Sign in with your email and access code'}
          </p>
        </div>

        {showForgot ? (
          forgotSent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Mail size={20} className="text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600">
                If an account exists with that email, we've sent your access code. Check your inbox.
              </p>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setEmail(forgotEmail) }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submitForgotCode} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!forgotEmail.trim() || forgotLoading}
                className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {forgotLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {forgotLoading ? 'Sending...' : 'Send Access Code'}
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                autoFocus
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
                  error ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              <input
                type="text"
                placeholder="Access code"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 font-mono tracking-wider ${
                  error ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={!email.trim() || !code.trim() || loading}
                className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'View My Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                className="w-full text-xs text-slate-400 hover:text-emerald-500 transition-colors"
              >
                Forgot your access code?
              </button>
            </form>
            <p className="text-xs text-slate-400 text-center mt-4">
              By signing in, you agree to our <a href="/terms" className="text-emerald-600 hover:text-emerald-700">Terms of Service</a> and <a href="/privacy" className="text-emerald-600 hover:text-emerald-700">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Dashboard ── */

function ClientDashboard({ client, onLogout, onBack }: { client: ClientData; onLogout: () => void; onBack: () => void }) {
  const [onboardingPct, setOnboardingPct] = useState<number | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; timestamp: string }[]>([])
  const [msgText, setMsgText] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const { data: pmsData } = usePMSData(client.facilityId || null)
  const [liveAttribution, setLiveAttribution] = useState<{
    hasData: boolean
    totals: { spend: number; leads: number; move_ins: number; revenue: number; cpl: number; cost_per_move_in: number; roas: number }
    campaigns: { campaign: string; spend: number; leads: number; move_ins: number; cpl: number; roas: number }[]
  } | null>(null)

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams({ code: client.accessCode, email: client.email })
      const res = await fetch(`/api/client-messages?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.warn('[ClientPortal] Failed to fetch messages:', err)
    }
  }

  useEffect(() => {
    const fetchOnboarding = async () => {
      try {
        const params = new URLSearchParams({ code: client.accessCode, email: client.email })
        const res = await fetch(`/api/client-onboarding?${params}`)
        if (res.ok) {
          const json = await res.json()
          setOnboardingPct(json.completionPct)
        }
      } catch (err) {
        console.warn('[ClientPortal] Failed to fetch onboarding:', err)
      }
    }
    fetchOnboarding()
    fetchMessages()
    // Fetch live attribution data
    const fetchAttribution = async () => {
      try {
        const res = await fetch(`/api/attribution?accessCode=${encodeURIComponent(client.accessCode)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.hasData) setLiveAttribution(data)
        }
      } catch (err) {
        console.warn('[ClientPortal] Failed to fetch attribution:', err)
      }
    }
    fetchAttribution()
    // Poll messages every 30s
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [client.accessCode, client.email])

  const sendMessage = async () => {
    if (!msgText.trim()) return
    setMsgSending(true)
    try {
      const res = await fetch('/api/client-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: client.accessCode, email: client.email, text: msgText.trim(), from: 'client' }),
      })
      if (res.ok) {
        setMsgText('')
        fetchMessages()
      }
    } catch (err) {
      console.warn('[ClientPortal] Failed to send message:', err)
    }
    setMsgSending(false)
  }

  const hasCampaigns = client.campaigns && client.campaigns.length > 0

  // Compute totals
  const totals = hasCampaigns ? client.campaigns.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    leads: acc.leads + c.leads,
    moveIns: acc.moveIns + c.moveIns,
  }), { spend: 0, leads: 0, moveIns: 0 }) : null

  const avgCpl = totals && totals.leads > 0 ? totals.spend / totals.leads : 0
  const latestRoas = hasCampaigns ? client.campaigns[client.campaigns.length - 1].roas : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{client.facilityName}</h1>
              <p className="text-xs text-slate-500 -mt-0.5">{client.location}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-600 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-xl font-bold">Welcome back, {client.name.split(' ')[0]}</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {hasCampaigns
              ? `Your campaigns have generated ${totals!.leads} leads and ${totals!.moveIns} move-ins so far.`
              : 'Your campaign is being set up. Performance data will appear here once your first ads go live.'
            }
          </p>
        </div>

        {/* Onboarding CTA */}
        {onboardingPct != null && onboardingPct < 100 && (
          <div className="bg-white rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Complete your campaign setup</p>
              <p className="text-xs text-slate-500 mt-0.5">Help us build the perfect ad campaign by sharing details about your facility.</p>
              <div className="flex gap-1 mt-2 max-w-[200px]">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.round(onboardingPct / 20) ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
            >
              Continue Setup
            </button>
          </div>
        )}
        {onboardingPct === 100 && (
          <div className="flex items-center gap-2 mb-4 text-xs text-emerald-600">
            <CheckCircle2 size={14} /> Campaign setup complete
          </div>
        )}

        {showWizard && (
          <OnboardingWizard
            accessCode={client.accessCode}
            clientEmail={client.email}
            onClose={() => setShowWizard(false)}
            onCompletionChange={setOnboardingPct}
          />
        )}

        {/* Campaign Goal Progress */}
        {hasCampaigns && client.monthlyGoal && client.monthlyGoal > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-emerald-600" />
                <span className="text-sm font-semibold">Monthly Move-In Target</span>
              </div>
              <span className="text-sm font-bold">
                {client.campaigns[client.campaigns.length - 1].moveIns} / {client.monthlyGoal}
              </span>
            </div>
            {(() => {
              const current = client.campaigns[client.campaigns.length - 1].moveIns
              const pct = Math.min(100, Math.round((current / client.monthlyGoal) * 100))
              return (
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )
            })()}
          </div>
        )}

        {/* Monthly Digest (compare last 2 months) */}
        {hasCampaigns && client.campaigns.length >= 2 && (() => {
          const curr = client.campaigns[client.campaigns.length - 1]
          const prev = client.campaigns[client.campaigns.length - 2]
          const pctChange = (c: number, p: number) => p > 0 ? Math.round(((c - p) / p) * 100) : 0
          const metrics = [
            { label: 'Leads', curr: curr.leads, prev: prev.leads, better: 'up' as const },
            { label: 'CPL', curr: curr.cpl, prev: prev.cpl, better: 'down' as const },
            { label: 'Move-Ins', curr: curr.moveIns, prev: prev.moveIns, better: 'up' as const },
            { label: 'ROAS', curr: curr.roas, prev: prev.roas, better: 'up' as const },
          ]
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3">Month-over-Month</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {metrics.map(m => {
                  const change = pctChange(m.curr, m.prev)
                  const isPositive = m.better === 'up' ? change > 0 : change < 0
                  const isNeutral = change === 0
                  return (
                    <div key={m.label} className="text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{m.label}</p>
                      <p className="text-lg font-bold">
                        {m.label === 'CPL' ? `$${m.curr.toFixed(0)}` : m.label === 'ROAS' ? `${m.curr}x` : m.curr}
                      </p>
                      <div className={`flex items-center justify-center gap-0.5 text-xs font-medium ${
                        isNeutral ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {!isNeutral && (isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />)}
                        {Math.abs(change)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Live Attribution Section — shows real tracked data */}
        {liveAttribution && liveAttribution.hasData && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-sm">Live Attribution</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">Tracked Leads</div>
                <div className="text-xl font-bold text-slate-900">{liveAttribution.totals.leads}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">Move-Ins</div>
                <div className="text-xl font-bold text-emerald-600">{liveAttribution.totals.move_ins}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">Cost / Move-In</div>
                <div className="text-xl font-bold text-slate-900">${liveAttribution.totals.cost_per_move_in.toFixed(0)}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500 mb-1">ROAS</div>
                <div className={`text-xl font-bold ${liveAttribution.totals.roas >= 3 ? 'text-emerald-600' : liveAttribution.totals.roas >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                  {liveAttribution.totals.roas.toFixed(1)}x
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Tracked end-to-end: ad click → landing page → lead → move-in. Revenue annualized for ROAS calculation.</p>
          </div>
        )}

        {hasCampaigns ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <KpiCard icon={Users} label="Total Leads" value={totals!.leads.toString()} />
              <KpiCard icon={DollarSign} label="Avg CPL" value={`$${avgCpl.toFixed(2)}`} />
              <KpiCard icon={Target} label="Move-Ins" value={totals!.moveIns.toString()} accent />
              <KpiCard icon={TrendingUp} label="Latest ROAS" value={`${latestRoas}x`} />
            </div>

            {/* Charts */}
            {client.campaigns.length >= 2 && (
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* CPL Trend */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">Cost Per Lead</h3>
                    {client.campaigns.length >= 2 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        client.campaigns[client.campaigns.length - 1].cpl <= client.campaigns[0].cpl
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {client.campaigns[client.campaigns.length - 1].cpl <= client.campaigns[0].cpl ? '↓' : '↑'}
                        ${Math.abs(client.campaigns[client.campaigns.length - 1].cpl - client.campaigns[0].cpl).toFixed(0)} vs first month
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Trend over campaign lifetime</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={client.campaigns} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="cplGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip
                        formatter={(v) => [`$${Number(v).toFixed(2)}`, 'CPL']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="cpl" stroke="#10b981" strokeWidth={2} fill="url(#cplGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Leads vs Move-Ins */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">Leads vs. Move-Ins</h3>
                    <span className="text-xs text-slate-500">
                      {totals!.leads > 0 ? Math.round((totals!.moveIns / totals!.leads) * 100) : 0}% conversion
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Monthly lead volume and move-in conversions</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={client.campaigns} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                      <Bar dataKey="leads" name="Leads" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="moveIns" name="Move-Ins" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ROAS Trend — only show if 3+ months */}
            {client.campaigns.length >= 3 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Return on Ad Spend (ROAS)</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    latestRoas >= 3 ? 'bg-emerald-50 text-emerald-700' : latestRoas >= 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Current: {latestRoas}x
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">ROAS improves as Pixel data matures and audiences sharpen</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={client.campaigns} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}x`} />
                    <Tooltip
                      formatter={(v) => [`${v}x`, 'ROAS']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    />
                    <Bar dataKey="roas" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {client.campaigns.map((c, i) => (
                        <Cell key={i} fill={c.roas >= 3 ? '#10b981' : c.roas >= 2 ? '#f59e0b' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold">Monthly Performance</h3>
                <p className="text-xs text-slate-500">Campaign metrics by month</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Month</th>
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Spend</th>
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Leads</th>
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">CPL</th>
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Move-Ins</th>
                      <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.campaigns.map((c, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium">{c.month}</td>
                        <td className="px-5 py-3 text-right text-slate-600">${c.spend.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{c.leads}</td>
                        <td className="px-5 py-3 text-right text-slate-600">${c.cpl.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right font-medium text-emerald-600">{c.moveIns}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-medium ${c.roas >= 3 ? 'text-emerald-600' : c.roas >= 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {c.roas}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">${totals!.spend.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">{totals!.leads}</td>
                      <td className="px-5 py-3 text-right">${avgCpl.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">{totals!.moveIns}</td>
                      <td className="px-5 py-3 text-right">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Pre-campaign state */
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="font-semibold mb-4">Getting Started</h3>
            <div className="space-y-4">
              {[
                { icon: CheckCircle2, label: 'Signed on with StowStack by StorageAds.com', done: true },
                { icon: ClipboardList, label: 'Campaign onboarding info submitted', done: onboardingPct === 100 },
                { icon: Eye, label: 'Market & funnel audit in progress', done: false },
                { icon: MousePointerClick, label: 'Campaign build & creative development', done: false },
                { icon: BarChart3, label: 'Campaigns go live — performance data appears here', done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <step.icon size={16} />
                  </div>
                  <span className={`text-sm ${step.done ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MessageSquare size={14} className="text-emerald-600" /> Messages
          </h3>
          {messages.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
              {messages.map(m => (
                <div key={m.id} className={`text-sm rounded-lg p-3 border ${
                  m.from === 'client' ? 'bg-emerald-50 border-emerald-100 ml-8' : 'bg-slate-50 border-slate-100 mr-8'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">{m.from === 'client' ? 'You' : 'StowStack'}</span>
                    <span className="text-[10px] text-slate-300">{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700">{m.text}</p>
                </div>
              ))}
            </div>
          )}
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 mb-3">No messages yet. Send a message to your StowStack team below.</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && msgText.trim()) sendMessage() }}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            <button
              onClick={sendMessage}
              disabled={!msgText.trim() || msgSending}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Send size={12} />
              {msgSending ? '...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Unit Mix from PMS Data */}
        {pmsData && pmsData.units.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold">Unit Mix & Availability</h3>
              <p className="text-xs text-slate-500">Current inventory from your property management system</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-b border-slate-100">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Units</p>
                <p className="text-2xl font-bold">{pmsData.totalUnits}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Occupancy</p>
                <p className="text-2xl font-bold">{pmsData.occupancyPct.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Vacant</p>
                <p className="text-2xl font-bold text-red-500">{pmsData.vacantUnits}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">${pmsData.actualRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Unit Type</th>
                    <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Units</th>
                    <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Rate</th>
                    <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Vacant</th>
                    <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Lost MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {pmsData.unitMix.map(u => (
                    <tr key={u.type} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium">{u.type}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{u.count}</td>
                      <td className="px-5 py-3 text-right text-slate-600">${u.rate}/mo</td>
                      <td className={`px-5 py-3 text-right ${u.vacancy > 0 ? 'text-red-500 font-medium' : 'text-emerald-600'}`}>{u.vacancy}</td>
                      <td className="px-5 py-3 text-right text-red-500 font-medium">
                        {u.vacancy > 0 ? `-$${(u.vacancy * u.rate).toLocaleString()}/mo` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-5 py-3">Total</td>
                    <td className="px-5 py-3 text-right">{pmsData.totalUnits}</td>
                    <td className="px-5 py-3 text-right">—</td>
                    <td className="px-5 py-3 text-right text-red-500">{pmsData.vacantUnits}</td>
                    <td className="px-5 py-3 text-right text-red-500">
                      -${pmsData.unitMix.reduce((s, u) => s + (u.vacancy * u.rate), 0).toLocaleString()}/mo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {pmsData.specials.filter(s => s.active).length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Active Specials</p>
                <div className="flex flex-wrap gap-2">
                  {pmsData.specials.filter(s => s.active).map(s => (
                    <span key={s.id} className="px-3 py-1.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
          <h3 className="font-semibold text-sm mb-3">Your StowStack <span className="font-normal text-slate-400">by StorageAds.com</span> Team</h3>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:blake@storepawpaw.com" className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
              <Mail size={14} /> blake@storepawpaw.com
            </a>
            <a href="mailto:anna@storepawpaw.com" className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
              <Mail size={14} /> anna@storepawpaw.com
            </a>
            <a href="tel:+12699298541" className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
              <Phone size={14} /> (269) 929-8541
            </a>
          </div>
        </div>

        {/* Facility Info */}
        <div className="text-xs text-slate-400 mt-6 flex flex-wrap gap-4">
          <span>Occupancy at sign-on: {OCCUPANCY_LABELS[client.occupancyRange] || client.occupancyRange}</span>
          <span>Client since: {new Date(client.signedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string; value: string; accent?: boolean }) {
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

/* ── Portal Entry ── */

const CLIENT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export default function ClientPortal({ onBack }: { onBack: () => void }) {
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setClient(null)
  }

  // Try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) { setLoading(false); return }

    try {
      const parsed = JSON.parse(stored)
      const { email, accessCode, _loginAt } = parsed

      // Check session expiry
      if (_loginAt && Date.now() - _loginAt > CLIENT_SESSION_DURATION_MS) {
        localStorage.removeItem(STORAGE_KEY)
        setLoading(false)
        return
      }

      fetch('/api/client-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessCode }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.client) setClient(data.client)
          else localStorage.removeItem(STORAGE_KEY)
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY))
        .finally(() => setLoading(false))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!client) {
    return <ClientLogin onAuth={setClient} />
  }

  return <ClientDashboard client={client} onLogout={logout} onBack={onBack} />
}
