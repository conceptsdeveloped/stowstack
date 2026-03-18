import { useState } from 'react'
import { TrendingUp, Zap, Target, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { type RevenueLossData, money } from './RevenueLossTypes'
import AnimatedCounter from './AnimatedCounter'

interface RecoveryProjectionProps {
  data: RevenueLossData
  darkMode: boolean
}

export default function RecoveryProjection({ data, darkMode }: RecoveryProjectionProps) {
  const [sliderUnits, setSliderUnits] = useState(Math.min(5, data.snapshot.vacantUnits))
  const [showTimeline, setShowTimeline] = useState(false)
  const [showComparison, setShowComparison] = useState(true)

  const { recovery, snapshot, recoveryTiers } = data
  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  const sliderRecoveryMonthly = sliderUnits * snapshot.avgRate
  const sliderRecoveryAnnual = sliderRecoveryMonthly * 12

  return (
    <div className="space-y-4">

      {/* ── What-If Recovery Slider ── */}
      <div className={`border rounded-xl p-5 ${card}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Zap size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className={`font-bold ${text}`}>What If You Filled More Units?</h3>
            <p className={`text-xs ${sub}`}>Drag the slider to see revenue recovery potential</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-sm font-medium ${text}`}>
                Fill <span className="text-emerald-500 font-bold">{sliderUnits}</span> more {sliderUnits === 1 ? 'unit' : 'units'}
              </label>
              <span className="text-sm font-bold text-emerald-500">
                +{money(sliderRecoveryMonthly)}/mo
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={snapshot.vacantUnits}
              step={1}
              value={sliderUnits}
              onChange={e => setSliderUnits(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${sub}`}>0 units</span>
              <span className={`text-xs ${sub}`}>{snapshot.vacantUnits} units (all vacant)</span>
            </div>
          </div>

          {/* Recovery result */}
          <div className={`rounded-xl p-4 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className={`text-xs font-medium ${sub}`}>Monthly Recovery</p>
                <p className="text-xl font-bold text-emerald-500">+{money(sliderRecoveryMonthly)}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${sub}`}>Annual Recovery</p>
                <p className="text-xl font-bold text-emerald-500">+{money(sliderRecoveryAnnual)}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${sub}`}>New Occupancy</p>
                <p className={`text-xl font-bold ${text}`}>
                  {snapshot.totalUnits > 0
                    ? Math.round(((snapshot.occupiedUnits + sliderUnits) / snapshot.totalUnits) * 1000) / 10
                    : 0}%
                </p>
              </div>
            </div>

            {/* Fill bar */}
            <div className="mt-4">
              <div className={`w-full h-6 rounded-lg overflow-hidden flex ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="h-6 bg-emerald-600 flex items-center justify-center transition-all duration-300"
                  style={{ width: `${snapshot.totalUnits > 0 ? (snapshot.occupiedUnits / snapshot.totalUnits * 100) : 0}%` }}
                >
                  <span className="text-[10px] font-bold text-white">Current</span>
                </div>
                {sliderUnits > 0 && (
                  <div
                    className="h-6 bg-emerald-400 flex items-center justify-center transition-all duration-300"
                    style={{ width: `${snapshot.totalUnits > 0 ? (sliderUnits / snapshot.totalUnits * 100) : 0}%` }}
                  >
                    <span className="text-[10px] font-bold text-emerald-900">+{sliderUnits}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${sub}`}>{snapshot.occupiedUnits} occupied</span>
                <span className={`text-xs ${sub}`}>{snapshot.totalUnits} total</span>
              </div>
            </div>
          </div>

          {/* Quick recovery tiers */}
          {recoveryTiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recoveryTiers.map(tier => (
                <button
                  key={tier.unitsFilled}
                  onClick={() => setSliderUnits(tier.unitsFilled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    sliderUnits === tier.unitsFilled
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : darkMode
                        ? 'border-slate-700 text-slate-300 hover:border-emerald-500/50'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  +{tier.unitsFilled} units = {money(tier.monthlyRecovery)}/mo
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Breakeven Callout ── */}
      <div className={`border rounded-xl p-5 ${darkMode ? 'bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border-emerald-800/30' : 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200'}`}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Target size={20} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${text}`}>StowStack Pays For Itself Fast</h3>
            <p className={`text-sm mt-1 ${sub}`}>{recovery.breakevenMessage}</p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className={`text-xs ${sub}`}>StowStack Fee</p>
                <p className={`text-sm font-bold ${text}`}>{money(recovery.stowstackMonthlyFee)}/mo</p>
              </div>
              <div>
                <p className={`text-xs ${sub}`}>Recommended Ad Spend</p>
                <p className={`text-sm font-bold ${text}`}>{money(recovery.recommendedAdSpend)}/mo</p>
              </div>
              <div>
                <p className={`text-xs ${sub}`}>Projected Move-Ins</p>
                <p className="text-sm font-bold text-emerald-500">{recovery.projectedMoveInsPerMonth}/mo</p>
              </div>
              <div>
                <p className={`text-xs ${sub}`}>Projected ROAS</p>
                <p className="text-sm font-bold text-emerald-500">{recovery.projectedROAS}x</p>
              </div>
            </div>

            {/* Breakeven visual */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${sub}`}>Breakeven progress</span>
              </div>
              <div className={`w-full h-4 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(100, (recovery.projectedMoveInsPerMonth / Math.max(recovery.breakevenUnits, 0.1)) * 100)}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{recovery.projectedMoveInsPerMonth} move-ins</span>
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${sub}`}>0</span>
                <span className={`text-xs text-emerald-500 font-medium`}>Need {recovery.breakevenUnits} to break even</span>
                <span className={`text-xs ${sub}`}>{recovery.projectedMoveInsPerMonth} projected</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Clock size={14} className="text-emerald-500" />
              <span className={`text-xs ${sub}`}>First leads in {recovery.timeToFirstLeads} · First move-in in {recovery.timeToFirstMoveIn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side: Inaction vs Action ── */}
      <div className={`border rounded-xl overflow-hidden ${card}`}>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${text}`}>12-Month Projection: Without vs. With StowStack</h3>
              <p className={`text-xs ${sub}`}>See the compounding difference over a year</p>
            </div>
          </div>
          {showComparison ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </button>

        {showComparison && (
          <div className={`border-t p-4 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Without StowStack */}
              <div className={`rounded-xl p-4 border ${darkMode ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
                <h4 className="font-bold text-red-500 text-sm mb-3">Without StowStack</h4>
                <div className="space-y-2">
                  {[2, 5, 8, 11].map(i => {
                    const m = data.inactionTimeline[i]
                    if (!m) return null
                    return (
                      <div key={i} className="flex justify-between items-center">
                        <span className={`text-xs ${sub}`}>Month {m.month}</span>
                        <div className="text-right">
                          <span className="text-xs text-red-500 font-medium">{m.vacantUnits} vacant</span>
                          <span className={`text-xs ${sub} ml-2`}>cumulative: -{money(m.cumulativeLoss)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-red-800/30' : 'border-red-200'} text-center`}>
                  <p className={`text-xs ${sub}`}>12-Month Total Loss</p>
                  <p className="text-2xl font-bold text-red-500">
                    -<AnimatedCounter target={data.inactionTimeline[11]?.cumulativeLoss || data.totalAnnualLoss} duration={1500} startDelay={500} />
                  </p>
                </div>
              </div>

              {/* With StowStack */}
              <div className={`rounded-xl p-4 border ${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <h4 className="font-bold text-emerald-500 text-sm mb-3">With StowStack</h4>
                <div className="space-y-2">
                  {[2, 5, 8, 11].map(i => {
                    const m = data.actionTimeline[i]
                    if (!m) return null
                    return (
                      <div key={i} className="flex justify-between items-center">
                        <span className={`text-xs ${sub}`}>Month {m.month}</span>
                        <div className="text-right">
                          <span className="text-xs text-emerald-500 font-medium">+{m.unitsFilled} filled</span>
                          <span className={`text-xs ${sub} ml-2`}>revenue: {money(m.monthlyRevenue)}/mo</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-emerald-800/30' : 'border-emerald-200'} text-center`}>
                  <p className={`text-xs ${sub}`}>12-Month Projected Recovery</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    +<AnimatedCounter target={recovery.projectedAnnualRecovery} duration={1500} startDelay={500} />
                  </p>
                </div>
              </div>
            </div>

            {/* Net difference */}
            <div className={`mt-4 rounded-xl p-4 text-center ${darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
              <p className={`text-xs ${sub}`}>12-Month Net Difference</p>
              <p className="text-3xl font-bold text-blue-500">
                +<AnimatedCounter
                  target={recovery.projectedAnnualRecovery + (data.inactionTimeline[11]?.cumulativeLoss || data.totalAnnualLoss)}
                  duration={1800}
                  startDelay={800}
                />
              </p>
              <p className={`text-xs ${sub} mt-1`}>in recovered + prevented revenue loss</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Inaction Timeline (detailed) ── */}
      <div className={`border rounded-xl overflow-hidden ${card}`}>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <DollarSign size={18} className="text-red-500" />
            <div>
              <h3 className={`font-bold ${text}`}>Month-by-Month Inaction Cost</h3>
              <p className={`text-xs ${sub}`}>What happens when you do nothing for 12 months</p>
            </div>
          </div>
          {showTimeline ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
        </button>

        {showTimeline && (
          <div className={`border-t p-4 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
            <div className="space-y-1">
              {data.inactionTimeline.map((m, i) => {
                const maxLoss = data.inactionTimeline[11]?.cumulativeLoss || 1
                const pct = (m.cumulativeLoss || 0) / maxLoss * 100
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-xs w-16 text-right ${sub}`}>Month {m.month}</span>
                    <div className={`flex-1 h-5 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'} overflow-hidden`}>
                      <div
                        className="h-5 rounded bg-gradient-to-r from-red-500/60 to-red-500 flex items-center px-2 transition-all"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">
                          {money(m.cumulativeLoss)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs w-20 ${sub}`}>{m.vacantUnits} vacant</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
