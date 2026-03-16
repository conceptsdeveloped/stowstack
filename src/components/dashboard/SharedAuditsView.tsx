import { useState, useEffect } from 'react'
import { ExternalLink, Trash2, Clock, Eye, Loader2, RefreshCw, Link2, Copy, CheckCircle2, CalendarPlus } from 'lucide-react'

interface SharedAudit {
  id: string
  slug: string
  facility_name: string
  views: number
  expires_at: string
  created_at: string
  active: boolean
}

export default function SharedAuditsView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [audits, setAudits] = useState<SharedAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchAudits = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/shared-audits', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setAudits(data.audits)
      } else {
        setError('Failed to load shared audits')
      }
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  useEffect(() => { fetchAudits() }, [])

  const revokeAudit = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/shared-audits?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        setAudits(prev => prev.map(a => a.id === id ? { ...a, active: false, expires_at: new Date().toISOString() } : a))
      }
    } catch { /* ignore */ }
    setActionId(null)
  }

  const extendAudit = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/shared-audits?id=${id}`, {
        method: 'PATCH',
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setAudits(prev => prev.map(a => a.id === id ? { ...a, active: true, expires_at: data.expiresAt } : a))
      }
    } catch { /* ignore */ }
    setActionId(null)
  }

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/audit/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const dm = darkMode
  const activeAudits = audits.filter(a => a.active)
  const expiredAudits = audits.filter(a => !a.active)
  const totalViews = audits.reduce((sum, a) => sum + (a.views || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 border ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs uppercase tracking-wide ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Total Shared</p>
          <p className={`text-2xl font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{audits.length}</p>
        </div>
        <div className={`rounded-xl p-4 border ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs uppercase tracking-wide ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Active Links</p>
          <p className="text-2xl font-bold text-emerald-500">{activeAudits.length}</p>
        </div>
        <div className={`rounded-xl p-4 border ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs uppercase tracking-wide ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Expired</p>
          <p className={`text-2xl font-bold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{expiredAudits.length}</p>
        </div>
        <div className={`rounded-xl p-4 border ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs uppercase tracking-wide ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Total Views</p>
          <p className="text-2xl font-bold text-blue-500">{totalViews}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
          Site Audits
        </h3>
        <button onClick={fetchAudits} disabled={loading}
          className={`flex items-center gap-1.5 text-xs font-medium ${dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading && audits.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className={`w-6 h-6 animate-spin ${dm ? 'text-slate-600' : 'text-slate-300'}`} />
        </div>
      ) : audits.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${dm ? 'bg-slate-800/30 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
          <Link2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No shared audits yet</p>
          <p className="text-xs mt-1">Generate an audit and click "Share" to create a public link</p>
        </div>
      ) : (
        <div className="space-y-2">
          {audits.map(audit => {
            const days = daysUntil(audit.expires_at)
            const isExpiring = audit.active && days <= 7
            return (
              <div key={audit.id}
                className={`rounded-xl border p-4 transition-colors ${
                  dm
                    ? `${audit.active ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800/20 border-slate-800 opacity-60'}`
                    : `${audit.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-semibold truncate ${dm ? 'text-white' : 'text-slate-900'}`}>
                        {audit.facility_name}
                      </h4>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        audit.active
                          ? isExpiring ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                          : `${dm ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'}`
                      }`}>
                        {audit.active ? (isExpiring ? `${days}d left` : 'Active') : 'Expired'}
                      </span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="font-mono">/audit/{audit.slug}</span>
                      <span className="flex items-center gap-1"><Eye size={10} />{audit.views} view{audit.views !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(audit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {audit.active && (
                        <span className={`flex items-center gap-1 ${isExpiring ? 'text-amber-500' : ''}`}>
                          Expires {new Date(audit.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {audit.active && (
                      <>
                        <button onClick={() => copyLink(audit.slug, audit.id)} title="Copy link"
                          className={`p-1.5 rounded-lg transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                          {copiedId === audit.id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <a href={`/audit/${audit.slug}`} target="_blank" rel="noopener noreferrer" title="Open audit"
                          className={`p-1.5 rounded-lg transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                          <ExternalLink size={14} />
                        </a>
                        <button onClick={() => extendAudit(audit.id)} disabled={actionId === audit.id} title="Extend 90 days"
                          className={`p-1.5 rounded-lg transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400 hover:text-blue-400' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-600'}`}>
                          {actionId === audit.id ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                        </button>
                      </>
                    )}
                    {!audit.active && (
                      <button onClick={() => extendAudit(audit.id)} disabled={actionId === audit.id} title="Reactivate (extend 90 days)"
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400' : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'}`}>
                        {actionId === audit.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Reactivate
                      </button>
                    )}
                    <button onClick={() => revokeAudit(audit.id)} disabled={actionId === audit.id || !audit.active} title="Revoke"
                      className={`p-1.5 rounded-lg transition-colors ${
                        !audit.active ? 'opacity-30 cursor-not-allowed' :
                        dm ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                      }`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
