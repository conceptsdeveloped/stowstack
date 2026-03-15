import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Mail, Clock, Target,
  CheckCircle2, XCircle, ExternalLink,
  ChevronDown, ChevronUp, Flame, Eye, MousePointer
} from 'lucide-react'

interface PartialLead {
  id: string
  session_id: string
  landing_page_id: string | null
  facility_id: string | null
  email: string | null
  phone: string | null
  name: string | null
  unit_size: string | null
  fields_completed: number
  total_fields: number
  scroll_depth: number
  time_on_page: number
  exit_intent: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  lead_score: number
  recovery_status: string
  recovery_sent_count: number
  converted: boolean
  created_at: string
  updated_at: string
  page_title: string | null
  page_slug: string | null
}

interface RecoveryStats {
  pending: number
  in_recovery: number
  recovered: number
  exhausted: number
  total: number
  avg_score: number
  hot_leads: number
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'text-blue-600 bg-blue-50',
    active: 'text-amber-600 bg-amber-50',
    exhausted: 'text-slate-500 bg-slate-100',
    converted: 'text-emerald-600 bg-emerald-50',
    no_email: 'text-red-500 bg-red-50',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'text-slate-500 bg-slate-50'}`}>
      {status.replace('_', ' ')}
    </span>
  )
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

export default function RecoveryView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [leads, setLeads] = useState<PartialLead[]>([])
  const [stats, setStats] = useState<RecoveryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [days, setDays] = useState(7)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ days: String(days), limit: '100' })
      if (filter !== 'all') params.set('status', filter)

      const res = await fetch(`/api/partial-lead?${params}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLeads(data.leads || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Recovery fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [adminKey, filter, days])

  useEffect(() => { fetchData() }, [fetchData])

  const dc = darkMode
  const text = dc ? 'text-slate-200' : 'text-slate-900'
  const textMuted = dc ? 'text-slate-400' : 'text-slate-500'
  const bg = dc ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'

  return (
    <div>
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total (30d)', value: stats.total, icon: Eye, color: 'text-slate-600' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-600' },
            { label: 'In Recovery', value: stats.in_recovery, icon: Mail, color: 'text-amber-600' },
            { label: 'Recovered', value: stats.recovered, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Exhausted', value: stats.exhausted, icon: XCircle, color: 'text-slate-400' },
            { label: 'Hot Leads', value: stats.hot_leads, icon: Flame, color: 'text-red-600' },
            { label: 'Avg Score', value: stats.avg_score || 0, icon: Target, color: 'text-indigo-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className={`text-xs font-medium ${textMuted}`}>{label}</span>
              </div>
              <p className={`text-xl font-bold ${text}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recovery Rate */}
      {stats && stats.total > 0 && (
        <div className={`rounded-xl border p-4 mb-6 ${bg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${text}`}>Recovery Rate (30d)</span>
            <span className={`text-lg font-bold ${stats.recovered > 0 ? 'text-emerald-600' : textMuted}`}>
              {stats.total > 0 ? ((stats.recovered / stats.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${dc ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${stats.total > 0 ? Math.min((stats.recovered / stats.total) * 100, 100) : 0}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${textMuted}`}>
            {stats.recovered} of {stats.total} abandoned visitors recovered into leads
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {['all', 'pending', 'active', 'exhausted', 'no_email'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-emerald-600 text-white'
                  : dc ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className={`text-xs px-2 py-1.5 rounded-lg border ${dc ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
        >
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        <button
          onClick={fetchData}
          className={`flex items-center gap-1 text-xs ${textMuted} hover:text-emerald-600 transition-colors`}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Leads List */}
      {loading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={20} className="animate-spin text-emerald-600" />
        </div>
      ) : leads.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${bg}`}>
          <MousePointer size={32} className={`mx-auto mb-3 ${textMuted}`} />
          <p className={`text-sm ${textMuted}`}>No partial leads yet. They'll appear here when visitors start interacting with your landing pages.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const expanded = expandedId === lead.id
            return (
              <div key={lead.id} className={`rounded-xl border overflow-hidden transition-all ${bg}`}>
                <button
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <ScoreBadge score={lead.lead_score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${text}`}>
                        {lead.email || lead.name || lead.phone || 'Anonymous'}
                      </span>
                      <StatusBadge status={lead.recovery_status} />
                      {lead.exit_intent && (
                        <span className="text-xs text-amber-500" title="Exit intent detected">exit</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 text-xs ${textMuted} mt-0.5`}>
                      {lead.page_title && <span>{lead.page_title}</span>}
                      <span>{lead.fields_completed}/{lead.total_fields} fields</span>
                      <span>{lead.scroll_depth}% scroll</span>
                      <span>{Math.floor(lead.time_on_page / 60)}m {lead.time_on_page % 60}s</span>
                      <span>{formatTimeAgo(lead.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.recovery_sent_count > 0 && (
                      <span className={`text-xs ${textMuted}`}>
                        {lead.recovery_sent_count}/3 sent
                      </span>
                    )}
                    {expanded ? <ChevronUp size={14} className={textMuted} /> : <ChevronDown size={14} className={textMuted} />}
                  </div>
                </button>

                {expanded && (
                  <div className={`px-4 pb-4 border-t ${dc ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 text-sm">
                      {lead.name && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Name</span>
                          <p className={text}>{lead.name}</p>
                        </div>
                      )}
                      {lead.email && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Email</span>
                          <p className={text}>
                            <a href={`mailto:${lead.email}`} className="text-emerald-600 hover:underline">{lead.email}</a>
                          </p>
                        </div>
                      )}
                      {lead.phone && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Phone</span>
                          <p className={text}>
                            <a href={`tel:${lead.phone}`} className="text-emerald-600 hover:underline">{lead.phone}</a>
                          </p>
                        </div>
                      )}
                      {lead.unit_size && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Unit Interest</span>
                          <p className={text}>{lead.unit_size}</p>
                        </div>
                      )}
                      {lead.utm_source && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Traffic Source</span>
                          <p className={text}>{lead.utm_source} / {lead.utm_medium || 'direct'}</p>
                        </div>
                      )}
                      {lead.utm_campaign && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Campaign</span>
                          <p className={text}>{lead.utm_campaign}</p>
                        </div>
                      )}
                      {lead.page_slug && (
                        <div>
                          <span className={`text-xs ${textMuted}`}>Landing Page</span>
                          <p>
                            <a href={`/p/${lead.page_slug}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1">
                              {lead.page_title || lead.page_slug} <ExternalLink size={10} />
                            </a>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Engagement visual */}
                    <div className={`mt-4 p-3 rounded-lg ${dc ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <p className={`text-xs font-semibold mb-2 ${textMuted}`}>Engagement Breakdown</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Form Progress', value: lead.total_fields > 0 ? Math.round((lead.fields_completed / lead.total_fields) * 100) : 0 },
                          { label: 'Scroll Depth', value: lead.scroll_depth },
                          { label: 'Lead Score', value: lead.lead_score },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-3">
                            <span className={`text-xs w-24 ${textMuted}`}>{label}</span>
                            <div className={`flex-1 h-1.5 rounded-full ${dc ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(value, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-8 text-right ${text}`}>{value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
