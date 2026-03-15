import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, DollarSign, ArrowUpRight, Shield, CreditCard, Zap,
  Search, RefreshCw, ChevronDown, ChevronRight, Send, Check, X,
  Thermometer, Package, CheckSquare, Square, MinusSquare, Percent
} from 'lucide-react'

interface UpsellOpportunity {
  id: string
  tenant_id: string
  facility_id: string
  type: string
  title: string
  description: string
  current_value: number
  proposed_value: number
  monthly_uplift: number
  confidence: number
  status: string
  outreach_method: string | null
  sent_at: string | null
  responded_at: string | null
  tenant_name: string
  tenant_email: string
  tenant_phone: string
  unit_number: string
  unit_size: string
  monthly_rate: number
  facility_name: string
  facility_location: string
}

interface UpsellStats {
  total_opportunities: number
  pending_count: number
  sent_count: number
  accepted_count: number
  declined_count: number
  potential_mrr: number
  captured_mrr: number
  type_count: number
  acceptance_rate?: number
}

const TYPE_ICONS: Record<string, typeof Shield> = {
  insurance: Shield,
  autopay: CreditCard,
  unit_upgrade: Package,
  climate_upgrade: Thermometer,
  longer_term: Zap,
}

const TYPE_COLORS: Record<string, string> = {
  insurance: 'bg-blue-100 text-blue-700',
  autopay: 'bg-emerald-100 text-emerald-700',
  unit_upgrade: 'bg-purple-100 text-purple-700',
  climate_upgrade: 'bg-amber-100 text-amber-700',
  longer_term: 'bg-indigo-100 text-indigo-700',
}

const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-slate-100 text-slate-600',
  queued: 'bg-blue-100 text-blue-700',
  sent: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
}

export default function UpsellEngineView({ adminKey, darkMode }: { adminKey: string; darkMode: boolean }) {
  const [opportunities, setOpportunities] = useState<UpsellOpportunity[]>([])
  const [stats, setStats] = useState<UpsellStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/upsell?${params}`, { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setOpportunities(data.opportunities || [])
        setStats(data.stats || null)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [adminKey, typeFilter, statusFilter])

  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [typeFilter, statusFilter, searchQuery])

  const runScan = async () => {
    try {
      setScanning(true)
      await fetch('/api/upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({}),
      })
      await fetchOpportunities()
    } catch { /* silent */ } finally { setScanning(false) }
  }

  const updateStatus = async (id: string, status: string, outreach_method?: string) => {
    try {
      await fetch('/api/upsell', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id, status, outreach_method }),
      })
      fetchOpportunities()
    } catch { /* silent */ }
  }

  const batchAction = async (action: string, extras: Record<string, string> = {}) => {
    if (selectedIds.size === 0) return
    try {
      await fetch('/api/upsell', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, ...extras }),
      })
      setSelectedIds(new Set())
      fetchOpportunities()
    } catch { /* silent */ }
  }

  const filtered = opportunities.filter(o => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return o.tenant_name.toLowerCase().includes(q) || o.title.toLowerCase().includes(q) ||
             o.facility_name.toLowerCase().includes(q)
    }
    return true
  })

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id))
  const someFilteredSelected = filtered.some(o => selectedIds.has(o.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Revenue impact projection: sum monthly_uplift from identified items
  const revenueProjection = useMemo(() => {
    const identifiedItems = opportunities.filter(o => o.status === 'identified')
    const projectedMrr = identifiedItems.reduce((sum, o) => sum + (o.monthly_uplift || 0), 0)
    return { projectedMrr, projectedAnnual: projectedMrr * 12, count: identifiedItems.length }
  }, [opportunities])

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { icon: TrendingUp, label: 'Opportunities', value: stats?.total_opportunities || 0, color: 'text-purple-500' },
          { icon: DollarSign, label: 'Potential MRR', value: `$${(stats?.potential_mrr || 0).toLocaleString()}`, color: 'text-amber-500' },
          { icon: ArrowUpRight, label: 'Captured MRR', value: `$${(stats?.captured_mrr || 0).toLocaleString()}`, color: 'text-green-500' },
          { icon: Check, label: 'Accepted', value: stats?.accepted_count || 0, color: 'text-emerald-500' },
          { icon: Percent, label: 'Acceptance Rate', value: stats?.acceptance_rate != null ? `${stats.acceptance_rate.toFixed(1)}%` : '0%', color: 'text-cyan-500' },
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

      {/* Type breakdown */}
      <div className={`rounded-xl border p-4 ${card}`}>
        <h3 className="font-semibold text-sm mb-3">Opportunity Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['insurance', 'autopay', 'unit_upgrade', 'climate_upgrade', 'longer_term'].map(type => {
            const Icon = TYPE_ICONS[type] || Package
            const count = opportunities.filter(o => o.type === type).length
            const uplift = opportunities.filter(o => o.type === type && o.status === 'identified').reduce((s, o) => s + (o.monthly_uplift || 0), 0)
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  typeFilter === type
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : card
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={muted} />
                  <span className="text-xs font-medium capitalize">{type.replace('_', ' ')}</span>
                </div>
                <div className="text-lg font-bold">{count}</div>
                {uplift > 0 && <div className={`text-xs ${muted}`}>+${uplift}/mo</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Revenue Impact Projection */}
      {revenueProjection.count > 0 && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <h3 className="font-semibold text-sm mb-3">Revenue Impact Projection</h3>
          <p className={`text-xs ${muted} mb-3`}>If all {revenueProjection.count} identified opportunities are accepted:</p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg p-4 border ${card}`}>
              <div className={`text-xs font-medium ${muted} mb-1`}>Projected Additional MRR</div>
              <div className="text-2xl font-bold text-green-600">+${revenueProjection.projectedMrr.toLocaleString()}</div>
            </div>
            <div className={`rounded-lg p-4 border ${card}`}>
              <div className={`text-xs font-medium ${muted} mb-1`}>Projected Annual Revenue</div>
              <div className="text-2xl font-bold text-green-600">+${revenueProjection.projectedAnnual.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search opportunities..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300'}`}
        >
          <option value="all">All Statuses</option>
          <option value="identified">Identified</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <Zap size={14} className={scanning ? 'animate-pulse' : ''} />
          {scanning ? 'Scanning...' : 'Scan for Upsells'}
        </button>
        <button onClick={fetchOpportunities} className={`p-2 rounded-lg border ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className={`sticky top-0 z-10 rounded-xl border p-3 flex flex-wrap items-center gap-3 ${darkMode ? 'bg-slate-900 border-slate-600' : 'bg-indigo-50 border-indigo-200'}`}>
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-indigo-800'}`}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => batchAction('batch_send', { outreach_method: 'email' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
            >
              <Send size={12} />
              Send {selectedIds.size} via Email
            </button>
            <button
              onClick={() => batchAction('batch_send', { outreach_method: 'sms' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              <Send size={12} />
              Send {selectedIds.size} via SMS
            </button>
            <button
              onClick={() => batchAction('batch_status', { status: 'declined' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
            >
              <X size={12} />
              Mark Declined
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Opportunities list */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={toggleSelectAll} className="flex-shrink-0">
            {allFilteredSelected ? (
              <CheckSquare size={16} className="text-indigo-500" />
            ) : someFilteredSelected ? (
              <MinusSquare size={16} className="text-indigo-500" />
            ) : (
              <Square size={16} className={muted} />
            )}
          </button>
          <h3 className="font-semibold text-sm">Upsell Opportunities ({filtered.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-purple-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-12 ${muted}`}>
            <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No opportunities found. Click "Scan for Upsells" to analyze tenants.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map(o => {
              const TypeIcon = TYPE_ICONS[o.type] || Package
              const isSelected = selectedIds.has(o.id)
              return (
                <div key={o.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? (darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50/50') : ''} ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
                    onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  >
                    <button
                      className="flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(o.id) }}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-indigo-500" />
                      ) : (
                        <Square size={16} className={muted} />
                      )}
                    </button>

                    {expandedId === o.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}

                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[o.type] || 'bg-slate-100'}`}>
                      <TypeIcon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{o.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                          {o.status}
                        </span>
                      </div>
                      <div className={`text-xs ${muted} mt-0.5`}>
                        {o.tenant_name} &middot; Unit {o.unit_number} &middot; {o.facility_name}
                      </div>
                    </div>

                    <div className="text-right">
                      {o.monthly_uplift > 0 ? (
                        <div className="text-sm font-semibold text-green-600">+${o.monthly_uplift.toFixed(0)}/mo</div>
                      ) : (
                        <div className={`text-sm font-medium ${muted}`}>Retention</div>
                      )}
                      <div className={`text-xs ${muted}`}>{o.confidence}% confidence</div>
                    </div>

                    {/* Confidence bar */}
                    <div className={`w-16 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full ${o.confidence >= 70 ? 'bg-green-500' : o.confidence >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                        style={{ width: `${o.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded */}
                  {expandedId === o.id && (
                    <div className={`px-4 pb-4 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <p className={`text-sm mb-3 ${muted}`}>{o.description}</p>

                      {o.monthly_uplift > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className={`rounded-lg p-3 border ${card}`}>
                            <div className={`text-xs ${muted}`}>Current</div>
                            <div className="text-lg font-bold">${o.current_value.toFixed(0)}/mo</div>
                          </div>
                          <div className={`rounded-lg p-3 border ${card}`}>
                            <div className={`text-xs ${muted}`}>Proposed</div>
                            <div className="text-lg font-bold">${o.proposed_value.toFixed(0)}/mo</div>
                          </div>
                          <div className={`rounded-lg p-3 border ${card}`}>
                            <div className={`text-xs ${muted}`}>Uplift</div>
                            <div className="text-lg font-bold text-green-600">+${o.monthly_uplift.toFixed(0)}/mo</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {o.status === 'identified' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'sent', 'email') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                            >
                              <Send size={12} /> Send Email
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'sent', 'sms') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                            >
                              <Send size={12} /> Send SMS
                            </button>
                          </>
                        )}
                        {o.status === 'sent' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'accepted') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                            >
                              <Check size={12} /> Accepted
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'declined') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                            >
                              <X size={12} /> Declined
                            </button>
                          </>
                        )}
                        {o.sent_at && (
                          <span className={`text-xs ${muted}`}>Sent {new Date(o.sent_at).toLocaleDateString()}</span>
                        )}
                        {o.responded_at && (
                          <span className={`text-xs ${muted}`}>Responded {new Date(o.responded_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
