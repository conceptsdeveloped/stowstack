import {
  Activity, Users, Target, TrendingUp, ShieldAlert,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { money, type HealthBreakdown, type StyleProps } from './RevenueTypes'

interface HealthScoreProps extends StyleProps {
  health: HealthBreakdown
  expanded: boolean
  onToggle: () => void
}

export default function HealthScore({ health, expanded, onToggle, darkMode, card, text, sub }: HealthScoreProps) {
  return (
    <div className={`border rounded-xl ${card}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <Activity size={18} className={health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'} />
          <div>
            <h3 className={`font-semibold ${text}`}>Facility Health Score</h3>
            <p className={`text-xs ${sub}`}>Composite score across 5 key dimensions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-black ${health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {health.overall}
          </div>
          {expanded ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </div>
      </button>

      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-5`}>
          {/* Big gauge */}
          <div className="flex justify-center">
            <div className="relative w-48 h-24 overflow-hidden">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                {/* Background arc */}
                <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeWidth="12" strokeLinecap="round" />
                {/* Score arc */}
                <path
                  d="M 20 95 A 80 80 0 0 1 180 95"
                  fill="none"
                  stroke={health.overall >= 75 ? '#10b981' : health.overall >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${health.overall * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className={`text-4xl font-black ${health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {health.overall}
                </span>
                <span className={`text-sm ml-1 mb-1 ${sub}`}>/100</span>
              </div>
            </div>
          </div>

          {/* Component breakdowns */}
          <div className="space-y-3">
            {[
              { label: 'Physical Occupancy', data: health.occupancy, detail: `${health.occupancy.value.toFixed(1)}% occupied`, icon: <Users size={14} /> },
              { label: 'Rate Capture', data: health.rate_capture, detail: `${health.rate_capture.value.toFixed(1)}% of potential`, icon: <Target size={14} /> },
              { label: 'Rate Optimization', data: health.rate_optimization, detail: `${health.rate_optimization.value} ECRI eligible`, icon: <TrendingUp size={14} /> },
              { label: 'Collections Health', data: health.delinquency, detail: money(health.delinquency.value) + ' outstanding', icon: <ShieldAlert size={14} /> },
              { label: 'Revenue Trend', data: health.trend, detail: health.trend.value != null ? `${health.trend.value > 0 ? '+' : ''}${health.trend.value}% MoM` : 'No history', icon: <TrendingUp size={14} /> },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={item.data.score >= 75 ? 'text-emerald-500' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}>{item.icon}</span>
                    <span className={`text-sm font-medium ${text}`}>{item.label}</span>
                    <span className={`text-xs ${sub}`}>({item.data.weight}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${sub}`}>{item.detail}</span>
                    <span className={`text-sm font-bold ${item.data.score >= 75 ? 'text-emerald-600' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {item.data.score}
                    </span>
                  </div>
                </div>
                <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all ${item.data.score >= 75 ? 'bg-emerald-500' : item.data.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${item.data.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
