import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, MousePointer, RotateCcw, CheckCircle2,
  Search, RefreshCw, ChevronDown, ChevronRight, Play, Pause,
  Gift, TrendingUp, Users, Clock, Send, Eye
} from 'lucide-react'

interface RemarketingSequence {
  id: string
  tenant_id: string
  facility_id: string
  moved_out_date: string
  move_out_reason: string | null
  sequence_status: string
  current_step: number
  total_steps: number
  last_sent_at: string | null
  next_send_at: string | null
  opened_count: number
  clicked_count: number
  converted: boolean
  converted_at: string | null
  offer_type: string | null
  offer_value: number
  tenant_name: string
  tenant_email: string
  tenant_phone: string
  unit_number: string
  unit_size: string
  monthly_rate: number
  tenant_move_out_reason: string | null
  facility_name: string
  facility_location: string
}

interface RemarketingStats {
  total_sequences: number
  active_sequences: number
  completed_sequences: number
  converted_count: number
  total_opens: number
  total_clicks: number
  conversion_rate: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  active: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-slate-100 text-slate-600',
  converted: 'bg-green-100 text-green-700',
  unsubscribed: 'bg-red-100 text-red-700',
}

const REASON_LABELS: Record<string, string> = {
  voluntary: 'Voluntary',
  eviction: 'Eviction',
  relocation: 'Relocation',
  downsizing: 'Downsizing',
  other: 'Other',
}

const OFFER_LABELS: Record<string, string> = {
  discount: 'Discount',
  free_month: 'Free Month',
  waived_fee: 'Waived Fee',
  none: 'No Offer',
}

const WELCOME_BACK_STEPS = [
  { step: 1, delay: '3 days', subject: 'We miss you!', description: 'Friendly check-in after move-out' },
  { step: 2, delay: '10 days', subject: 'Need storage again?', description: 'Soft reminder with available units' },
  { step: 3, delay: '30 days', subject: 'Special offer inside', description: 'Personalized discount offer' },
  { step: 4, delay: '60 days', subject: 'Your space is waiting', description: 'Urgency-based with unit availability' },
  { step: 5, delay: '90 days', subject: 'Last chance offer', description: 'Final touchpoint with best offer' },
]

export default function MoveOutRemarketingView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [sequences, setSequences] = useState<RemarketingSequence[]>([])
  const [stats, setStats] = useState<RemarketingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/moveout-remarketing?${params}`, { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setSequences(data.sequences || [])
        setStats(data.stats || null)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [adminKey, statusFilter])

  useEffect(() => { fetchSequences() }, [fetchSequences])

  const batchEnroll = async () => {
    try {
      // Enroll across all facilities
      await fetch('/api/moveout-remarketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: null, offer_type: 'discount', offer_value: 10 }),
      })
      fetchSequences()
    } catch { /* silent */ }
  }

  const updateSequence = async (id: string, action: string) => {
    try {
      if (action === 'pause' || action === 'resume') {
        await fetch('/api/moveout-remarketing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, sequence_status: action === 'pause' ? 'paused' : 'active' }),
        })
      } else {
        await fetch('/api/moveout-remarketing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ id, action }),
        })
      }
      fetchSequences()
    } catch { /* silent */ }
  }

  const filtered = sequences.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.tenant_name.toLowerCase().includes(q) || s.facility_name.toLowerCase().includes(q)
    }
    return true
  })

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`

  const lostRevenue = sequences
    .filter(s => !s.converted)
    .reduce((sum, s) => sum + (s.monthly_rate || 0), 0)

  const recoveredRevenue = sequences
    .filter(s => s.converted)
    .reduce((sum, s) => sum + (s.monthly_rate || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Active Sequences', value: stats?.active_sequences || 0, color: 'text-blue-500' },
          { icon: RotateCcw, label: 'Converted', value: stats?.converted_count || 0, color: 'text-green-500' },
          { icon: TrendingUp, label: 'Recovered Revenue', value: `$${recoveredRevenue.toLocaleString()}/mo`, color: 'text-emerald-500' },
          { icon: CheckCircle2, label: 'Conversion Rate', value: `${stats?.conversion_rate || 0}%`, color: 'text-purple-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <span className={`text-xs font-medium ${muted}`}>{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Engagement stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Eye, label: 'Total Opens', value: stats?.total_opens || 0 },
          { icon: MousePointer, label: 'Total Clicks', value: stats?.total_clicks || 0 },
          { icon: Clock, label: 'Lost Revenue', value: `$${lostRevenue.toLocaleString()}/mo`, sub: 'recoverable' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={muted} />
              <span className={`text-xs font-medium ${muted}`}>{label}</span>
            </div>
            <div className="text-lg font-bold">{value}</div>
            {sub && <div className={`text-xs ${muted}`}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Welcome back sequence template */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h3 className="font-semibold text-sm mb-3">Welcome Back Sequence</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {WELCOME_BACK_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-44 p-3 rounded-lg border ${darkMode ? 'border-slate-600 bg-slate-750' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-blue-100 text-blue-700' : i < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {step.step}
                </div>
                <span className={`text-xs ${muted}`}>{step.delay}</span>
              </div>
              <div className="text-sm font-medium truncate">{step.subject}</div>
              <div className={`text-xs ${muted} mt-0.5`}>{step.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search former tenants..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="converted">Converted</option>
        </select>
        <button
          onClick={batchEnroll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          <UserPlus size={14} /> Auto-Enroll Recent
        </button>
        <button onClick={fetchSequences} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sequences list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-semibold text-sm">Remarketing Sequences ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${muted}`}>
            <RotateCcw size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sequences yet. Move-out tenants are automatically enrolled, or click "Auto-Enroll Recent".</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map(s => (
              <div key={s.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  {expandedId === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.tenant_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.sequence_status]}`}>
                        {s.sequence_status}
                      </span>
                      {s.converted && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Converted!
                        </span>
                      )}
                      {s.offer_type && s.offer_type !== 'none' && (
                        <span className="flex items-center gap-1 text-xs text-purple-600">
                          <Gift size={10} />
                          {OFFER_LABELS[s.offer_type] || s.offer_type}
                          {s.offer_value > 0 && ` ($${s.offer_value})`}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${muted} mt-0.5`}>
                      {s.facility_name} &middot;
                      Moved out {new Date(s.moved_out_date).toLocaleDateString()} &middot;
                      {REASON_LABELS[s.move_out_reason || s.tenant_move_out_reason || ''] || 'Unknown reason'}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className={`text-xs font-medium ${muted}`}>Step {s.current_step}/{s.total_steps}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Eye size={10} className={muted} /><span className={`text-xs ${muted}`}>{s.opened_count}</span>
                        <MousePointer size={10} className={muted} /><span className={`text-xs ${muted}`}>{s.clicked_count}</span>
                      </div>
                    </div>
                    <div className={`w-20 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full ${s.converted ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${(s.current_step / s.total_steps) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-semibold ${s.converted ? 'text-green-600' : ''}`}>
                      ${(s.monthly_rate || 0).toFixed(0)}/mo
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {expandedId === s.id && (
                  <div className={`px-4 pb-4 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    {/* Sequence progress */}
                    <div className="mb-4">
                      <h4 className={`text-xs font-semibold ${muted} uppercase mb-2`}>Sequence Progress</h4>
                      <div className="flex gap-2">
                        {WELCOME_BACK_STEPS.map((step, i) => (
                          <div
                            key={i}
                            className={`flex-1 p-2 rounded-lg text-center text-xs ${
                              i < s.current_step
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : i === s.current_step
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-400'
                                : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <div className="font-bold">{step.step}</div>
                            <div className="truncate">{step.delay}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div><span className={muted}>Email:</span> {s.tenant_email || '—'}</div>
                      <div><span className={muted}>Phone:</span> {s.tenant_phone || '—'}</div>
                      <div><span className={muted}>Former unit:</span> {s.unit_number} ({s.unit_size})</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {s.sequence_status === 'active' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateSequence(s.id, 'advance') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                          >
                            <Send size={12} /> Send Next
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateSequence(s.id, 'pause') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                          >
                            <Pause size={12} /> Pause
                          </button>
                        </>
                      )}
                      {s.sequence_status === 'paused' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateSequence(s.id, 'resume') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                        >
                          <Play size={12} /> Resume
                        </button>
                      )}
                      {!s.converted && s.sequence_status !== 'converted' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateSequence(s.id, 'convert') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                        >
                          <CheckCircle2 size={12} /> Mark Converted
                        </button>
                      )}
                      {s.next_send_at && s.sequence_status === 'active' && (
                        <span className={`text-xs ${muted} ml-auto`}>
                          Next send: {new Date(s.next_send_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
