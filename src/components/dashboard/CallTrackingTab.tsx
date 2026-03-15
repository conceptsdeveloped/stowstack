import { useState, useEffect } from 'react'
import { Loader2, Plus, Phone, PhoneCall, PhoneOff, Clock, Users, Download, Trash2, PhoneForwarded } from 'lucide-react'
import type { CallTrackingNumber, CallLog, CallSummary } from './types'

export default function CallTrackingTab({ facility, adminKey, darkMode }: { facility: any; adminKey: string; darkMode: boolean }) {
  const [numbers, setNumbers] = useState<CallTrackingNumber[]>([])
  const [logs, setLogs] = useState<CallLog[]>([])
  const [summary, setSummary] = useState<CallSummary | null>(null)
  const [landingPages, setLandingPages] = useState<any[]>([])
  const [utmLinks, setUtmLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState('')
  const [forwardTo, setForwardTo] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [landingPageId, setLandingPageId] = useState('')
  const [utmLinkId, setUtmLinkId] = useState('')

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-200' : 'text-slate-800'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`

  useEffect(() => {
    loadData()
  }, [facility.id, adminKey])

  async function loadData() {
    setLoading(true)
    try {
      const [numbersRes, logsRes, summaryRes, pagesRes, utmRes] = await Promise.all([
        fetch(`/api/call-tracking?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/call-logs?facilityId=${facility.id}&limit=50`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/call-logs?facilityId=${facility.id}&summary=true`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/landing-pages?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
        fetch(`/api/utm-links?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      ])
      if (numbersRes.numbers) setNumbers(numbersRes.numbers)
      if (logsRes.logs) setLogs(logsRes.logs)
      if (summaryRes.stats) setSummary(summaryRes.stats)
      if (pagesRes.pages) setLandingPages(pagesRes.pages)
      if (utmRes.links) setUtmLinks(utmRes.links)
    } catch { /* silent */ }
    setLoading(false)
  }

  async function provisionNumber() {
    if (!label || !forwardTo) return
    setProvisioning(true)
    try {
      const res = await fetch('/api/call-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id,
          label,
          forwardTo,
          areaCode: areaCode || undefined,
          landingPageId: landingPageId || undefined,
          utmLinkId: utmLinkId || undefined,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setLabel('')
        setForwardTo('')
        setAreaCode('')
        setLandingPageId('')
        setUtmLinkId('')
        await loadData()
      }
    } catch { /* silent */ }
    setProvisioning(false)
  }

  async function releaseNumber(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/call-tracking?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      })
      await loadData()
    } catch { /* silent */ }
    setDeleting(null)
  }

  function formatDuration(seconds: number) {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function maskPhone(num: string | null) {
    if (!num) return 'Unknown'
    if (num.length >= 10) return num.slice(0, -4).replace(/./g, '*') + num.slice(-4)
    return num
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  function exportCSV() {
    const header = 'Date,Tracking Number,Label,Caller,City,State,Duration (s),Status\n'
    const rows = logs.map(l =>
      `${l.started_at},${l.tracking_number || ''},${l.tracking_label || ''},${l.caller_number || ''},${l.caller_city || ''},${l.caller_state || ''},${l.duration},${l.status}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call-logs-${facility.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading call tracking...
      </div>
    )
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <PhoneCall size={14} className="text-emerald-500" />
      case 'no-answer': case 'busy': return <PhoneOff size={14} className="text-amber-500" />
      case 'failed': return <PhoneOff size={14} className="text-red-500" />
      default: return <Phone size={14} className="text-blue-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Calls', value: summary.total_calls, icon: Phone },
            { label: 'Avg Duration', value: formatDuration(Math.round(Number(summary.avg_duration))), icon: Clock },
            { label: 'Today', value: summary.calls_today, icon: PhoneCall },
            { label: 'Unique Callers', value: summary.unique_callers, icon: Users },
          ].map((stat) => (
            <div key={stat.label} className={`border rounded-xl p-4 ${card}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={14} className={sub} />
                <span className={`text-xs font-medium ${sub}`}>{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${text}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tracking numbers */}
      <div className={`border rounded-xl ${card}`}>
        <div className="p-4 flex items-center justify-between border-b border-inherit">
          <h3 className={`text-sm font-semibold ${text}`}>Tracking Numbers</h3>
          <div className="flex gap-2">
            {logs.length > 0 && (
              <button onClick={exportCSV}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Download size={13} /> Export
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus size={14} /> Provision Number
            </button>
          </div>
        </div>

        {/* Provision form */}
        {showForm && (
          <div className={`p-4 border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={`text-xs font-medium ${sub}`}>Label *</label>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Spring Facebook Campaign" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Forward To *</label>
                <input type="text" value={forwardTo} onChange={e => setForwardTo(e.target.value)}
                  placeholder="e.g. +15551234567" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Area Code (optional)</label>
                <input type="text" value={areaCode} onChange={e => setAreaCode(e.target.value)}
                  placeholder="e.g. 512" maxLength={3} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Link to Landing Page</label>
                <select value={landingPageId} onChange={e => setLandingPageId(e.target.value)} className={`mt-1 ${inputCls}`}>
                  <option value="">None</option>
                  {landingPages.map((lp: any) => <option key={lp.id} value={lp.id}>{lp.title}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${sub}`}>Link to UTM Campaign</label>
                <select value={utmLinkId} onChange={e => setUtmLinkId(e.target.value)} className={`mt-1 ${inputCls}`}>
                  <option value="">None</option>
                  {utmLinks.map((ul: any) => <option key={ul.id} value={ul.id}>{ul.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={provisionNumber} disabled={provisioning || !label || !forwardTo}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {provisioning ? <><Loader2 size={13} className="inline animate-spin mr-1" /> Provisioning...</> : 'Provision Number'}
              </button>
              <button onClick={() => setShowForm(false)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Numbers list */}
        {numbers.length === 0 ? (
          <div className={`p-8 text-center ${sub}`}>
            <Phone size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No tracking numbers provisioned yet.</p>
            <p className="text-xs mt-1">Provision a number to start attributing phone calls to campaigns.</p>
          </div>
        ) : (
          <div className="divide-y divide-inherit">
            {numbers.map(num => (
              <div key={num.id} className="p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${darkMode ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                  <PhoneForwarded size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${text}`}>{num.label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs font-mono ${sub}`}>{num.phone_number}</span>
                    <span className={`text-xs ${sub}`}>→ {num.forward_to}</span>
                    {num.landing_page_title && <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{num.landing_page_title}</span>}
                    {num.utm_label && <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>{num.utm_label}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${text}`}>{num.call_count} calls</p>
                  <p className={`text-xs ${sub}`}>{formatDuration(num.total_duration)} total</p>
                </div>
                <button onClick={() => releaseNumber(num.id)} disabled={deleting === num.id}
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-red-900/30 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                  title="Release number">
                  {deleting === num.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call log */}
      {logs.length > 0 && (
        <div className={`border rounded-xl ${card}`}>
          <div className="p-4 border-b border-inherit">
            <h3 className={`text-sm font-semibold ${text}`}>Recent Calls</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">Tracking #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">Caller</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">Location</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {logs.map(log => (
                  <tr key={log.id} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-2.5">{statusIcon(log.status)}</td>
                    <td className={`px-4 py-2.5 ${sub}`}>{formatDate(log.started_at)}</td>
                    <td className={`px-4 py-2.5 ${text}`}>
                      <span className="text-xs font-medium">{log.tracking_label}</span>
                    </td>
                    <td className={`px-4 py-2.5 font-mono text-xs ${sub}`}>{maskPhone(log.caller_number)}</td>
                    <td className={`px-4 py-2.5 ${sub}`}>
                      {[log.caller_city, log.caller_state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${text}`}>{formatDuration(log.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
