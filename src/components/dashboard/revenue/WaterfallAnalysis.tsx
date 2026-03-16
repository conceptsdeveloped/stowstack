import { Droplets, ChevronDown, ChevronUp } from 'lucide-react'
import { money, type Waterfall, type StyleProps } from './RevenueTypes'

interface WaterfallAnalysisProps extends StyleProps {
  waterfall: Waterfall
  expanded: boolean
  onToggle: () => void
}

export default function WaterfallAnalysis({ waterfall, expanded, onToggle, darkMode, card, text, sub }: WaterfallAnalysisProps) {
  return (
    <div className={`border rounded-xl ${card}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <Droplets size={18} className="text-cyan-600" />
          <div>
            <h3 className={`font-semibold ${text}`}>Revenue Waterfall</h3>
            <p className={`text-xs ${sub}`}>Where your potential revenue goes</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
      </button>

      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          {(() => {
            const maxVal = waterfall.gross_potential || 1
            const steps = [
              { label: 'Gross Potential', value: waterfall.gross_potential, color: 'bg-blue-500', type: 'total' as const },
              { label: 'Vacancy Loss', value: -waterfall.vacancy_loss, color: 'bg-red-400', type: 'loss' as const },
              { label: 'Rate Gap (Below Street)', value: -waterfall.rate_gap_loss, color: 'bg-amber-400', type: 'loss' as const },
              { label: 'Delinquency', value: -waterfall.delinquency_loss, color: 'bg-orange-400', type: 'loss' as const },
              { label: 'Actual Collected', value: waterfall.actual_collected, color: 'bg-emerald-500', type: 'total' as const },
            ]

            let running = waterfall.gross_potential
            return (
              <div className="space-y-3">
                {steps.map((step, i) => {
                  const barWidth = Math.abs(step.value) / maxVal * 100
                  const isLoss = step.type === 'loss'
                  const offset = isLoss ? ((running + step.value) / maxVal * 100) : 0
                  if (isLoss) running += step.value

                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${text}`}>{step.label}</span>
                        <span className={`text-sm font-bold ${isLoss ? 'text-red-500' : i === steps.length - 1 ? 'text-emerald-600' : text}`}>
                          {isLoss ? '-' : ''}{money(Math.abs(step.value))}
                        </span>
                      </div>
                      <div className={`w-full h-6 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} relative`}>
                        <div
                          className={`h-6 rounded ${step.color} transition-all`}
                          style={{
                            width: `${barWidth}%`,
                            marginLeft: isLoss ? `${offset}%` : '0',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                {/* Leakage summary */}
                <div className={`rounded-lg p-3 mt-2 ${darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className={`text-xs ${sub}`}>Total Leakage</p>
                      <p className="text-lg font-bold text-red-500">
                        {money(waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${sub}`}>Leakage Rate</p>
                      <p className={`text-lg font-bold ${text}`}>
                        {waterfall.gross_potential > 0
                          ? ((waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss) / waterfall.gross_potential * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${sub}`}>Collection Rate</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {waterfall.gross_potential > 0 ? (waterfall.actual_collected / waterfall.gross_potential * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
