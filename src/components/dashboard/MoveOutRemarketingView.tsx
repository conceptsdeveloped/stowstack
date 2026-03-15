import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  UserPlus, MousePointer, RotateCcw, CheckCircle2,
  Search, RefreshCw, ChevronDown, ChevronRight, Play, Pause,
  Gift, TrendingUp, Users, Clock, Send, Eye, X, Save,
  BarChart3, SlidersHorizontal, Square, CheckSquare, Minus
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
  avg_steps_completed: number
}

interface ReasonBreakdownItem {
  reason: string
  count: number
  converted: number
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

const OFFER_TYPES = [
  { value: 'discount', label: 'Discount' },
  { value: 'free_month', label: 'Free Month' },
  { value: 'waived_fee', label: 'Waived Fee' },
  { value: 'none', label: 'No Offer' },
]

const WELCOME_BACK_STEPS = [
  { step: 1, delay: '3 days', subject: 'We miss you!', description: 'Friendly check-in after move-out' },
  { step: 2, delay: '10 days', subject: 'Need storage again?', description: 'Soft reminder with available units' },
  { step: 3, delay: '30 days', subject: 'Special offer inside', description: 'Personalized discount offer' },
  { step: 4, delay: '60 days', subject: 'Your space is waiting', description: 'Urgency-based with unit availability' },
  { step: 5, delay: '90 days', subject: 'Last chance offer', description: 'Final touchpoint with best offer' },
]

function renderOfferPreview(offerType: string, offerValue: number): string {
  switch (offerType) {
    case 'discount':
      return offerValue > 0 ? `First month ${offerValue}% off` : 'Discount (set value)'
    case 'free_month':
      return 'Free month on return'
    case 'waived_fee':
      return offerValue > 0 ? `$${offerValue} admin fee waived` : 'Admin fee waived'
    case 'none':
      return 'No offer attached'
    default:
      return 'Select an offer type'
  }
}

export default function MoveOutRemarketingView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [sequences, setSequences] = useState<RemarketingSequence[]>([])
  const [stats, setStats] = useState<RemarketingStats | null>(null)
  const [reasonBreakdown, setReasonBreakdown] = useState<ReasonBreakdownItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Offer editor state per sequence
  const [editingOffer, setEditingOffer] = useState<Record<string, { offer_type: string; offer_value: number }>>({})
  const [savingOffer, setSavingOffer] = useState<string | null>(null)

  // Batch enrollment modal
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchFacility, setBatchFacility] = useState<string>('all')
  const [batchOfferType, setBatchOfferType] = useState('discount')
  const [batchOfferValue, setBatchOfferValue] = useState(10)
  const [batchReasonFilter, setBatchReasonFilter] = useState('all')
  const [batchDaysSince, setBatchDaysSince] = useState(90)
  const [batchPreviewCount, setBatchPreviewCount] = useState<number | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchActionLoading, setBatchActionLoading] = useState(false)

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
        setReasonBreakdown(data.reasonBreakdown || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [adminKey, statusFilter])

  useEffect(() => { fetchSequences() }, [fetchSequences])

  // Fetch batch preview count when modal params change
  useEffect(() => {
    if (!showBatchModal) return
    const fetchPreview = async () => {
      try {
        setBatchPreviewLoading(true)
        const params = new URLSearchParams()
        params.set('preview', '1')
        if (batchFacility !== 'all') params.set('facilityId', batchFacility)
        if (batchReasonFilter !== 'all') params.set('reason', batchReasonFilter)
        params.set('days_since', String(batchDaysSince))
        const res = await fetch(`/api/moveout-remarketing?${params}`, { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setBatchPreviewCount(data.eligibleCount ?? null)
        }
      } catch { /* silent */ } finally { setBatchPreviewLoading(false) }
    }
    fetchPreview()
  }, [showBatchModal, batchFacility, batchReasonFilter, batchDaysSince, adminKey])

  const batchEnroll = async () => {
    try {
      setBatchLoading(true)
      await fetch('/api/moveout-remarketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: batchFacility === 'all' ? null : batchFacility,
          offer_type: batchOfferType,
          offer_value: batchOfferValue,
          reason_filter: batchReasonFilter === 'all' ? null : batchReasonFilter,
          days_since: batchDaysSince,
        }),
      })
      setShowBatchModal(false)
      fetchSequences()
    } catch { /* silent */ } finally { setBatchLoading(false) }
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

  const saveOffer = async (id: string) => {
    const offerData = editingOffer[id]
    if (!offerData) return
    try {
      setSavingOffer(id)
      await fetch('/api/moveout-remarketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id, offer_type: offerData.offer_type, offer_value: offerData.offer_value }),
      })
      setEditingOffer(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      fetchSequences()
    } catch { /* silent */ } finally { setSavingOffer(null) }
  }

  const initOfferEdit = (s: RemarketingSequence) => {
    if (!editingOffer[s.id]) {
      setEditingOffer(prev => ({
        ...prev,
        [s.id]: { offer_type: s.offer_type || 'none', offer_value: s.offer_value || 0 },
      }))
    }
  }

  // Batch selection handlers
  const batchAction = async (action: 'pause' | 'resume' | 'advance') => {
    if (selectedIds.size === 0) return
    try {
      setBatchActionLoading(true)
      const ids = Array.from(selectedIds)
      if (action === 'pause' || action === 'resume') {
        await fetch('/api/moveout-remarketing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ ids, sequence_status: action === 'pause' ? 'paused' : 'active' }),
        })
      } else {
        await fetch('/api/moveout-remarketing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ ids, action }),
        })
      }
      setSelectedIds(new Set())
      fetchSequences()
    } catch { /* silent */ } finally { setBatchActionLoading(false) }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)))
    }
  }

  const filtered = sequences.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.tenant_name.toLowerCase().includes(q) || s.facility_name.toLowerCase().includes(q)
    }
    return true
  })

  const facilityOptions = useMemo(() => {
    const map = new Map<string, string>()
    sequences.forEach(s => {
      if (s.facility_id && s.facility_name) map.set(s.facility_id, s.facility_name)
    })
    return Array.from(map.entries())
  }, [sequences])

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`

  const lostRevenue = sequences
    .filter(s => !s.converted)
    .reduce((sum, s) => sum + (s.monthly_rate || 0), 0)

  const recoveredRevenue = sequences
    .filter(s => s.converted)
    .reduce((sum, s) => sum + (s.monthly_rate || 0), 0)

  const maxReasonCount = reasonBreakdown.length > 0 ? Math.max(...reasonBreakdown.map(r => r.count)) : 1

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { icon: Users, label: 'Active Sequences', value: stats?.active_sequences || 0, color: 'text-blue-500' },
          { icon: RotateCcw, label: 'Converted', value: stats?.converted_count || 0, color: 'text-green-500' },
          { icon: TrendingUp, label: 'Recovered Revenue', value: `$${recoveredRevenue.toLocaleString()}/mo`, color: 'text-emerald-500' },
          { icon: CheckCircle2, label: 'Conversion Rate', value: `${stats?.conversion_rate || 0}%`, color: 'text-purple-500' },
          { icon: SlidersHorizontal, label: 'Avg Steps Completed', value: stats?.avg_steps_completed != null ? stats.avg_steps_completed.toFixed(1) : '—', color: 'text-indigo-500' },
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

      {/* Move-out Reason Breakdown */}
      {reasonBreakdown.length > 0 && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-sm">Move-Out Reason Breakdown</h3>
          </div>
          <div className="space-y-2">
            {reasonBreakdown.map(r => (
              <div key={r.reason} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium truncate">
                  {REASON_LABELS[r.reason] || r.reason || 'Unknown'}
                </div>
                <div className={`flex-1 h-6 rounded-md overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-md bg-indigo-500/70 flex items-center px-2"
                    style={{ width: `${Math.max((r.count / maxReasonCount) * 100, 8)}%` }}
                  >
                    <span className="text-xs font-medium text-white whitespace-nowrap">{r.count}</span>
                  </div>
                </div>
                <div className="w-28 text-right">
                  <span className={`text-xs ${muted}`}>{r.converted} converted</span>
                  <span className="text-xs font-semibold text-green-600 ml-1">({r.conversion_rate}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          onClick={() => setShowBatchModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          <UserPlus size={14} /> Batch Enroll
        </button>
        <button onClick={fetchSequences} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className={`rounded-xl border p-3 flex items-center gap-3 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => batchAction('pause')}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-yellow-600 border-yellow-300 hover:bg-yellow-50 disabled:opacity-50"
            >
              <Pause size={12} /> Pause {selectedIds.size}
            </button>
            <button
              onClick={() => batchAction('resume')}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-green-600 border-green-300 hover:bg-green-50 disabled:opacity-50"
            >
              <Play size={12} /> Resume {selectedIds.size}
            </button>
            <button
              onClick={() => batchAction('advance')}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={12} /> Send Next to {selectedIds.size}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Sequences list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {filtered.length > 0 && (
            <button onClick={toggleSelectAll} className="flex-shrink-0">
              {allSelected ? (
                <CheckSquare size={16} className="text-blue-500" />
              ) : someSelected ? (
                <Minus size={16} className="text-blue-500" />
              ) : (
                <Square size={16} className={muted} />
              )}
            </button>
          )}
          <h3 className="font-semibold text-sm">Remarketing Sequences ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${muted}`}>
            <RotateCcw size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sequences yet. Move-out tenants are automatically enrolled, or click "Batch Enroll".</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map(s => (
              <div key={s.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(s.id) }}
                    className="flex-shrink-0"
                  >
                    {selectedIds.has(s.id) ? (
                      <CheckSquare size={16} className="text-blue-500" />
                    ) : (
                      <Square size={16} className={muted} />
                    )}
                  </button>

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

                    {/* Offer Editor */}
                    <div className={`mb-4 p-3 rounded-lg border ${darkMode ? 'border-slate-600 bg-slate-750' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Gift size={14} className="text-purple-500" />
                        <h4 className={`text-xs font-semibold ${muted} uppercase`}>Offer</h4>
                      </div>
                      {editingOffer[s.id] ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <select
                              value={editingOffer[s.id].offer_type}
                              onChange={e => setEditingOffer(prev => ({
                                ...prev,
                                [s.id]: { ...prev[s.id], offer_type: e.target.value },
                              }))}
                              onClick={e => e.stopPropagation()}
                              className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
                            >
                              {OFFER_TYPES.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {editingOffer[s.id].offer_type !== 'none' && editingOffer[s.id].offer_type !== 'free_month' && (
                              <div className="flex items-center gap-1">
                                <span className={`text-sm ${muted}`}>$</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={editingOffer[s.id].offer_value}
                                  onChange={e => setEditingOffer(prev => ({
                                    ...prev,
                                    [s.id]: { ...prev[s.id], offer_value: Number(e.target.value) },
                                  }))}
                                  onClick={e => e.stopPropagation()}
                                  className={`w-20 px-2 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
                                />
                              </div>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); saveOffer(s.id) }}
                              disabled={savingOffer === s.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50"
                            >
                              <Save size={12} /> Save Offer
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setEditingOffer(prev => {
                                  const next = { ...prev }
                                  delete next[s.id]
                                  return next
                                })
                              }}
                              className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                            >
                              <X size={14} className={muted} />
                            </button>
                          </div>
                          <div className={`text-xs ${muted} italic`}>
                            Preview: {renderOfferPreview(editingOffer[s.id].offer_type, editingOffer[s.id].offer_value)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            {s.offer_type && s.offer_type !== 'none'
                              ? renderOfferPreview(s.offer_type, s.offer_value)
                              : 'No offer attached'}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); initOfferEdit(s) }}
                            className={`text-xs px-2 py-1 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-100'}`}
                          >
                            Edit
                          </button>
                        </div>
                      )}
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

      {/* Batch Enrollment Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBatchModal(false)}>
          <div
            className={`w-full max-w-lg mx-4 rounded-2xl border shadow-xl p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Batch Enroll Tenants</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Facility */}
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>Facility</label>
                <select
                  value={batchFacility}
                  onChange={e => setBatchFacility(e.target.value)}
                  className={inputCls}
                >
                  <option value="all">All Facilities</option>
                  {facilityOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Offer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Offer Type</label>
                  <select
                    value={batchOfferType}
                    onChange={e => setBatchOfferType(e.target.value)}
                    className={inputCls}
                  >
                    {OFFER_TYPES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-medium ${muted} block mb-1`}>Offer Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={batchOfferValue}
                    onChange={e => setBatchOfferValue(Number(e.target.value))}
                    className={inputCls}
                    disabled={batchOfferType === 'none' || batchOfferType === 'free_month'}
                  />
                </div>
              </div>

              {/* Reason filter */}
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>Move-Out Reason</label>
                <select
                  value={batchReasonFilter}
                  onChange={e => setBatchReasonFilter(e.target.value)}
                  className={inputCls}
                >
                  <option value="all">All Reasons</option>
                  <option value="voluntary">Voluntary</option>
                  <option value="relocation">Relocation</option>
                  <option value="downsizing">Downsizing</option>
                  <option value="eviction">Eviction</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Days since move-out */}
              <div>
                <label className={`text-xs font-medium ${muted} block mb-1`}>
                  Days Since Move-Out: <span className="font-bold text-sm">{batchDaysSince}</span>
                </label>
                <input
                  type="range"
                  min={7}
                  max={365}
                  value={batchDaysSince}
                  onChange={e => setBatchDaysSince(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className={`flex justify-between text-xs ${muted}`}>
                  <span>7 days</span>
                  <span>365 days</span>
                </div>
              </div>

              {/* Preview */}
              <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-750 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                {batchPreviewLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                    <span className={`text-sm ${muted}`}>Calculating...</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{batchPreviewCount ?? '—'}</div>
                    <div className={`text-xs ${muted}`}>tenants eligible for enrollment</div>
                  </div>
                )}
              </div>

              {/* Offer preview */}
              <div className={`text-xs ${muted} italic`}>
                Offer preview: {renderOfferPreview(batchOfferType, batchOfferValue)}
              </div>

              {/* Submit */}
              <button
                onClick={batchEnroll}
                disabled={batchLoading || batchPreviewCount === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                Enroll {batchPreviewCount ?? '—'} Tenants
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
