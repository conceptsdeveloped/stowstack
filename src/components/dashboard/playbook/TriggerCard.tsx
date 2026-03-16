import {
  ChevronRight, ChevronDown, Play, Pause, Settings, BarChart3,
  DollarSign, Copy, Check, AlertTriangle,
  Target, MessageSquare, ArrowRight, Percent, Users, Eye, Zap, Calendar,
} from 'lucide-react'
import type { SeasonalTrigger, PlaybookStatus, PlaybookOverride } from './PlaybookData'
import { MONTH_NAMES, PRICING_RECS, COMPETITOR_INSIGHTS, PERFORMANCE_DATA, getColors } from './PlaybookData'

interface TriggerCardProps {
  trigger: SeasonalTrigger
  expanded: boolean
  darkMode: boolean
  status: PlaybookStatus
  overrides: Record<string, PlaybookOverride>
  copiedId: string | null
  expandedSections: Set<string>
  currentMonth: number
  onToggleExpand: (id: string) => void
  onToggleStatus: (id: string) => void
  onToggleSection: (section: string) => void
  onCopy: (content: string, id: string) => void
  onBudgetChange: (triggerId: string, newBudget: number) => void
}

export default function TriggerCard({
  trigger,
  expanded,
  darkMode,
  status,
  overrides,
  copiedId,
  expandedSections,
  currentMonth,
  onToggleExpand,
  onToggleStatus,
  onToggleSection,
  onCopy,
  onBudgetChange,
}: TriggerCardProps) {
  const colors = getColors(trigger.color, darkMode)
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`rounded-xl border transition-all ${card} ${status === 'active' ? `ring-1 ${darkMode ? 'ring-emerald-800' : 'ring-emerald-200'}` : ''}`}>
      {/* Collapsed Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleExpand(trigger.id)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
          <trigger.icon size={18} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${text}`}>{trigger.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {trigger.category}
            </span>
            {trigger.demandImpact === 'high' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                high demand
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${sub} line-clamp-1`}>
            {trigger.months.map(m => MONTH_NAMES[m]).join(', ')} · Budget {trigger.budgetModifier > 1 ? `+${Math.round((trigger.budgetModifier - 1) * 100)}%` : 'baseline'} · {trigger.unitEmphasis.slice(0, 3).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status badge */}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            status === 'active'
              ? darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : status === 'scheduled'
                ? darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'
                : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
            {status}
          </span>
          {/* Toggle */}
          <button
            onClick={e => { e.stopPropagation(); onToggleStatus(trigger.id) }}
            className={`p-1.5 rounded-lg transition-colors ${
              status === 'active'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title={status === 'active' ? 'Deactivate playbook' : 'Activate playbook'}
          >
            {status === 'active' ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {expanded ? <ChevronDown size={16} className={sub} /> : <ChevronRight size={16} className={sub} />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className={`border-t px-5 py-5 space-y-5 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          {/* Description */}
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{trigger.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Messaging Angles */}
            <div>
              <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                <MessageSquare size={13} /> Messaging Angles
              </h4>
              <ul className="space-y-1.5">
                {trigger.messagingAngles.map((angle, i) => (
                  <li key={i} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.bg} ${colors.border} border`} />
                    {angle}
                  </li>
                ))}
              </ul>
            </div>

            {/* Unit Emphasis */}
            <div>
              <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
                <Target size={13} /> Unit Emphasis
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trigger.unitEmphasis.map(unit => (
                  <span key={unit} className={`text-xs px-2.5 py-1 rounded-lg ${colors.badge}`}>
                    {unit}
                  </span>
                ))}
              </div>

              <h4 className={`text-xs font-semibold mt-4 mb-2 flex items-center gap-1.5 ${text}`}>
                <Settings size={13} /> Channels
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trigger.channels.map(ch => (
                  <span key={ch} className={`text-xs px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Estimates */}
          {PERFORMANCE_DATA[trigger.id] && (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleSection(`perf-${trigger.id}`)}
                className="flex items-center gap-1.5 cursor-pointer mb-2"
              >
                <BarChart3 size={13} className={text} />
                <h4 className={`text-xs font-semibold ${text}`}>Performance Estimates</h4>
                {expandedSections.has(`perf-${trigger.id}`) || expandedSections.has('performance')
                  ? <ChevronDown size={12} className={sub} />
                  : <ChevronRight size={12} className={sub} />}
              </div>
              {(expandedSections.has(`perf-${trigger.id}`) || expandedSections.has('performance')) && (() => {
                const perf = PERFORMANCE_DATA[trigger.id]
                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-bold ${text}`}>~{perf.estimatedLeads}</p>
                      <p className={`text-[10px] ${sub}`}>Est. Leads/mo</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-bold ${text}`}>${perf.estimatedCPL}</p>
                      <p className={`text-[10px] ${sub}`}>Est. CPL</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-bold ${text}`}>{perf.avgRentalDuration}</p>
                      <p className={`text-[10px] ${sub}`}>Avg Duration</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-bold text-emerald-600`}>{perf.conversionLift}</p>
                      <p className={`text-[10px] ${sub}`}>Conv. Lift</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={`text-lg font-bold text-emerald-600`}>{perf.historicalROAS}x</p>
                      <p className={`text-[10px] ${sub}`}>Hist. ROAS</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Pricing Recommendations */}
          {PRICING_RECS[trigger.id] && (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleSection(`price-${trigger.id}`)}
                className="flex items-center gap-1.5 cursor-pointer mb-2"
              >
                <Percent size={13} className={text} />
                <h4 className={`text-xs font-semibold ${text}`}>Pricing Recommendations</h4>
                {expandedSections.has(`price-${trigger.id}`) || expandedSections.has('pricing')
                  ? <ChevronDown size={12} className={sub} />
                  : <ChevronRight size={12} className={sub} />}
              </div>
              {(expandedSections.has(`price-${trigger.id}`) || expandedSections.has('pricing')) && (
                <div className="space-y-1.5">
                  {PRICING_RECS[trigger.id].map(rec => (
                    <div key={rec.unitType} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${text}`}>{rec.unitType}</span>
                        <span className={`${sub}`}>&mdash;</span>
                        <span className={sub}>{rec.reason}</span>
                      </div>
                      <span className={`font-bold ${rec.adjustment > 0 ? 'text-emerald-600' : rec.adjustment < 0 ? 'text-blue-600' : sub}`}>
                        {rec.adjustment > 0 ? '+' : ''}{rec.adjustment}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Competitor Intelligence */}
          {COMPETITOR_INSIGHTS[trigger.id] && (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleSection(`comp-${trigger.id}`)}
                className="flex items-center gap-1.5 cursor-pointer mb-2"
              >
                <Eye size={13} className={text} />
                <h4 className={`text-xs font-semibold ${text}`}>Competitive Intelligence</h4>
                {expandedSections.has(`comp-${trigger.id}`) || expandedSections.has('competitors')
                  ? <ChevronDown size={12} className={sub} />
                  : <ChevronRight size={12} className={sub} />}
              </div>
              {(expandedSections.has(`comp-${trigger.id}`) || expandedSections.has('competitors')) && (
                <div className="space-y-2">
                  {COMPETITOR_INSIGHTS[trigger.id].map((insight, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className={`text-xs font-medium ${text}`}>{insight.action}</p>
                          <p className={`text-[10px] ${sub} mb-1`}>Timing: {insight.timing}</p>
                          <div className="flex items-start gap-1.5">
                            <ArrowRight size={10} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{insight.response}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ad Copy Suggestions — with copy button */}
          <div>
            <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
              <Zap size={13} /> Ready-to-Use Ad Copy
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trigger.adCopy.map((ad, i) => {
                const copyKey = `${trigger.id}-ad-${i}`
                return (
                  <div key={i} className={`rounded-lg border p-3 relative group ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-sm font-semibold mb-1 ${text}`}>{ad.headline}</p>
                    <p className={`text-xs ${sub}`}>{ad.body}</p>
                    <button
                      onClick={() => onCopy(`${ad.headline}\n${ad.body}`, copyKey)}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-white hover:bg-slate-100'} shadow-sm`}
                      title="Copy ad copy"
                    >
                      {copiedId === copyKey ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className={sub} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Audience Targeting */}
          <div>
            <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
              <Users size={13} /> Audience Targeting
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {trigger.audienceTargeting.map(aud => (
                <span key={aud} className={`text-xs px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {aud}
                </span>
              ))}
            </div>
          </div>

          {/* Budget Controls */}
          <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-xs font-semibold flex items-center gap-1.5 ${text}`}>
                  <DollarSign size={13} /> Budget Modifier
                </h4>
                <p className={`text-xs mt-0.5 ${sub}`}>
                  Recommended: +{Math.round((trigger.budgetModifier - 1) * 100)}% above baseline
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const current = overrides[trigger.id]?.budgetOverride ?? trigger.budgetModifier
                    onBudgetChange(trigger.id, Math.max(0.5, current - 0.05))
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  −
                </button>
                <span className={`text-lg font-bold min-w-[60px] text-center ${text}`}>
                  {overrides[trigger.id]?.budgetOverride
                    ? `${overrides[trigger.id].budgetOverride! > 1 ? '+' : ''}${Math.round((overrides[trigger.id].budgetOverride! - 1) * 100)}%`
                    : `+${Math.round((trigger.budgetModifier - 1) * 100)}%`
                  }
                </span>
                <button
                  onClick={() => {
                    const current = overrides[trigger.id]?.budgetOverride ?? trigger.budgetModifier
                    onBudgetChange(trigger.id, Math.min(3, current + 0.05))
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${darkMode ? 'bg-slate-600 text-slate-200 hover:bg-slate-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Active Months Visual */}
          <div>
            <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${text}`}>
              <Calendar size={13} /> Active Months
            </h4>
            <div className="flex gap-1">
              {MONTH_NAMES.map((m, i) => (
                <div
                  key={m}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-medium transition-colors ${
                    trigger.months.includes(i)
                      ? i === currentMonth
                        ? 'bg-emerald-600 text-white'
                        : `${colors.bg} ${colors.text} ${colors.border} border`
                      : darkMode ? 'bg-slate-700/30 text-slate-500' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
