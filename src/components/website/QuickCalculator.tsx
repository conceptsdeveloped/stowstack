import { useState, useEffect, useRef } from 'react'
import { Calculator, ArrowRight } from 'lucide-react'

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

export default function QuickCalculator() {
  const { ref, visible } = useInView()
  const [totalUnits, setTotalUnits] = useState(150)
  const [occupancy, setOccupancy] = useState(78)

  const avgRate = 130
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100))
  const monthlyLoss = vacantUnits * avgRate
  const annualLoss = monthlyLoss * 12
  const stowstackCost = 999
  const projectedMoveIns = 8
  const projectedRecovery = projectedMoveIns * avgRate
  const roi = (stowstackCost + 1500) > 0 ? Math.round((projectedRecovery / (stowstackCost + 1500)) * 10) / 10 : 0

  return (
    <section className="py-16 md:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #022c22, #0f172a, #022c22)' }}>
      <div ref={ref} className="max-w-4xl mx-auto px-5">
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
              <Calculator size={14} /> Quick Revenue Calculator
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              See What You're Losing in 10 Seconds
            </h2>
          </div>

          {/* Calculator */}
          <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inputs */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">Total Units</label>
                    <span className="text-sm font-bold text-emerald-400">{totalUnits}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={600}
                    step={10}
                    value={totalUnits}
                    onChange={e => setTotalUnits(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">20</span>
                    <span className="text-xs text-slate-500">600</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">Current Occupancy</label>
                    <span className={`text-sm font-bold ${occupancy < 85 ? 'text-red-400' : 'text-emerald-400'}`}>{occupancy}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={99}
                    step={1}
                    value={occupancy}
                    onChange={e => setOccupancy(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">40%</span>
                    <span className="text-xs text-slate-500">99%</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-red-400 mb-1">You're Losing</p>
                  <p className="text-3xl font-black text-red-400">${monthlyLoss.toLocaleString()}<span className="text-lg font-medium">/mo</span></p>
                  <p className="text-xs text-slate-400 mt-1">{vacantUnits} vacant units × ${avgRate} avg rate = ${annualLoss.toLocaleString()}/yr</p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">StowStack Projects</p>
                  <p className="text-3xl font-black text-emerald-400">{projectedMoveIns} <span className="text-lg font-medium">move-ins/mo</span></p>
                  <p className="text-xs text-slate-400 mt-1">${projectedRecovery.toLocaleString()}/mo recovered · {roi}x ROI on Growth plan</p>
                </div>

                <a
                  href="#cta"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all text-sm"
                >
                  See the Full Breakdown <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
