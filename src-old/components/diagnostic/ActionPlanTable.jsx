import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { getImpactBadgeClass, getEffortBadgeClass } from '../../lib/scoreUtils'

function TimelineBadge({ timeline }) {
  const cls = {
    immediate: 'bg-red-500/20 text-red-300',
    '30_days': 'bg-amber-500/20 text-amber-300',
    '90_days': 'bg-blue-500/20 text-blue-300',
  }
  const labels = { immediate: 'Now', '30_days': '30 Days', '90_days': '90 Days' }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${cls[timeline] || 'bg-slate-500/20 text-slate-300'}`}>
      {labels[timeline] || timeline}
    </span>
  )
}

export default function ActionPlanTable({ actions, darkMode }) {
  const [sortKey, setSortKey] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')
  const [expandedRow, setExpandedRow] = useState(null)

  if (!actions?.length) return null

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const impactOrder = { high: 3, medium: 2, low: 1 }
  const effortOrder = { low: 3, medium: 2, high: 1 }
  const timelineOrder = { immediate: 3, '30_days': 2, '90_days': 1 }

  const sorted = [...actions].sort((a, b) => {
    let aVal, bVal
    switch (sortKey) {
      case 'rank': aVal = a.rank; bVal = b.rank; break
      case 'impact': aVal = impactOrder[a.impact] || 0; bVal = impactOrder[b.impact] || 0; break
      case 'effort': aVal = effortOrder[a.effort] || 0; bVal = effortOrder[b.effort] || 0; break
      case 'timeline': aVal = timelineOrder[a.timeline] || 0; bVal = timelineOrder[b.timeline] || 0; break
      default: aVal = a.rank; bVal = b.rank
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <div className="p-6 pb-0">
        <h2 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Priority Action Plan
        </h2>
        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Top recommendations ranked by impact — click headers to sort
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={darkMode ? 'border-b border-slate-700/50' : 'border-b border-slate-200'}>
              {[
                { key: 'rank', label: '#' },
                { key: 'action', label: 'Action' },
                { key: 'impact', label: 'Impact' },
                { key: 'effort', label: 'Effort' },
                { key: 'timeline', label: 'Timeline' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${
                    darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && <ArrowUpDown className="w-3 h-3" />}
                  </span>
                </th>
              ))}
              <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Est. Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((action, i) => (
              <tr
                key={i}
                onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                className={`cursor-pointer transition-colors ${
                  darkMode
                    ? 'hover:bg-slate-700/30 border-b border-slate-700/30'
                    : 'hover:bg-slate-50 border-b border-slate-100'
                }`}
              >
                <td className={`px-4 py-3 text-sm font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {action.rank}
                </td>
                <td className="px-4 py-3">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {action.action}
                  </p>
                  {action.category && (
                    <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {action.category}
                    </span>
                  )}
                  {expandedRow === i && action.details && (
                    <p className={`text-xs mt-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {action.details}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getImpactBadgeClass(action.impact)}`}>
                    {action.impact}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getEffortBadgeClass(action.effort)}`}>
                    {action.effort}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <TimelineBadge timeline={action.timeline} />
                </td>
                <td className={`px-4 py-3 text-right text-sm font-medium ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  {action.estimated_monthly_revenue_impact || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
