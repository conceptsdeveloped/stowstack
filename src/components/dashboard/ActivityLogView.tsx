import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Loader2, RefreshCw, Search,
  UserPlus, ArrowRightLeft, StickyNote, Megaphone,
  CheckCircle2, Upload, Mail, XCircle, ChevronDown
} from 'lucide-react'

interface ActivityEntry {
  id: string
  type: string
  leadId: string
  leadName: string
  facilityName: string
  detail: string
  meta: Record<string, unknown>
  timestamp: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  lead_created:     { icon: UserPlus,        color: 'text-emerald-500 bg-emerald-50',  label: 'New Lead' },
  status_change:    { icon: ArrowRightLeft,  color: 'text-blue-500 bg-blue-50',        label: 'Status Change' },
  note_added:       { icon: StickyNote,      color: 'text-amber-500 bg-amber-50',      label: 'Note Added' },
  campaign_added:   { icon: Megaphone,       color: 'text-purple-500 bg-purple-50',    label: 'Campaign' },
  onboarding_step:  { icon: CheckCircle2,    color: 'text-indigo-500 bg-indigo-50',    label: 'Onboarding' },
  client_signed:    { icon: CheckCircle2,    color: 'text-green-600 bg-green-50',      label: 'Client Signed' },
  pms_uploaded:     { icon: Upload,          color: 'text-cyan-500 bg-cyan-50',        label: 'PMS Upload' },
  drip_sent:        { icon: Mail,            color: 'text-rose-500 bg-rose-50',        label: 'Drip Sent' },
  drip_cancelled:   { icon: XCircle,         color: 'text-slate-500 bg-slate-50',      label: 'Drip Cancelled' },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export default function ActivityLogView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [limit, setLimit] = useState(50)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activity-log?limit=${limit}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (err: unknown) {
      console.error('[ActivityLog] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [adminKey, limit])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const filtered = activities.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.leadName.toLowerCase().includes(q) ||
        a.facilityName.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q)
      )
    }
    return true
  })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const input = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className={darkMode ? 'text-cyan-400' : 'text-cyan-600'} />
          <h2 className="text-lg font-bold">Activity Log</h2>
          <span className={`text-xs ${muted}`}>{filtered.length} events</span>
        </div>
        <button onClick={fetchActivities} disabled={loading} className={`p-2 rounded-lg border ${card} hover:opacity-80 transition-opacity`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            placeholder="Search by name, facility, or detail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm ${input} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${input} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4 flex items-center gap-2">
          <XCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {loading && activities.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <Activity size={32} className={`mx-auto mb-3 ${muted}`} />
          <p className={`text-sm ${muted}`}>
            {activities.length === 0 ? 'No activity recorded yet' : 'No matching activities'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((a, i) => {
            const cfg = TYPE_CONFIG[a.type] || { icon: Activity, color: 'text-slate-500 bg-slate-50', label: a.type }
            const Icon = cfg.icon
            const [iconText, iconBg] = cfg.color.split(' ')
            const showDate = i === 0 || new Date(a.timestamp).toDateString() !== new Date(filtered[i - 1].timestamp).toDateString()

            return (
              <div key={a.id}>
                {showDate && (
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${muted} mt-4 mb-2 first:mt-0`}>
                    {new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                )}
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${card} hover:shadow-sm transition-shadow`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-700' : iconBg}`}>
                    <Icon size={14} className={darkMode ? 'text-slate-300' : iconText} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : iconBg + ' ' + iconText}`}>
                        {cfg.label}
                      </span>
                      <span className={`text-[10px] ${muted}`}>{timeAgo(a.timestamp)}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{a.detail}</p>
                    <div className={`flex items-center gap-2 text-xs ${muted} mt-0.5`}>
                      {a.leadName && <span>{a.leadName}</span>}
                      {a.leadName && a.facilityName && <span>·</span>}
                      {a.facilityName && <span>{a.facilityName}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {activities.length >= limit && (
            <button
              onClick={() => setLimit(prev => prev + 50)}
              className={`w-full py-3 rounded-lg border ${card} text-sm ${muted} hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5 mt-2`}
            >
              <ChevronDown size={14} /> Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
