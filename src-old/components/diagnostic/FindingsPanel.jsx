import { useState } from 'react'
import { ChevronDown, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CATEGORY_LABELS, getScoreColor } from '../../lib/scoreUtils'

function FlagCard({ flag, type, darkMode }) {
  const [expanded, setExpanded] = useState(false)

  const colorMap = {
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertCircle },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: AlertTriangle },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
  }
  const c = colorMap[type]
  const Icon = c.icon

  return (
    <div className={`rounded-lg border ${c.bg} ${c.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${c.text}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {flag.finding}
          </p>
          {flag.evidence && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Evidence: {flag.evidence}
            </p>
          )}
        </div>
        {(flag.impact || flag.recommendation) && (
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          } ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        )}
      </button>
      {expanded && (flag.impact || flag.recommendation) && (
        <div className={`px-3 pb-3 ml-7 space-y-2 border-t ${
          darkMode ? 'border-slate-700/50' : 'border-slate-200/50'
        } pt-2`}>
          {flag.impact && (
            <div>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>Impact</span>
              <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{flag.impact}</p>
            </div>
          )}
          {flag.recommendation && (
            <div>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>Recommendation</span>
              <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{flag.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FindingsPanel({ categories, expandedCategory, onChangeCategory, darkMode }) {
  if (!categories) return null

  const categoryKeys = Object.keys(categories)

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        Detailed Findings
      </h2>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categoryKeys.map(key => {
          const cat = categories[key]
          const isActive = expandedCategory === key
          const color = getScoreColor(cat?.score || 0)
          return (
            <button
              key={key}
              onClick={() => onChangeCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'text-white'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-300 bg-slate-700/50'
                    : 'text-slate-500 hover:text-slate-700 bg-slate-100'
              }`}
              style={isActive ? { backgroundColor: `${color}30`, color } : undefined}
            >
              {CATEGORY_LABELS[key] || key}
            </button>
          )
        })}
      </div>

      {/* Active category findings */}
      {expandedCategory && categories[expandedCategory] && (() => {
        const cat = categories[expandedCategory]
        return (
          <div>
            {/* Analysis */}
            <p className={`text-sm leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {cat.analysis}
            </p>

            {/* Benchmarks */}
            {cat.benchmarks && (Array.isArray(cat.benchmarks) ? cat.benchmarks : [cat.benchmarks]).filter(b => b?.metric).length > 0 && (
              <div className="mb-4">
                <h4 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>Benchmarks</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Array.isArray(cat.benchmarks) ? cat.benchmarks : [cat.benchmarks]).filter(b => b?.metric).map((b, i) => (
                    <div key={i} className={`p-2.5 rounded-lg text-xs ${
                      darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}>
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{b.metric}</span>
                      <div className="flex justify-between mt-1">
                        <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                          Yours: <strong>{b.facility_value}</strong>
                        </span>
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                          Target: {b.industry_target}
                        </span>
                      </div>
                      {b.gap && <span className="text-red-400 text-[10px]">Gap: {b.gap}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags */}
            {cat.red_flags?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
                  Red Flags ({cat.red_flags.length})
                </h4>
                <div className="space-y-2">
                  {cat.red_flags.map((f, i) => <FlagCard key={i} flag={f} type="red" darkMode={darkMode} />)}
                </div>
              </div>
            )}

            {/* Yellow flags */}
            {cat.yellow_flags?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
                  Yellow Flags ({cat.yellow_flags.length})
                </h4>
                <div className="space-y-2">
                  {cat.yellow_flags.map((f, i) => <FlagCard key={i} flag={f} type="yellow" darkMode={darkMode} />)}
                </div>
              </div>
            )}

            {/* Green flags */}
            {cat.green_flags?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
                  Green Flags ({cat.green_flags.length})
                </h4>
                <div className="space-y-2">
                  {cat.green_flags.map((f, i) => <FlagCard key={i} flag={f} type="green" darkMode={darkMode} />)}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
