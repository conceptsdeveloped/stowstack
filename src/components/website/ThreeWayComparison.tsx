import { useState, useEffect, useRef } from 'react'
import { Check, X, Minus } from 'lucide-react'

const ROWS = [
  {
    label: 'Landing Pages',
    diy: 'Your homepage (2% conv)',
    agency: 'Generic template (3-4% conv)',
    stowstack: 'Ad-specific pages (8.7% conv)',
  },
  {
    label: 'Rental Flow',
    diy: 'Customer bounces to storEDGE',
    agency: 'Same bounce, different URL',
    stowstack: 'Embedded on your branded page',
  },
  {
    label: 'Attribution',
    diy: '"We got some calls this month"',
    agency: 'Clicks and impressions report',
    stowstack: 'Cost per move-in by specific ad',
  },
  {
    label: 'Ad Channels',
    diy: 'Boosted Facebook post',
    agency: 'Google or Facebook, not both',
    stowstack: 'Meta + Google PPC + Retargeting',
  },
  {
    label: 'A/B Testing',
    diy: 'None',
    agency: 'Occasionally tests ad copy',
    stowstack: 'Tests pages, offers, creative on revenue',
  },
  {
    label: 'Reporting',
    diy: 'Nothing',
    agency: 'Monthly PDF of vanity metrics',
    stowstack: 'Real-time: leads \u2192 reservations \u2192 move-ins',
  },
  {
    label: 'Who Builds It',
    diy: 'You, at 11pm after gate calls',
    agency: 'Agency that also does dentists',
    stowstack: 'An operator who built this for his own facilities',
  },
  {
    label: 'Time to Results',
    diy: 'Months (if ever)',
    agency: '30-60 days (maybe)',
    stowstack: '7 days to first leads',
  },
  {
    label: 'Follow-Up',
    diy: 'You forgot to call them back',
    agency: 'Not their job',
    stowstack: 'Automated SMS + email nurture sequences',
  },
  {
    label: 'Cost',
    diy: 'Your time + wasted ad spend',
    agency: '$1,500-5,000/mo + ad spend',
    stowstack: '$499-1,499/mo + ad spend',
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

export default function ThreeWayComparison() {
  const { ref, visible } = useInView()
  return (
    <section className="py-20 md:py-28 bg-white">
      <div ref={ref} className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className={`max-w-3xl mx-auto text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Doing It Yourself vs. Hiring an Agency vs.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Using a Demand Engine</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Three approaches. Only one fills units and proves it.
          </p>
        </div>

        {/* Column headers */}
        <div className={`hidden md:grid grid-cols-4 gap-3 mb-4 px-2 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div />
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center"><Minus size={12} className="text-slate-400" /></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Do It Yourself</span>
          </div>
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center"><X size={12} className="text-orange-500" /></div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Ad Agency</span>
          </div>
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><Check size={12} className="text-emerald-600" /></div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">StowStack</span>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${200 + i * 50}ms` }}
            >
              {/* Label */}
              <div className="flex items-center px-4 py-2">
                <span className="text-sm font-semibold text-slate-700">{row.label}</span>
              </div>

              {/* DIY */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">DIY</span>
                <p className="text-sm text-slate-500">{row.diy}</p>
              </div>

              {/* Agency */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-xl px-4 py-3">
                <span className="md:hidden text-[10px] font-bold text-orange-400 uppercase tracking-wider">Agency</span>
                <p className="text-sm text-orange-700">{row.agency}</p>
              </div>

              {/* StowStack */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="md:hidden text-[10px] font-bold text-emerald-500 uppercase tracking-wider">StowStack</span>
                <p className="text-sm text-emerald-800 font-medium">{row.stowstack}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
