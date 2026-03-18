import { useState, useEffect, useRef } from 'react'
import { ArrowRight, TrendingDown, AlertTriangle } from 'lucide-react'

const MONTHS = [
  {
    month: 1,
    title: '3 vacant units',
    detail: '$450/mo walking out the door',
    loss: 450,
    cumulative: 450,
    severity: 'bg-red-400/60',
  },
  {
    month: 2,
    title: 'Competitor launches Google Ads',
    detail: 'They\'re now capturing search demand you\'re invisible to',
    loss: 600,
    cumulative: 1050,
    severity: 'bg-red-400/70',
  },
  {
    month: 3,
    title: '5 move-outs, 2 move-ins',
    detail: 'Net loss of 3 units \u2014 now 6 vacant',
    loss: 900,
    cumulative: 1950,
    severity: 'bg-red-500/70',
  },
  {
    month: 4,
    title: 'Summer moving season starts',
    detail: 'Your competitors fill up. You don\'t.',
    loss: 1200,
    cumulative: 3150,
    severity: 'bg-red-500/80',
  },
  {
    month: 5,
    title: '8 vacant units',
    detail: '$1,200/mo lost \u2014 competitor raises rates (you can\'t)',
    loss: 1200,
    cumulative: 4350,
    severity: 'bg-red-500/90',
  },
  {
    month: 6,
    title: 'Occupancy below 80%',
    detail: 'Revenue spiral \u2014 cutting rates to attract tenants',
    loss: 1500,
    cumulative: 5850,
    severity: 'bg-red-600',
  },
]

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

export default function InactionTimeline() {
  const { ref, visible } = useInView()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, #0f172a, #1e0606, #0f172a)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at bottom, rgba(239,68,68,0.08), transparent 70%)' }} />

      <div ref={ref} className="relative max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className={`max-w-3xl mx-auto text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6">
            <AlertTriangle size={14} /> The Cost of Doing Nothing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Every Month You Wait Costs More Than StowStack
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Here's what happens over 6 months when you don't have a demand engine.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/20 via-red-500/40 to-red-500/60 hidden md:block" />

          <div className="space-y-4">
            {MONTHS.map((m, i) => (
              <div
                key={m.month}
                className={`flex items-start gap-4 md:gap-6 transition-all duration-600 ${
                  visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: `${200 + i * 120}ms` }}
              >
                {/* Month circle */}
                <div className={`w-16 h-16 rounded-full ${m.severity} flex items-center justify-center flex-shrink-0 border-2 border-red-500/30`}>
                  <div className="text-center">
                    <p className="text-[10px] text-red-100 uppercase leading-none">Month</p>
                    <p className="text-lg font-bold text-white leading-none">{m.month}</p>
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-red-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{m.title}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{m.detail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-red-400 font-medium">-${m.loss.toLocaleString()}/mo</p>
                      <p className="text-xs text-slate-500">cumulative: -${m.cumulative.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Loss bar */}
                  <div className="mt-3 w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${m.severity} transition-all duration-1000`}
                      style={{ width: visible ? `${(m.cumulative / 5850) * 100}%` : '0%', transitionDelay: `${500 + i * 120}ms` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom comparison */}
        <div className={`mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <TrendingDown size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-xs uppercase tracking-wider text-red-400 mb-1">6-Month Inaction Cost</p>
            <p className="text-3xl font-black text-red-400">-$5,850</p>
            <p className="text-sm text-slate-400 mt-1">And it only gets worse from here</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
            <TrendingDown size={24} className="text-emerald-400 mx-auto mb-2 rotate-180" />
            <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">6 Months with StowStack</p>
            <p className="text-3xl font-black text-emerald-400">+$43,200</p>
            <p className="text-sm text-slate-400 mt-1">Projected recovered revenue (Growth plan)</p>
          </div>
        </div>

        {/* CTA */}
        <div className={`mt-8 text-center transition-all duration-700 delay-1200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-lg text-slate-300 font-medium mb-4">The math isn't complicated. Inaction is the most expensive option.</p>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-600/25"
          >
            Get Your Free Revenue Audit <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
