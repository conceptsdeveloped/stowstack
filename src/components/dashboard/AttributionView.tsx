import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, DollarSign, Users, TrendingUp, Target,
  ChevronDown, Flame, Download, Loader2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ConsumerLead, ConsumerLeadStatus, CONSUMER_LEAD_STATUSES } from './types'

/* ── Helpers ── */

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatCurrencyDecimal(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-red-600 bg-red-50 border-red-200'
    : score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-slate-500 bg-slate-50 border-slate-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score >= 70 && <Flame size={10} />}
      {score}
    </span>
  )
}

function StatusSelect({
  value, onChange, darkMode,
}: {
  value: ConsumerLeadStatus
  onChange: (v: ConsumerLeadStatus) => void
  darkMode: boolean
}) {
  const current = CONSUMER_LEAD_STATUSES.find(s => s.value === value)
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ConsumerLeadStatus)}
        className={`appearance-none pl-2 pr-6 py-1 rounded-lg text-xs font-medium border cursor-pointer ${current?.color || ''} ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}
      >
        {CONSUMER_LEAD_STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
    </div>
  )
}

/* ── Interfaces ── */

interface CampaignRow {
  campaign: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  move_ins: number
  revenue: number
  cpl: number
  cost_per_move_in: number
  roas: number
}

interface AttributionTotals {
  spend: number
  impressions: number
  clicks: number
  leads: number
  move_ins: number
  revenue: number
  cpl: number
  cost_per_move_in: number
  roas: number
}

interface MonthlyTrend {
  month: string
  spend: number
  leads: number
  move_ins: number
  revenue: number
  cpl: number
  roas: number
}

interface LeadSummary {
  new_count: number
  contacted_count: number
  toured_count: number
  reserved_count: number
  moved_in_count: number
  lost_count: number
  total: number
  total_revenue: number
  avg_days_to_move_in: number
}

/* ── Main Component ── */

export default function AttributionView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [leads, setLeads] = useState<ConsumerLead[]>([])
  const [summary, setSummary] = useState<LeadSummary | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [totals, setTotals] = useState<AttributionTotals | null>(null)
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [days, setDays] = useState(90)
  const [tab, setTab] = useState<'leads' | 'campaigns' | 'trend'>('leads')

  const bg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-200' : 'text-slate-900'
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

      const headers: Record<string, string> = { 'X-Admin-Key': adminKey }

      // Fetch leads, summary, and attribution in parallel
      const [leadsRes, summaryRes, attrRes] = await Promise.all([
        fetch(`/api/consumer-leads?days=${days}&limit=200${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`, { headers }),
        fetch(`/api/consumer-leads?summary=true`, { headers }),
        fetch(`/api/attribution?startDate=${startDate}&endDate=${endDate}`, { headers }),
      ])

      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads || [])
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.stats || null)
      }
      if (attrRes.ok) {
        const data = await attrRes.json()
        setCampaigns(data.campaigns || [])
        setTotals(data.totals || null)
        setMonthlyTrend(data.monthlyTrend || [])
      }
    } catch (err) {
      console.error('Attribution fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [adminKey, days, statusFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  const updateLeadStatus = async (leadId: string, status: ConsumerLeadStatus, monthlyRevenue?: number) => {
    try {
      const body: Record<string, unknown> = { leadId, status }
      if (monthlyRevenue !== undefined) body.monthlyRevenue = monthlyRevenue
      if (status === 'moved_in') body.moveInDate = new Date().toISOString().split('T')[0]

      const res = await fetch('/api/consumer-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: status, monthly_revenue: monthlyRevenue ?? l.monthly_revenue } : l))
      }
    } catch (err) {
      console.error('Status update error:', err)
    }
  }

  const syncSpend = async () => {
    setSyncing(true)
    try {
      // For now, sync all facilities — in production, let admin select facility
      const res = await fetch('/api/campaign-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: leads[0]?.facility_id }),
      })
      const data = await res.json()
      if (data.success) {
        fetchAll()
      }
    } catch {
      // silent
    } finally {
      setSyncing(false)
    }
  }

  const exportCSV = () => {
    const rows = leads.map(l => [
      l.name || '', l.email || '', l.phone || '', l.lead_status,
      l.utm_source || '', l.utm_campaign || '', l.monthly_revenue || '',
      l.created_at ? formatDate(l.created_at) : '', l.page_title || '',
    ])
    const header = ['Name', 'Email', 'Phone', 'Status', 'Source', 'Campaign', 'Monthly Revenue', 'Created', 'Landing Page']
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consumer-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${text}`}>Attribution</h2>
          <p className={`text-sm ${textMuted}`}>Ad spend to move-in revenue tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className={`text-xs px-2 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
          <button onClick={syncSpend} disabled={syncing} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Meta Spend'}
          </button>
          <button onClick={() => fetchAll()} className={`p-1.5 rounded-lg border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Leads', value: summary?.total || 0, icon: Users, format: (v: number) => String(v) },
          { label: 'Move-Ins', value: summary?.moved_in_count || 0, icon: Target, format: (v: number) => String(v) },
          { label: 'Revenue/mo', value: summary?.total_revenue || 0, icon: DollarSign, format: formatCurrency },
          { label: 'Blended CPL', value: totals?.cpl || 0, icon: TrendingUp, format: formatCurrencyDecimal },
          { label: 'ROAS', value: totals?.roas || 0, icon: TrendingUp, format: (v: number) => `${v.toFixed(1)}x` },
        ].map(({ label, value, icon: Icon, format }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={textMuted} />
              <span className={`text-xs font-medium ${textMuted}`}>{label}</span>
            </div>
            <span className={`text-xl font-bold ${text}`}>{format(value as number)}</span>
          </div>
        ))}
      </div>

      {/* Lead Funnel */}
      {summary && (
        <div className={`rounded-xl border p-4 ${bg}`}>
          <h3 className={`text-sm font-semibold mb-3 ${text}`}>Lead Funnel</h3>
          <div className="flex items-center gap-1">
            {CONSUMER_LEAD_STATUSES.map(s => {
              const count = (summary as unknown as Record<string, number>)[`${s.value}_count`] || 0
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
              return (
                <div key={s.value} className="flex-1 text-center">
                  <div className={`rounded-lg px-2 py-2 text-xs font-semibold ${s.color}`}>
                    {count}
                  </div>
                  <div className={`text-[10px] mt-1 ${textMuted}`}>{s.label}</div>
                  <div className={`text-[10px] ${textMuted}`}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1">
        {(['leads', 'campaigns', 'trend'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? `${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`
                : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {t === 'leads' ? 'Consumer Leads' : t === 'campaigns' ? 'Campaign ROAS' : 'Monthly Trend'}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {tab === 'leads' && (
        <div className={`rounded-xl border overflow-hidden ${bg}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${text}`}>Consumer Leads</span>
              <span className={`text-xs ${textMuted}`}>({leads.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`text-xs px-2 py-1 rounded border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}
              >
                <option value="all">All statuses</option>
                {CONSUMER_LEAD_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button onClick={exportCSV} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200'}`}>
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}>
                  {['Name', 'Contact', 'Source', 'Campaign', 'Score', 'Status', 'Revenue', 'When'].map(h => (
                    <th key={h} className={`text-left px-4 py-2 text-xs font-semibold ${textMuted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`px-4 py-8 text-center ${textMuted}`}>
                      No consumer leads yet. Leads appear when visitors submit forms on your landing pages.
                    </td>
                  </tr>
                ) : leads.map(lead => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    darkMode={darkMode}
                    onStatusChange={(status, revenue) => updateLeadStatus(lead.id, status, revenue)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign ROAS Table */}
      {tab === 'campaigns' && (
        <div className={`rounded-xl border overflow-hidden ${bg}`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <span className={`text-sm font-semibold ${text}`}>Campaign Attribution</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}>
                  {['Campaign', 'Spend', 'Clicks', 'Leads', 'Move-Ins', 'Revenue/mo', 'CPL', 'Cost/Move-In', 'ROAS'].map(h => (
                    <th key={h} className={`text-left px-4 py-2 text-xs font-semibold ${textMuted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={`px-4 py-8 text-center ${textMuted}`}>
                      No campaign data yet. Click "Sync Meta Spend" to pull ad spend, or wait for leads to come through landing pages.
                    </td>
                  </tr>
                ) : campaigns.map((c, i) => (
                  <tr key={i} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                    <td className={`px-4 py-2.5 font-medium ${text}`}>{c.campaign || '(no campaign)'}</td>
                    <td className={`px-4 py-2.5 ${text}`}>{formatCurrency(parseFloat(String(c.spend)))}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{c.clicks}</td>
                    <td className={`px-4 py-2.5 ${text}`}>{c.leads}</td>
                    <td className={`px-4 py-2.5 font-semibold ${parseInt(String(c.move_ins)) > 0 ? 'text-emerald-600' : textMuted}`}>{c.move_ins}</td>
                    <td className={`px-4 py-2.5 ${text}`}>{formatCurrency(parseFloat(String(c.revenue)))}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{formatCurrencyDecimal(parseFloat(String(c.cpl)))}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{formatCurrencyDecimal(parseFloat(String(c.cost_per_move_in)))}</td>
                    <td className={`px-4 py-2.5 font-bold ${parseFloat(String(c.roas)) >= 3 ? 'text-emerald-600' : parseFloat(String(c.roas)) >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                      {parseFloat(String(c.roas)).toFixed(1)}x
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                {campaigns.length > 0 && totals && (
                  <tr className={`font-semibold ${darkMode ? 'bg-slate-900/80' : 'bg-slate-100'}`}>
                    <td className={`px-4 py-2.5 ${text}`}>Total</td>
                    <td className={`px-4 py-2.5 ${text}`}>{formatCurrency(totals.spend)}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{totals.clicks}</td>
                    <td className={`px-4 py-2.5 ${text}`}>{totals.leads}</td>
                    <td className={`px-4 py-2.5 text-emerald-600`}>{totals.move_ins}</td>
                    <td className={`px-4 py-2.5 ${text}`}>{formatCurrency(totals.revenue)}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{formatCurrencyDecimal(totals.cpl)}</td>
                    <td className={`px-4 py-2.5 ${textMuted}`}>{formatCurrencyDecimal(totals.cost_per_move_in)}</td>
                    <td className={`px-4 py-2.5 font-bold ${totals.roas >= 3 ? 'text-emerald-600' : totals.roas >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                      {totals.roas.toFixed(1)}x
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {tab === 'trend' && (
        <div className={`rounded-xl border p-4 ${bg}`}>
          <h3 className={`text-sm font-semibold mb-4 ${text}`}>Monthly ROAS Trend</h3>
          {monthlyTrend.length === 0 ? (
            <p className={`text-sm text-center py-8 ${textMuted}`}>Not enough data for trend chart. Sync spend and update lead outcomes to see trends.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: darkMode ? '#1e293b' : '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  labelStyle={{ color: darkMode ? '#e2e8f0' : '#0f172a' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name="Spend ($)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue/mo ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="leads" name="Leads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Lead Row Component ── */

function LeadRow({
  lead, darkMode, onStatusChange,
}: {
  lead: ConsumerLead
  darkMode: boolean
  onStatusChange: (status: ConsumerLeadStatus, revenue?: number) => void
}) {
  const [showRevenue, setShowRevenue] = useState(false)
  const [revenue, setRevenue] = useState(lead.monthly_revenue?.toString() || '')
  const text = darkMode ? 'text-slate-200' : 'text-slate-900'
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  const handleStatusChange = (newStatus: ConsumerLeadStatus) => {
    if (newStatus === 'moved_in') {
      setShowRevenue(true)
    } else {
      onStatusChange(newStatus)
    }
  }

  const submitRevenue = () => {
    onStatusChange('moved_in', parseFloat(revenue) || 0)
    setShowRevenue(false)
  }

  return (
    <tr className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
      <td className={`px-4 py-2.5 ${text}`}>
        <div className="font-medium">{lead.name || '—'}</div>
        {lead.page_title && <div className={`text-[11px] ${textMuted}`}>{lead.page_title}</div>}
      </td>
      <td className={`px-4 py-2.5 ${textMuted}`}>
        <div className="text-xs">{lead.email || '—'}</div>
        {lead.phone && <div className="text-xs">{lead.phone}</div>}
      </td>
      <td className={`px-4 py-2.5`}>
        <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
          {lead.utm_source || 'direct'}
        </span>
        {(lead.fbclid || lead.gclid) && (
          <span className={`ml-1 text-[10px] ${textMuted}`} title={lead.fbclid ? 'Facebook click' : 'Google click'}>
            {lead.fbclid ? 'fb' : 'g'}
          </span>
        )}
      </td>
      <td className={`px-4 py-2.5 text-xs ${textMuted}`}>{lead.utm_campaign || '—'}</td>
      <td className="px-4 py-2.5"><ScoreBadge score={lead.lead_score} /></td>
      <td className="px-4 py-2.5">
        {showRevenue ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              placeholder="$/mo"
              className="w-20 px-2 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitRevenue()}
            />
            <button onClick={submitRevenue} className="text-xs text-emerald-600 font-medium">Save</button>
          </div>
        ) : (
          <StatusSelect value={lead.lead_status} onChange={handleStatusChange} darkMode={darkMode} />
        )}
      </td>
      <td className={`px-4 py-2.5 ${lead.monthly_revenue ? 'text-emerald-600 font-semibold' : textMuted}`}>
        {lead.monthly_revenue ? formatCurrency(lead.monthly_revenue) : '—'}
      </td>
      <td className={`px-4 py-2.5 text-xs ${textMuted}`}>{formatTimeAgo(lead.created_at)}</td>
    </tr>
  )
}
