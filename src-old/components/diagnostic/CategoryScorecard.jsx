import { useState, useEffect } from 'react'
import { getScoreColor, getSeverityBadgeClass, CATEGORY_LABELS } from '../../lib/scoreUtils'
import {
  TrendingUp, LayoutGrid, Users, Phone, Megaphone,
  Globe, DollarSign, Settings, Target, ChevronDown
} from 'lucide-react'

const ICON_MAP = {
  occupancy_momentum: TrendingUp,
  unit_mix_vacancy: LayoutGrid,
  lead_flow_conversion: Users,
  sales_followup: Phone,
  marketing_adspend: Megaphone,
  digital_presence: Globe,
  revenue_management: DollarSign,
  operations_staffing: Settings,
  competitive_position: Target,
}

export default function CategoryScorecard({ categoryKey, data, darkMode, onExpand }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const score = data?.score || 0
  const color = getScoreColor(score)
  const Icon = ICON_MAP[categoryKey] || Target
  const label = CATEGORY_LABELS[categoryKey] || categoryKey

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1200
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const redCount = data?.red_flags?.length || 0
  const yellowCount = data?.yellow_flags?.length || 0
  const greenCount = data?.green_flags?.length || 0

  return (
    <button
      onClick={onExpand}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {label}
            </h3>
            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSeverityBadgeClass(data?.severity)}`}>
              {data?.severity || 'unknown'}
            </span>
          </div>
        </div>
        <span className="text-2xl font-bold" style={{ color }}>{animatedScore}</span>
      </div>

      <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${
        darkMode ? 'text-slate-400' : 'text-slate-600'
      }`}>
        {data?.headline}
      </p>

      {/* Progress bar */}
      <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${animatedScore}%`, backgroundColor: color }}
        />
      </div>

      {/* Flag counts */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {redCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {redCount} red
            </span>
          )}
          {yellowCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {yellowCount} yellow
            </span>
          )}
          {greenCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {greenCount} green
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
      </div>
    </button>
  )
}
