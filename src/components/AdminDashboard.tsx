import { useState, useEffect, useCallback } from 'react'
import {
  Building2, RefreshCw, Search, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Calendar, ArrowLeft,
  Users, TrendingUp, Clock, CheckCircle2, XCircle, Loader2,
  StickyNote, KeyRound, Copy, BarChart3, Plus, Trash2,
  DollarSign, Target, Award, ArrowUpRight, ArrowDownRight, Minus,
  ClipboardList
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

type AdminTab = 'pipeline' | 'portfolio' | 'insights'

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

  const updateLead = async (id: string, updates: { status?: string; note?: string }) => {
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

  /* ── Filtered leads ── */
  const filtered = leads.filter(l => {
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

  /* ── Pipeline counts ── */
  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const activeLeads = leads.filter(l => !['lost', 'client_signed'].includes(l.status)).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StowStack Admin</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Manage leads & campaign performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setLoading(true); fetchLeads() }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={onLogout}
              className="text-sm text-slate-400 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px">
          {([['pipeline', 'Pipeline', Users], ['portfolio', 'Portfolio', BarChart3], ['insights', 'Insights', TrendingUp]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'portfolio' && (
          <PortfolioView leads={leads} adminKey={adminKey} loading={loading} />
        )}

        {activeTab === 'insights' && (
          <InsightsView adminKey={adminKey} leads={leads} />
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
                newNote={expandedId === lead.id ? newNote : ''}
                onNewNoteChange={setNewNote}
                updating={updating === lead.id}
                adminKey={adminKey}
                score={leadScores[lead.id]}
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

function PortfolioView({ leads, adminKey, loading }: { leads: Lead[]; adminKey: string; loading: boolean }) {
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

function InsightsView({ adminKey, leads }: { adminKey: string; leads: Lead[] }) {
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

function LeadCard({ lead, expanded, onToggle, onUpdateStatus, onAddNote, newNote, onNewNoteChange, updating, adminKey, score }: {
  lead: Lead
  expanded: boolean
  onToggle: () => void
  onUpdateStatus: (status: string) => void
  onAddNote: (note: string) => void
  newNote: string
  onNewNoteChange: (v: string) => void
  updating: boolean
  adminKey: string
  score?: { score: number; grade: string; breakdown: Record<string, number> }
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
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 text-left"
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
    </div>
  )
}
