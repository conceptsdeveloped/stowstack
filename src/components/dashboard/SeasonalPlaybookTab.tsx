import { useState, useMemo, useCallback } from 'react'
import {
  Calendar, ChevronRight, ChevronDown, Play, Pause, BarChart3,
  DollarSign, Copy, Check, Clock,
  Target, MessageSquare, ArrowRight, Layers, Tag,
  Lightbulb, ArrowUpRight, Zap
} from 'lucide-react'
import {
  type SeasonalTrigger, type PlaybookStatus, type PlaybookOverride,
  MONTH_NAMES, MONTH_FULL, PRICING_RECS, PERFORMANCE_DATA, SIMULATED_ALERTS,
  TRIGGERS, getColors,
} from './playbook/PlaybookData'
import TriggerCard from './playbook/TriggerCard'
import WeatherAlerts from './playbook/WeatherAlerts'

export default function SeasonalPlaybookTab({ darkMode }: { adminKey: string; darkMode: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, PlaybookOverride>>({})
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [showActionPlan, setShowActionPlan] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['performance', 'pricing', 'competitors']))

  const currentMonth = new Date().getMonth()
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const copyToClipboard = useCallback((content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const visibleAlerts = SIMULATED_ALERTS.filter(a => !dismissedAlerts.has(a.id))

  const categories = [
    { id: 'all', label: 'All Triggers', count: TRIGGERS.length },
    { id: 'seasonal', label: 'Seasonal', count: TRIGGERS.filter(t => t.category === 'seasonal').length },
    { id: 'life-event', label: 'Life Events', count: TRIGGERS.filter(t => t.category === 'life-event').length },
    { id: 'weather', label: 'Weather', count: TRIGGERS.filter(t => t.category === 'weather').length },
    { id: 'market', label: 'Market', count: TRIGGERS.filter(t => t.category === 'market').length },
  ]

  const filtered = useMemo(() => {
    const list = selectedCategory === 'all' ? TRIGGERS : TRIGGERS.filter(t => t.category === selectedCategory)
    return list
  }, [selectedCategory])

  const activeTriggers = useMemo(() => TRIGGERS.filter(t => t.months.includes(currentMonth)), [currentMonth])

  const getStatus = (t: SeasonalTrigger): PlaybookStatus => {
    if (overrides[t.id]?.status) return overrides[t.id].status
    if (t.months.includes(currentMonth)) return 'active'
    const nextMonth = (currentMonth + 1) % 12
    const nextNext = (currentMonth + 2) % 12
    if (t.months.includes(nextMonth) || t.months.includes(nextNext)) return 'scheduled'
    return 'inactive'
  }

  const toggleStatus = (id: string) => {
    const current = overrides[id]?.status || getStatus(TRIGGERS.find(t => t.id === id)!)
    const next: PlaybookStatus = current === 'active' ? 'inactive' : current === 'inactive' ? 'active' : 'active'
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], triggerId: id, status: next } }))
  }

  const totalBudgetImpact = useMemo(() => {
    const active = TRIGGERS.filter(t => getStatus(t) === 'active')
    if (active.length === 0) return 0
    const avg = active.reduce((sum, t) => sum + (overrides[t.id]?.budgetOverride ?? t.budgetModifier), 0) / active.length
    return Math.round((avg - 1) * 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, currentMonth])

  const handleBudgetChange = (triggerId: string, newBudget: number) => {
    setOverrides(prev => ({
      ...prev,
      [triggerId]: { ...prev[triggerId], triggerId, status: getStatus(TRIGGERS.find(t => t.id === triggerId)!), budgetOverride: newBudget }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-emerald-500" />
            <span className={`text-xs font-medium ${sub}`}>Active Playbooks</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{activeTriggers.length}</p>
          <p className={`text-xs ${sub}`}>triggers firing now</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-blue-500" />
            <span className={`text-xs font-medium ${sub}`}>Current Season</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>{MONTH_FULL[currentMonth]}</p>
          <p className={`text-xs ${sub}`}>{activeTriggers.map(t => t.name.split(' ')[0]).join(', ') || 'No active triggers'}</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-amber-500" />
            <span className={`text-xs font-medium ${sub}`}>Budget Impact</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>
            {totalBudgetImpact >= 0 ? '+' : ''}{totalBudgetImpact}%
          </p>
          <p className={`text-xs ${sub}`}>avg modifier across active</p>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-violet-500" />
            <span className={`text-xs font-medium ${sub}`}>Unit Types in Focus</span>
          </div>
          <p className={`text-2xl font-bold ${text}`}>
            {[...new Set(activeTriggers.flatMap(t => t.unitEmphasis))].length}
          </p>
          <p className={`text-xs ${sub}`}>emphasized unit categories</p>
        </div>
      </div>

      {/* Weather Alerts */}
      <WeatherAlerts
        alerts={visibleAlerts}
        darkMode={darkMode}
        onViewPlaybook={(playbookId) => {
          setExpandedId(playbookId)
          setSelectedCategory('all')
        }}
        onDismiss={(alertId) => setDismissedAlerts(prev => new Set([...prev, alertId]))}
      />

      {/* This Month's Action Plan */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowActionPlan(!showActionPlan)}
          className="flex items-center justify-between px-5 py-4 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className={`text-sm font-semibold ${text}`}>This Month&apos;s Action Plan</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              {activeTriggers.length} triggers active
            </span>
          </div>
          {showActionPlan ? <ChevronDown size={16} className={sub} /> : <ChevronRight size={16} className={sub} />}
        </div>
        {showActionPlan && (
          <div className={`border-t px-5 py-5 space-y-5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            {/* Priority Actions */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <Zap size={13} /> Priority Actions for {MONTH_FULL[currentMonth]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTriggers
                  .sort((a, b) => {
                    const impact = { high: 3, medium: 2, low: 1 }
                    return impact[b.demandImpact] - impact[a.demandImpact]
                  })
                  .slice(0, 6)
                  .map((trigger, i) => {
                    const colors = getColors(trigger.color, darkMode)
                    const perf = PERFORMANCE_DATA[trigger.id]
                    return (
                      <div key={trigger.id} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>#{i + 1}</span>
                          <trigger.icon size={14} className={colors.text} />
                          <span className={`text-xs font-semibold ${text}`}>{trigger.name}</span>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="font-medium">Push:</span> {trigger.unitEmphasis.slice(0, 2).join(', ')}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="font-medium">Budget:</span> +{Math.round((trigger.budgetModifier - 1) * 100)}% above baseline
                          </p>
                          {perf && (
                            <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              <span className="font-medium">Est:</span> ~{perf.estimatedLeads} leads at ${perf.estimatedCPL} CPL
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => { setExpandedId(trigger.id); setSelectedCategory('all'); setViewMode('list') }}
                          className="text-[10px] text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1 mt-2"
                        >
                          View full playbook <ArrowRight size={10} />
                        </button>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Combined Unit Pricing Strategy */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <Tag size={13} /> Recommended Pricing Adjustments
              </h4>
              {(() => {
                const allRecs: Record<string, { adjustments: number[]; reasons: string[] }> = {}
                activeTriggers.forEach(t => {
                  const recs = PRICING_RECS[t.id] || []
                  recs.forEach(r => {
                    if (!allRecs[r.unitType]) allRecs[r.unitType] = { adjustments: [], reasons: [] }
                    allRecs[r.unitType].adjustments.push(r.adjustment)
                    allRecs[r.unitType].reasons.push(r.reason)
                  })
                })
                const combined = Object.entries(allRecs).map(([unitType, data]) => ({
                  unitType,
                  adjustment: Math.round(data.adjustments.reduce((a, b) => a + b, 0) / data.adjustments.length),
                  reasons: data.reasons,
                })).sort((a, b) => b.adjustment - a.adjustment)

                if (combined.length === 0) return <p className={`text-xs ${sub}`}>No pricing recommendations for active triggers.</p>

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {combined.map(rec => (
                      <div key={rec.unitType} className={`rounded-lg border p-3 text-center ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`} title={rec.reasons.join('; ')}>
                        <p className={`text-xs font-medium mb-1 ${sub}`}>{rec.unitType}</p>
                        <p className={`text-lg font-bold ${rec.adjustment > 0 ? 'text-emerald-600' : rec.adjustment < 0 ? 'text-blue-600' : sub}`}>
                          {rec.adjustment > 0 ? '+' : ''}{rec.adjustment}%
                        </p>
                        <p className={`text-[10px] mt-0.5 ${sub}`}>
                          {rec.adjustment > 0 ? 'raise rate' : rec.adjustment < 0 ? 'discount' : 'hold'}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Messaging Theme Summary */}
            <div>
              <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${text}`}>
                <MessageSquare size={13} /> Top Messaging Themes This Month
              </h4>
              <div className="flex flex-wrap gap-2">
                {[...new Set(activeTriggers.flatMap(t => t.messagingAngles))].slice(0, 8).map(angle => (
                  <div
                    key={angle}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>&ldquo;{angle}&rdquo;</span>
                    <button
                      onClick={() => copyToClipboard(angle, `theme-${angle}`)}
                      className={`p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
                      title="Copy to clipboard"
                    >
                      {copiedId === `theme-${angle}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className={sub} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Triggers Timeline */}
      {(() => {
        const upcoming = TRIGGERS
          .filter(t => {
            const status = getStatus(t)
            return status === 'scheduled'
          })
          .map(t => {
            const nextMonth = (currentMonth + 1) % 12
            const startsIn = t.months.includes(nextMonth) ? 1 : 2
            return { ...t, startsIn }
          })
          .sort((a, b) => a.startsIn - b.startsIn)

        if (upcoming.length === 0) return null

        return (
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
              <Clock size={16} className="text-blue-500" />
              Upcoming Triggers (Next 60 Days)
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcoming.map(trigger => {
                const colors = getColors(trigger.color, darkMode)
                return (
                  <div
                    key={trigger.id}
                    className={`flex-shrink-0 w-56 rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-700/30 border-slate-600 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                    onClick={() => { setExpandedId(trigger.id); setSelectedCategory('all'); setViewMode('list') }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                        <trigger.icon size={14} className={colors.text} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${text}`}>{trigger.name}</p>
                        <p className={`text-[10px] ${sub}`}>Starts in ~{trigger.startsIn * 30} days</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] ${sub}`}>
                        <span className="font-medium">Impact:</span> {trigger.demandImpact} · Budget +{Math.round((trigger.budgetModifier - 1) * 100)}%
                      </p>
                      <p className={`text-[10px] ${sub}`}>
                        <span className="font-medium">Prep:</span> Update creatives, review landing pages
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-medium">
                      <Calendar size={10} /> Prep now <ArrowRight size={10} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Trigger Stacking Analysis */}
      {(() => {
        const overlapping = activeTriggers.filter(t => t.demandImpact === 'high' || t.demandImpact === 'medium')
        if (overlapping.length < 2) return null

        const allUnits = [...new Set(overlapping.flatMap(t => t.unitEmphasis))]
        const unitOverlap = allUnits.filter(u => overlapping.filter(t => t.unitEmphasis.includes(u)).length > 1)

        return (
          <div className={`rounded-xl border p-5 ${card}`}>
            <h3 className={`text-sm font-semibold mb-1 flex items-center gap-2 ${text}`}>
              <Layers size={16} className="text-violet-500" />
              Trigger Stacking — {overlapping.length} Overlapping Playbooks
            </h3>
            <p className={`text-xs mb-4 ${sub}`}>
              Multiple demand triggers are active simultaneously. Coordinate messaging to avoid audience fatigue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${text}`}>Overlapping Unit Demand</h4>
                {unitOverlap.length > 0 ? (
                  <div className="space-y-2">
                    {unitOverlap.map(unit => {
                      const triggers = overlapping.filter(t => t.unitEmphasis.includes(unit))
                      return (
                        <div key={unit} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                          <span className={`font-medium ${text}`}>{unit}</span>
                          <div className="flex items-center gap-1">
                            {triggers.map(t => {
                              const c = getColors(t.color, darkMode)
                              return <span key={t.id} className={`px-1.5 py-0.5 rounded text-[10px] ${c.badge}`}>{t.name.split(' ')[0]}</span>
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={`text-xs ${sub}`}>No overlapping unit demand detected.</p>
                )}
              </div>
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${text}`}>Combined Budget Impact</h4>
                <div className={`rounded-lg px-4 py-3 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${sub}`}>Aggregate modifier</span>
                    <span className={`text-lg font-bold text-emerald-600`}>
                      +{Math.round(overlapping.reduce((sum, t) => sum + (t.budgetModifier - 1), 0) * 100 / overlapping.length)}%
                    </span>
                  </div>
                  <p className={`text-[10px] ${sub}`}>
                    Tip: When triggers stack, allocate budget proportionally to demand impact. High-impact triggers should get 60% of incremental budget.
                  </p>
                </div>
                <h4 className={`text-xs font-semibold mt-3 mb-2 ${text}`}>Recommended Strategy</h4>
                <ul className="space-y-1">
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Rotate ad creatives every 7 days to prevent fatigue
                  </li>
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Use audience exclusions to prevent overlap between trigger campaigns
                  </li>
                  <li className={`text-xs flex items-start gap-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <ArrowUpRight size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    Prioritize {overlapping.filter(t => t.demandImpact === 'high').map(t => t.name.split(' ')[0]).join(', ') || 'highest-impact'} triggers for landing page variations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={`rounded-xl border overflow-hidden ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <th className={`text-left text-xs font-medium px-4 py-3 ${sub} w-48`}>Trigger</th>
                  {MONTH_NAMES.map((m, i) => (
                    <th key={m} className={`text-center text-xs font-medium px-1 py-3 ${i === currentMonth ? 'text-emerald-600 font-bold' : sub}`}>
                      {m}
                    </th>
                  ))}
                  <th className={`text-center text-xs font-medium px-3 py-3 ${sub}`}>Budget</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(trigger => {
                  const colors = getColors(trigger.color, darkMode)
                  const status = getStatus(trigger)
                  return (
                    <tr
                      key={trigger.id}
                      className={`border-t ${darkMode ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'} cursor-pointer transition-colors`}
                      onClick={() => setExpandedId(expandedId === trigger.id ? null : trigger.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <trigger.icon size={14} className={colors.text} />
                          <span className={`text-sm font-medium ${text}`}>{trigger.name}</span>
                          {status === 'active' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                      {MONTH_NAMES.map((_, i) => (
                        <td key={i} className="px-1 py-2.5 text-center">
                          {trigger.months.includes(i) ? (
                            <div className={`mx-auto w-6 h-6 rounded ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                              {i === currentMonth && trigger.months.includes(i) ? (
                                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                              ) : (
                                <div className={`w-2 h-2 rounded-sm ${darkMode ? 'bg-slate-500' : 'bg-slate-300'}`} />
                              )}
                            </div>
                          ) : (
                            <div className="mx-auto w-6 h-6" />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-medium ${trigger.budgetModifier > 1 ? 'text-emerald-600' : sub}`}>
                          {trigger.budgetModifier > 1 ? `+${Math.round((trigger.budgetModifier - 1) * 100)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filtered.map(trigger => (
            <TriggerCard
              key={trigger.id}
              trigger={trigger}
              expanded={expandedId === trigger.id}
              darkMode={darkMode}
              status={getStatus(trigger)}
              overrides={overrides}
              copiedId={copiedId}
              expandedSections={expandedSections}
              currentMonth={currentMonth}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onToggleStatus={toggleStatus}
              onToggleSection={toggleSection}
              onCopy={copyToClipboard}
              onBudgetChange={handleBudgetChange}
            />
          ))}
        </div>
      )}

      {/* Monthly Demand Forecast */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
          <BarChart3 size={16} className="text-emerald-500" />
          12-Month Demand Trigger Density
        </h3>
        <div className="flex gap-1 items-end h-32">
          {MONTH_NAMES.map((m, i) => {
            const count = TRIGGERS.filter(t => t.months.includes(i)).length
            const maxCount = Math.max(...MONTH_NAMES.map((_, j) => TRIGGERS.filter(t => t.months.includes(j)).length))
            const height = (count / maxCount) * 100
            const isCurrent = i === currentMonth
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-600' : sub}`}>{count}</span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isCurrent
                      ? 'bg-emerald-500'
                      : darkMode ? 'bg-slate-600' : 'bg-slate-200'
                  }`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-600 font-bold' : sub}`}>{m}</span>
              </div>
            )
          })}
        </div>
        <p className={`text-xs mt-3 ${sub}`}>
          Number of demand triggers active per month. Current month highlighted. Use this to anticipate budget allocation needs.
        </p>
      </div>
    </div>
  )
}
