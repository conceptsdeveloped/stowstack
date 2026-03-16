import { useState, useEffect, useCallback } from 'react'
import {
  Users, RefreshCw, Loader2, Search, ChevronDown,
  Mail, Phone, Flame, ArrowUpDown,
  DollarSign, Clock, UserCheck
} from 'lucide-react'
import { ConsumerLead, ConsumerLeadStatus, CONSUMER_LEAD_STATUSES } from './types'

/* ── Helpers ── */

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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

/* ── Sub-components ── */

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

/* ── Funnel Stats ── */

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

function FunnelBar({ summary, darkMode }: { summary: LeadSummary; darkMode: boolean }) {
  const stages = [
    { label: 'New', count: Number(summary.new_count), color: 'bg-blue-500' },
    { label: 'Contacted', count: Number(summary.contacted_count), color: 'bg-indigo-500' },
    { label: 'Toured', count: Number(summary.toured_count), color: 'bg-purple-500' },
    { label: 'Reserved', count: Number(summary.reserved_count), color: 'bg-amber-500' },
    { label: 'Moved In', count: Number(summary.moved_in_count), color: 'bg-green-500' },
    { label: 'Lost', count: Number(summary.lost_count), color: 'bg-red-400' },
  ]
  const total = Number(summary.total) || 1
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>Lead-to-Move-In Funnel</h3>
      <div className="flex h-4 rounded-full overflow-hidden mb-3">
        {stages.map(s => s.count > 0 ? (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ) : null)}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stages.map(s => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className={`text-[10px] font-medium ${textMuted}`}>{s.label}</span>
            </div>
            <span className="text-sm font-bold">{s.count}</span>
            {s.label !== 'Lost' && s.label !== 'New' && (
              <span className={`block text-[10px] ${textMuted}`}>
                {total > 0 ? Math.round((s.count / total) * 100) : 0}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Component ── */

type SortField = 'created_at' | 'lead_score' | 'name' | 'lead_status'
type SortDir = 'asc' | 'desc'

export default function ConsumerLeadsView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [leads, setLeads] = useState<ConsumerLead[]>([])
  const [summary, setSummary] = useState<LeadSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [days, setDays] = useState(90)

  const bg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = { 'X-Admin-Key': adminKey }
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const [leadsRes, summaryRes] = await Promise.all([
        fetch(`/api/consumer-leads?days=${days}&limit=500${statusParam}`, { headers }),
        fetch(`/api/consumer-leads?summary=true`, { headers }),
      ])
      if (!leadsRes.ok) throw new Error(`Failed to fetch leads (${leadsRes.status})`)
      const leadsData = await leadsRes.json()
      setLeads(leadsData.leads || [])
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData.stats || null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [adminKey, statusFilter, days])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const updateStatus = async (leadId: string, status: ConsumerLeadStatus) => {
    setUpdatingId(leadId)
    try {
      const res = await fetch('/api/consumer-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ leadId, status }),
      })
      if (!res.ok) throw new Error('Update failed')
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, lead_status: status } : l))
      // Refresh summary
      const summaryRes = await fetch('/api/consumer-leads?summary=true', {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to update lead status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter and sort
  const filtered = leads
    .filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          (l.name || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q) ||
          (l.utm_source || '').toLowerCase().includes(q) ||
          (l.utm_campaign || '').toLowerCase().includes(q) ||
          (l.page_title || '').toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'created_at') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      if (sortField === 'lead_score') return dir * (a.lead_score - b.lead_score)
      if (sortField === 'name') return dir * (a.name || '').localeCompare(b.name || '')
      if (sortField === 'lead_status') return dir * a.lead_status.localeCompare(b.lead_status)
      return 0
    })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400 mr-2" />
        <span className={textMuted}>Loading consumer leads...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Inbound Leads</h2>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Track leads from landing pages through to move-in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className={`text-xs rounded-lg border px-2 py-1.5 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={fetchLeads}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              darkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className={textMuted} />
                <p className={`text-xs font-medium ${textMuted}`}>Total Leads</p>
              </div>
              <p className="text-2xl font-bold">{Number(summary.total)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <UserCheck size={14} className="text-green-500" />
                <p className={`text-xs font-medium ${textMuted}`}>Move-Ins</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{Number(summary.moved_in_count)}</p>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                {Number(summary.total) > 0 ? Math.round((Number(summary.moved_in_count) / Number(summary.total)) * 100) : 0}% conversion
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-emerald-500" />
                <p className={`text-xs font-medium ${textMuted}`}>Monthly Revenue</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(summary.total_revenue) || 0)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className={textMuted} />
                <p className={`text-xs font-medium ${textMuted}`}>Avg Days to Move-In</p>
              </div>
              <p className="text-2xl font-bold">{Number(summary.avg_days_to_move_in) || '—'}</p>
            </div>
          </div>

          <FunnelBar summary={summary} darkMode={darkMode} />
        </>
      )}

      {/* Filters */}
      <div className={`flex items-center gap-3 flex-wrap rounded-xl border p-3 ${bg}`}>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All ({Number(summary?.total) || leads.length})
          </button>
          {CONSUMER_LEAD_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s.value
                  ? 'bg-emerald-600 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            placeholder="Search name, email, source..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border ${
              darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Leads Table */}
      {filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-xl border ${bg}`}>
          <Users size={32} className={`mx-auto mb-3 ${textMuted} opacity-40`} />
          <p className="font-medium">No consumer leads found</p>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Leads will appear here when visitors submit forms on your landing pages
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${bg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b text-xs ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-emerald-500">
                      Lead <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('lead_status')} className="flex items-center gap-1 hover:text-emerald-500">
                      Status <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('lead_score')} className="flex items-center gap-1 hover:text-emerald-500">
                      Score <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Landing Page</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                  <th className="px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-emerald-500">
                      Created <ArrowUpDown size={10} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr
                    key={lead.id}
                    className={`border-b transition-colors ${
                      darkMode ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50'
                    } ${updatingId === lead.id ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{lead.name || '—'}</p>
                        {lead.unit_size && <p className={`text-[11px] ${textMuted}`}>{lead.unit_size}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {lead.email && (
                          <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                            <Mail size={10} /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                            <Phone size={10} /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={lead.lead_status}
                        onChange={(status) => updateStatus(lead.id, status)}
                        darkMode={darkMode}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.lead_score} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {lead.utm_source && (
                          <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {lead.utm_source}
                          </span>
                        )}
                        {lead.utm_campaign && (
                          <span className={`text-[11px] ${textMuted} truncate max-w-[140px]`} title={lead.utm_campaign}>
                            {lead.utm_campaign}
                          </span>
                        )}
                        {!lead.utm_source && !lead.utm_campaign && (
                          <span className={`text-xs ${textMuted}`}>Direct</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.page_title ? (
                        <span className={`text-xs ${textMuted} truncate max-w-[160px] block`} title={lead.page_title}>
                          {lead.page_title}
                        </span>
                      ) : (
                        <span className={`text-xs ${textMuted}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.monthly_revenue ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(lead.monthly_revenue)}/mo
                        </span>
                      ) : (
                        <span className={`text-xs ${textMuted}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`text-xs ${textMuted}`}>{formatTimeAgo(lead.created_at)}</p>
                        <p className={`text-[10px] ${textMuted} opacity-70`}>{formatDate(lead.created_at)}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`px-4 py-3 border-t text-xs ${textMuted} ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            Showing {filtered.length} of {leads.length} leads
          </div>
        </div>
      )}
    </div>
  )
}
