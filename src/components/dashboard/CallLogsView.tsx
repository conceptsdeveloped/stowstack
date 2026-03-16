import { useState, useEffect, useCallback } from 'react'
import {
  Phone, Loader2, RefreshCw, Search, Clock,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
  XCircle, ChevronLeft, ChevronRight, BarChart3, Users
} from 'lucide-react'
import type { Lead } from './types'

interface CallLog {
  id: string
  facility_id: string
  tracking_number_id: string
  caller_number: string
  status: string
  duration: number
  recording_url: string | null
  started_at: string
  tracking_label: string
  tracking_number: string
}

interface CallStats {
  total_calls: number
  completed_calls: number
  avg_duration: number
  unique_callers: number
  calls_today: number
  calls_this_week: number
}

interface TrackingNumber {
  label: string
  phone_number: string
  call_count: number
  total_duration: number
  calls_7d: number
}

function formatDuration(seconds: number) {
  if (!seconds || seconds < 1) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatPhone(phone: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

const STATUS_ICONS: Record<string, typeof Phone> = {
  completed: PhoneIncoming,
  outbound: PhoneOutgoing,
  missed: PhoneMissed,
  voicemail: PhoneOff,
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-600 bg-green-50',
  outbound: 'text-blue-600 bg-blue-50',
  missed: 'text-red-500 bg-red-50',
  voicemail: 'text-amber-500 bg-amber-50',
}

export default function CallLogsView({ adminKey, darkMode, leads }: { adminKey: string; darkMode: boolean; leads: Lead[] }) {
  const [selectedFacility, setSelectedFacility] = useState<string>('')
  const [logs, setLogs] = useState<CallLog[]>([])
  const [stats, setStats] = useState<CallStats | null>(null)
  const [trackingNumbers, setTrackingNumbers] = useState<TrackingNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  // Derive unique facilities from leads
  const facilities = leads.reduce<{ id: string; name: string }[]>((acc, lead) => {
    if (!acc.find(f => f.id === lead.id)) {
      acc.push({ id: lead.id, name: lead.facilityName })
    }
    return acc
  }, [])

  const fetchStats = useCallback(async (facilityId: string) => {
    try {
      const res = await fetch(`/api/call-logs?facilityId=${facilityId}&summary=true`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to fetch stats (${res.status})`)
      const data = await res.json()
      setStats(data.stats || null)
      setTrackingNumbers(data.byNumber || [])
    } catch (err: unknown) {
      console.error('[CallLogs] Stats error:', err)
    }
  }, [adminKey])

  const fetchLogs = useCallback(async (facilityId: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/call-logs?facilityId=${facilityId}&page=${p}&limit=25`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to fetch logs (${res.status})`)
      const data = await res.json()
      setLogs(data.logs || [])
      setTotalPages(data.pages || 1)
    } catch (err: unknown) {
      console.error('[CallLogs] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    if (!selectedFacility) return
    fetchStats(selectedFacility)
    fetchLogs(selectedFacility, page)
  }, [selectedFacility, page, fetchStats, fetchLogs])

  // Auto-select first facility
  useEffect(() => {
    if (facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0].id)
    }
  }, [facilities, selectedFacility])

  const filteredLogs = search
    ? logs.filter(l => l.caller_number.includes(search) || l.tracking_label?.toLowerCase().includes(search.toLowerCase()))
    : logs

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const input = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone size={18} className={darkMode ? 'text-cyan-400' : 'text-cyan-600'} />
          <h2 className="text-lg font-bold">Call Logs</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedFacility}
            onChange={e => { setSelectedFacility(e.target.value); setPage(1) }}
            className={`px-3 py-2 rounded-lg border text-sm ${input} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
          >
            <option value="">Select facility...</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {selectedFacility && (
            <button
              onClick={() => { fetchStats(selectedFacility); fetchLogs(selectedFacility, page) }}
              disabled={loading}
              className={`p-2 rounded-lg border ${card} hover:opacity-80 transition-opacity`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {!selectedFacility ? (
        <div className={`text-center py-16 rounded-xl border ${card}`}>
          <Phone size={32} className={`mx-auto mb-3 ${muted}`} />
          <p className={`text-sm ${muted}`}>Select a facility to view call logs</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Total Calls', value: stats.total_calls, icon: Phone },
                { label: 'Completed', value: stats.completed_calls, icon: PhoneIncoming },
                { label: 'Avg Duration', value: formatDuration(Number(stats.avg_duration)), icon: Clock },
                { label: 'Unique Callers', value: stats.unique_callers, icon: Users },
                { label: 'Today', value: stats.calls_today, icon: BarChart3 },
                { label: 'This Week', value: stats.calls_this_week, icon: BarChart3 },
              ].map(s => {
                const SIcon = s.icon
                return (
                  <div key={s.label} className={`rounded-xl border ${card} p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <SIcon size={13} className={muted} />
                      <span className={`text-[10px] uppercase tracking-wider font-medium ${muted}`}>{s.label}</span>
                    </div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tracking Numbers */}
          {trackingNumbers.length > 0 && (
            <div className={`rounded-xl border ${card} overflow-hidden mb-4`}>
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                <h3 className="text-sm font-semibold">Tracking Numbers</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <th className={`text-left px-4 py-2 font-medium ${muted}`}>Label</th>
                    <th className={`text-left px-4 py-2 font-medium ${muted}`}>Number</th>
                    <th className={`text-right px-4 py-2 font-medium ${muted}`}>Total Calls</th>
                    <th className={`text-right px-4 py-2 font-medium ${muted}`}>Last 7 Days</th>
                    <th className={`text-right px-4 py-2 font-medium ${muted}`}>Total Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingNumbers.map((tn, i) => (
                    <tr key={i} className={`border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-50'} hover:${darkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium">{tn.label}</td>
                      <td className={`px-4 py-2.5 ${muted}`}>{formatPhone(tn.phone_number)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{tn.call_count}</td>
                      <td className="px-4 py-2.5 text-right">{tn.calls_7d}</td>
                      <td className={`px-4 py-2.5 text-right ${muted}`}>{formatDuration(Number(tn.total_duration))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Search + Logs */}
          <div className="relative mb-3">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              type="text"
              placeholder="Search by caller number or tracking label..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm ${input} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
            />
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

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${card}`}>
              <Phone size={32} className={`mx-auto mb-3 ${muted}`} />
              <p className={`text-sm ${muted}`}>No call logs found</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {filteredLogs.map(log => {
                  const StatusIcon = STATUS_ICONS[log.status] || Phone
                  const statusColor = STATUS_COLORS[log.status] || 'text-slate-500 bg-slate-50'
                  const [sText, sBg] = statusColor.split(' ')

                  return (
                    <div key={log.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${card} hover:shadow-sm transition-shadow`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-700' : sBg}`}>
                        <StatusIcon size={14} className={darkMode ? 'text-slate-300' : sText} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatPhone(log.caller_number)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : sBg + ' ' + sText}`}>
                            {log.status}
                          </span>
                          {log.duration > 0 && (
                            <span className={`text-xs ${muted}`}>{formatDuration(log.duration)}</span>
                          )}
                        </div>
                        <div className={`text-xs ${muted} mt-0.5`}>
                          {log.tracking_label && <span>{log.tracking_label} · </span>}
                          {formatPhone(log.tracking_number)}
                        </div>
                      </div>
                      <div className={`text-xs ${muted} shrink-0`}>
                        {new Date(log.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`p-2 rounded-lg border ${card} disabled:opacity-40`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className={`text-sm ${muted}`}>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`p-2 rounded-lg border ${card} disabled:opacity-40`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
