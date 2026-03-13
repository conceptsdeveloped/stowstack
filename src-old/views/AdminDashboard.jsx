import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, RefreshCw, Users, FileText, BarChart3, Clock,
  ChevronDown, ChevronRight, Phone, Mail, MapPin, Building2,
  CheckCircle2, AlertCircle, Send, MessageSquare, Search,
  Filter, Upload
} from 'lucide-react'

const ADMIN_KEY = 'stowstack-admin-2024'

const STATUSES = [
  { value: 'submitted', label: 'Submitted', color: 'bg-slate-500', textColor: 'text-slate-300' },
  { value: 'form_sent', label: 'Form Sent', color: 'bg-blue-500', textColor: 'text-blue-300' },
  { value: 'form_completed', label: 'Form Done', color: 'bg-indigo-500', textColor: 'text-indigo-300' },
  { value: 'audit_generated', label: 'Audit Done', color: 'bg-amber-500', textColor: 'text-amber-300' },
  { value: 'call_scheduled', label: 'Call Set', color: 'bg-green-500', textColor: 'text-green-300' },
  { value: 'client_signed', label: 'Client', color: 'bg-emerald-500', textColor: 'text-emerald-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500', textColor: 'text-red-300' },
]

function getStatusMeta(status) {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
      {meta.label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function LeadCard({ lead, onUpdateStatus, onAddNote }) {
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const meta = getStatusMeta(lead.status)

  function handleStatusChange(newStatus) {
    onUpdateStatus(lead.id, newStatus)
  }

  function handleAddNote() {
    if (!noteText.trim()) return
    onAddNote(lead.id, noteText.trim())
    setNoteText('')
  }

  const daysSince = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-700/20 transition-colors"
      >
        <div className={`w-2 h-10 rounded-full ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">{lead.facilityName}</h3>
            {lead.pmsUploaded && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/20 text-purple-300">PMS</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{lead.name} · {lead.location}</p>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={lead.status} />
          <p className="text-[10px] text-slate-600 mt-1">{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5" /> {lead.email}
            </a>
            <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5" /> {lead.phone}
            </a>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5" /> {lead.location}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Occupancy', lead.occupancyRange],
              ['Units', lead.totalUnits],
              ['Issue', lead.biggestIssue],
              ['Submitted', new Date(lead.createdAt).toLocaleDateString()],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-700/30 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs text-slate-300 truncate">{val || 'N/A'}</p>
              </div>
            ))}
          </div>

          {/* Status changer */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Pipeline Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    lead.status === s.value
                      ? `${s.color} text-white`
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Notes ({lead.notes?.length || 0})</p>
            {lead.notes?.length > 0 && (
              <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                {lead.notes.map((n, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-slate-600 shrink-0">{new Date(n.at).toLocaleDateString()}</span>
                    <span className="text-slate-400">{n.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
              <button
                onClick={handleAddNote}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard({ onBack }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [auditCount, setAuditCount] = useState(0)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin-leads', {
        headers: { 'X-Admin-Key': ADMIN_KEY },
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setLeads(data.leads || [])
      setAuditCount(data.auditCount || 0)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function handleUpdateStatus(id, status) {
    try {
      await fetch('/api/admin-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        body: JSON.stringify({ id, status }),
      })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l))
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  async function handleAddNote(id, note) {
    try {
      const res = await fetch('/api/admin-leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        body: JSON.stringify({ id, note }),
      })
      const data = await res.json()
      if (data.record) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data.record } : l))
      }
    } catch (err) {
      console.error('Note add failed:', err)
    }
  }

  // Stats
  const totalLeads = leads.length
  const activeLeads = leads.filter(l => !['client_signed', 'lost'].includes(l.status)).length
  const clients = leads.filter(l => l.status === 'client_signed').length
  const thisWeek = leads.filter(l => Date.now() - new Date(l.createdAt).getTime() < 604800000).length

  // Filter + search
  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return l.facilityName?.toLowerCase().includes(q) ||
             l.name?.toLowerCase().includes(q) ||
             l.email?.toLowerCase().includes(q) ||
             l.location?.toLowerCase().includes(q)
    }
    return true
  })

  // Pipeline counts per status
  const pipelineCounts = STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.status === s.value).length
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="font-bold text-sm">Admin</span>
            </div>
          </div>
          <button onClick={fetchLeads} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Leads" value={totalLeads} color="bg-blue-500/20" />
          <StatCard icon={BarChart3} label="Active Pipeline" value={activeLeads} color="bg-amber-500/20" />
          <StatCard icon={CheckCircle2} label="Clients Won" value={clients} color="bg-green-500/20" />
          <StatCard icon={Clock} label="This Week" value={thisWeek} color="bg-purple-500/20" />
        </div>

        {/* Pipeline bar */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pipeline</h3>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {STATUSES.map(s => {
              const count = pipelineCounts[s.value] || 0
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              if (pct === 0) return null
              return (
                <div
                  key={s.value}
                  className={`${s.color} flex items-center justify-center transition-all`}
                  style={{ width: `${Math.max(pct, 5)}%` }}
                  title={`${s.label}: ${count}`}
                >
                  <span className="text-[10px] text-white font-medium">{count}</span>
                </div>
              )
            })}
            {totalLeads === 0 && <div className="flex-1 bg-slate-700 rounded-lg" />}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {STATUSES.map(s => (
              <span key={s.value} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label} ({pipelineCounts[s.value] || 0})
              </span>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All ({totalLeads})
            </button>
            {STATUSES.map(s => {
              const count = pipelineCounts[s.value] || 0
              if (count === 0) return null
              return (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(s.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === s.value ? `${s.color} text-white` : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Lead list */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {loading && leads.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-600 mx-auto animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-500 mt-3">
              {searchQuery || filterStatus !== 'all' ? 'No leads match your filter' : 'No leads yet. They will appear here when operators submit the audit form.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onUpdateStatus={handleUpdateStatus}
                onAddNote={handleAddNote}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
