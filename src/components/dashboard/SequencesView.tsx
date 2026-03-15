import { useState, useEffect, useCallback } from 'react'
import { Loader2, Building2, Mail, Clock, RefreshCw, XCircle, CalendarClock } from 'lucide-react'

interface DripState {
  sequenceId: string
  leadId: string
  currentStep: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  enrolledAt: string
  nextSendAt: string
  completedAt?: string
  cancelledAt?: string
  cancelReason?: string
  pausedAt?: string
  history: { step: number; templateId: string; sentAt: string }[]
  leadName?: string
  leadEmail?: string
  facilityName?: string
  leadStatus?: string
}

interface SequenceDef {
  id: string
  name: string
  description: string
  steps: { delayDays: number; templateId: string; label: string }[]
}

export default function SequencesView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [drips, setDrips] = useState<DripState[]>([])
  const [sequences, setSequences] = useState<SequenceDef[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'cancelled'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const bg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-200' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const fetchDrips = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/drip-sequences', { headers: { 'X-Admin-Key': adminKey } })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSequences(data.sequences || [])
      setDrips(data.drips || [])
    } catch {
      console.error('Failed to fetch drip sequences')
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => { fetchDrips() }, [fetchDrips])

  const handleAction = async (leadId: string, action: 'pause' | 'resume' | 'cancel') => {
    setActionLoading(leadId)
    try {
      const method = action === 'cancel' ? 'DELETE' : 'PATCH'
      const body = action === 'cancel' ? { leadId } : { leadId, action }
      const res = await fetch('/api/drip-sequences', {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })
      if (res.ok) await fetchDrips()
    } catch {
      console.error(`Failed to ${action} drip`)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = filter === 'all' ? drips : drips.filter(d => d.status === filter)

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const counts = {
    all: drips.length,
    active: drips.filter(d => d.status === 'active').length,
    paused: drips.filter(d => d.status === 'paused').length,
    completed: drips.filter(d => d.status === 'completed').length,
    cancelled: drips.filter(d => d.status === 'cancelled').length,
  }

  const activeSequence = sequences[0]

  return (
    <div>
      {/* Sequence overview */}
      {activeSequence && (
        <div className={`rounded-xl border ${bg} p-5 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`font-semibold ${text}`}>{activeSequence.name}</h3>
              <p className={`text-sm ${sub}`}>{activeSequence.description}</p>
            </div>
            <button onClick={fetchDrips} className={`text-sm ${sub} hover:${text} transition-colors`}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeSequence.steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <span className="font-medium">Day {step.delayDays}</span>
                <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>|</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['all', 'active', 'paused', 'completed', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
              filter === f
                ? `${darkMode ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border`
                : `${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Drip list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 ${sub}`}>
          <CalendarClock size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {filter === 'all' ? '' : filter + ' '}drip sequences found</p>
          <p className="text-xs mt-1">Leads are automatically enrolled when they submit the audit form</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(drip => {
            const sequence = sequences.find(s => s.id === drip.sequenceId)
            const totalSteps = sequence?.steps.length || 4
            const progress = drip.status === 'completed' ? 100 : Math.round((drip.currentStep / totalSteps) * 100)
            const currentStepLabel = sequence?.steps[drip.currentStep]?.label || 'Complete'
            const isLoading = actionLoading === drip.leadId

            return (
              <div key={drip.leadId} className={`rounded-xl border ${bg} p-4`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold truncate ${text}`}>{drip.leadName}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[drip.status] || ''}`}>
                        {drip.status}
                      </span>
                    </div>
                    <div className={`flex items-center gap-3 mt-1 text-sm ${sub}`}>
                      <span className="flex items-center gap-1"><Building2 size={12} />{drip.facilityName}</span>
                      <span className="flex items-center gap-1"><Mail size={12} />{drip.leadEmail}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {drip.status === 'active' && (
                      <button
                        onClick={() => handleAction(drip.leadId, 'pause')}
                        disabled={isLoading}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        title="Pause sequence"
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                      </button>
                    )}
                    {drip.status === 'paused' && (
                      <button
                        onClick={() => handleAction(drip.leadId, 'resume')}
                        disabled={isLoading}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${darkMode ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'}`}
                        title="Resume sequence"
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                    )}
                    {(drip.status === 'active' || drip.status === 'paused') && (
                      <button
                        onClick={() => handleAction(drip.leadId, 'cancel')}
                        disabled={isLoading}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                        title="Cancel sequence"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={sub}>
                      Step {Math.min(drip.currentStep + 1, totalSteps)} of {totalSteps}
                      {drip.status === 'active' && ` — Next: ${currentStepLabel}`}
                    </span>
                    {drip.status === 'active' && drip.nextSendAt && (
                      <span className={sub}>
                        {new Date(drip.nextSendAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        drip.status === 'completed' ? 'bg-blue-500' :
                        drip.status === 'cancelled' ? 'bg-red-400' :
                        drip.status === 'paused' ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* History */}
                {drip.history.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {drip.history.map((h, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        {sequence?.steps[h.step]?.label || h.templateId} — {new Date(h.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
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
