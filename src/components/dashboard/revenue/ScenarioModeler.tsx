import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { money, type UnitIntel, type IntelSummary, type StyleProps } from './RevenueTypes'

interface ScenarioModelerProps extends StyleProps {
  units: UnitIntel[]
  summary: IntelSummary & { total_discount_impact: number; discounted_tenants: number }
  scenVacancyFill: number
  scenRateIncrease: number
  scenEcriApply: number
  onScenVacancyFillChange: (val: number) => void
  onScenRateIncreaseChange: (val: number) => void
  onScenEcriApplyChange: (val: number) => void
  expanded: boolean
  onToggle: () => void
}

export default function ScenarioModeler({
  units, summary: s,
  scenVacancyFill, scenRateIncrease, scenEcriApply,
  onScenVacancyFillChange, onScenRateIncreaseChange, onScenEcriApplyChange,
  expanded, onToggle,
  darkMode, card, text, sub,
}: ScenarioModelerProps) {
  return (
    <div className={`border rounded-xl ${card}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={18} className="text-violet-600" />
          <div>
            <h3 className={`font-semibold ${text}`}>Revenue Scenario Modeler</h3>
            <p className={`text-xs ${sub}`}>What-if analysis \u2014 model revenue impact of actions</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
      </button>

      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-5`}>
          {(() => {
            const totalVacant = units.reduce((sum, u) => sum + u.vacant_count, 0)
            const avgStreetRate = units.reduce((sum, u) => sum + (u.street_rate || 0) * u.vacant_count, 0) / (totalVacant || 1)

            const vacancyRecovery = Math.round(totalVacant * (scenVacancyFill / 100)) * avgStreetRate
            const rateIncreaseGain = s.total_actual_revenue * (scenRateIncrease / 100)
            const ecriRecovery = s.ecri_monthly_lift * (scenEcriApply / 100)
            const totalScenarioGain = vacancyRecovery + rateIncreaseGain + ecriRecovery
            const projectedMRR = s.total_actual_revenue + totalScenarioGain

            return (
              <>
                {/* Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${text}`}>Fill Vacancies</label>
                      <span className="text-sm font-bold text-emerald-600">{scenVacancyFill}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5} value={scenVacancyFill}
                      onChange={e => onScenVacancyFillChange(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${sub}`}>{Math.round(totalVacant * scenVacancyFill / 100)} of {totalVacant} units</span>
                      <span className="text-xs text-emerald-600">+{money(vacancyRecovery)}/mo</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${text}`}>Rate Increase</label>
                      <span className="text-sm font-bold text-blue-600">{scenRateIncrease}%</span>
                    </div>
                    <input
                      type="range" min={0} max={15} step={1} value={scenRateIncrease}
                      onChange={e => onScenRateIncreaseChange(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${sub}`}>Across all occupied units</span>
                      <span className="text-xs text-blue-600">+{money(rateIncreaseGain)}/mo</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${text}`}>Apply ECRI</label>
                      <span className="text-sm font-bold text-violet-600">{scenEcriApply}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={10} value={scenEcriApply}
                      onChange={e => onScenEcriApplyChange(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${sub}`}>{Math.round(s.ecri_eligible_count * scenEcriApply / 100)} of {s.ecri_eligible_count} tenants</span>
                      <span className="text-xs text-violet-600">+{money(ecriRecovery)}/mo</span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className={`rounded-xl p-5 ${darkMode ? 'bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-800/30' : 'bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className={`text-xs font-medium ${sub}`}>Current MRR</p>
                      <p className={`text-xl font-bold ${text}`}>{money(s.total_actual_revenue)}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${sub}`}>Scenario Gain</p>
                      <p className="text-xl font-bold text-emerald-600">+{money(totalScenarioGain)}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${sub}`}>Projected MRR</p>
                      <p className="text-xl font-bold text-blue-600">{money(projectedMRR)}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${sub}`}>Annual Impact</p>
                      <p className="text-xl font-bold text-violet-600">+{money(totalScenarioGain * 12)}/yr</p>
                    </div>
                  </div>

                  {/* Visual comparison bar */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs ${sub}`}>Revenue Position</span>
                    </div>
                    <div className={`w-full h-8 rounded-lg overflow-hidden flex ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div
                        className="h-8 bg-emerald-500 flex items-center justify-center transition-all"
                        style={{ width: `${s.total_gross_potential > 0 ? (s.total_actual_revenue / s.total_gross_potential * 100) : 0}%` }}
                      >
                        <span className="text-xs font-bold text-white">Current</span>
                      </div>
                      {totalScenarioGain > 0 && (
                        <div
                          className="h-8 bg-blue-500 flex items-center justify-center transition-all"
                          style={{ width: `${s.total_gross_potential > 0 ? (totalScenarioGain / s.total_gross_potential * 100) : 0}%` }}
                        >
                          <span className="text-xs font-bold text-white">+Scenario</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${sub}`}>{money(0)}</span>
                      <span className={`text-xs ${sub}`}>Gross Potential: {money(s.total_gross_potential)}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
