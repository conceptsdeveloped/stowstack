import { useState, useEffect, useRef } from 'react'
import {
  EyeOff, Home, Link2, BarChart3, DollarSign, UserMinus,
  ArrowRight,
} from 'lucide-react'

const LEAKS = [
  {
    icon: EyeOff,
    title: 'No Online Visibility',
    cost: '~$2,000/mo',
    desc: '2,400 people search for storage in your area monthly. If you\'re not showing up in ads, your competitors are getting every one of them.',
    color: 'text-red-500',
    bg: 'border-red-500/30',
  },
  {
    icon: Home,
    title: 'Traffic Goes to Your Homepage',
    cost: '~$800/mo',
    desc: 'Generic homepages convert at 2%. Ad-specific landing pages convert at 8.7%. Same traffic, 4x the move-ins.',
    color: 'text-orange-500',
    bg: 'border-orange-500/30',
  },
  {
    icon: Link2,
    title: 'Off-Brand Rental Flow',
    cost: '~$600/mo',
    desc: 'The customer clicks your ad, then bounces to a generic storEDGE page that doesn\'t look like you. They leave.',
    color: 'text-amber-500',
    bg: 'border-amber-500/30',
  },
  {
    icon: BarChart3,
    title: 'Zero Attribution',
    cost: '~$1,200/mo',
    desc: 'You don\'t know which ad produced which move-in. So you can\'t kill the losers or scale the winners.',
    color: 'text-purple-500',
    bg: 'border-purple-500/30',
  },
  {
    icon: DollarSign,
    title: 'Underpriced Units',
    cost: '~$1,500/mo',
    desc: 'If your 10x10s are $95 and the market average is $110, that\'s $15/unit \u00d7 100 occupied units = real money.',
    color: 'text-blue-500',
    bg: 'border-blue-500/30',
  },
  {
    icon: UserMinus,
    title: 'No Follow-Up System',
    cost: '~$900/mo',
    desc: '70% of storage leads don\'t convert on first visit. Without automated follow-up, they go to your competitor.',
    color: 'text-rose-500',
    bg: 'border-rose-500/30',
  },
]

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

export default function RevenueLeakSection() {
  const { ref, visible } = useInView()
  return (
    <section id="revenue-leaks" className="py-20 md:py-28 relative overflow-hidden" style={{ background: '#020617' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.06), transparent 70%)' }} />

      <div ref={ref} className="relative max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className={`text-3xl sm:text-4xl font-bold text-white transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            6 Ways Your Facility <span className="text-red-400">Bleeds Revenue</span>
          </h2>
          <p className={`mt-4 text-lg text-slate-400 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Most operators lose $3,000–$8,000 per month and don't even know it. Here's where it goes.
          </p>
        </div>

        {/* Leak cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEAKS.map((leak, i) => {
            const Icon = leak.icon
            return (
              <div
                key={leak.title}
                className={`bg-white/[0.03] backdrop-blur-sm border-l-4 ${leak.bg} border border-white/5 rounded-xl p-6 transition-all duration-500 hover:bg-white/[0.06] ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${150 + i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon size={22} className={leak.color} />
                  <span className={`text-lg font-bold ${leak.color}`}>{leak.cost}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{leak.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{leak.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-12 text-center transition-all duration-700 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-2xl px-8 py-5">
            <p className="text-lg font-bold text-red-400">
              Add it up: <span className="text-2xl">$42,000–$96,000</span> per year.
            </p>
            <a href="#cta" className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Get Your Free Revenue Audit <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
