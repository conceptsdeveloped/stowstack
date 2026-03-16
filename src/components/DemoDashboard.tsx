import { useState, useEffect, useRef } from 'react'
import {
  Building2, TrendingUp, DollarSign, Users,
  ArrowLeft, Target, Zap, ArrowUpRight,
  MapPin, Calendar, Play, Pause,
  ChevronRight, Eye, Megaphone
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

/* ═══════════════════════════════════════════════════════ */
/*  SIMULATED DATA                                         */
/* ═══════════════════════════════════════════════════════ */

const FACILITY = {
  name: 'Lakeview Self Storage',
  location: 'Grand Rapids, MI',
  totalUnits: 214,
  startingOccupancy: 64,
  unitMix: [
    { type: '5×5 Climate', count: 32, rate: 65, vacancy: 8 },
    { type: '5×10 Climate', count: 40, rate: 95, vacancy: 12 },
    { type: '10×10 Standard', count: 52, rate: 120, vacancy: 14 },
    { type: '10×15 Drive-Up', count: 36, rate: 165, vacancy: 9 },
    { type: '10×20 Drive-Up', count: 30, rate: 195, vacancy: 7 },
    { type: '10×30 Vehicle', count: 24, rate: 275, vacancy: 5 },
  ],
}

const MONTHS = [
  {
    month: 'Oct 2025', spend: 1800, leads: 42, moveIns: 8,
    cpl: 42.86, costPerMoveIn: 225, roas: 2.1, occupancy: 68,
    topAudience: 'Lookalike 1% – Move-In Converters', topCreative: 'Video: "Your Stuff Deserves Better"',
  },
  {
    month: 'Nov 2025', spend: 2100, leads: 58, moveIns: 12,
    cpl: 36.21, costPerMoveIn: 175, roas: 2.8, occupancy: 73,
    topAudience: 'Life Event – Recently Moved', topCreative: 'Carousel: Unit Size Guide',
  },
  {
    month: 'Dec 2025', spend: 2100, leads: 51, moveIns: 10,
    cpl: 41.18, costPerMoveIn: 210, roas: 2.4, occupancy: 76,
    topAudience: 'Retargeting – 14-Day Website Visitors', topCreative: 'Video: Holiday Declutter',
  },
  {
    month: 'Jan 2026', spend: 2400, leads: 67, moveIns: 15,
    cpl: 35.82, costPerMoveIn: 160, roas: 3.1, occupancy: 80,
    topAudience: 'Lookalike 3% – Phone Call Converters', topCreative: 'Static: "$1 First Month" Promo',
  },
  {
    month: 'Feb 2026', spend: 2400, leads: 74, moveIns: 18,
    cpl: 32.43, costPerMoveIn: 133.33, roas: 3.6, occupancy: 85,
    topAudience: 'Life Event – Newly Divorced/Separated', topCreative: 'Video: "Move-In in 10 Minutes"',
  },
  {
    month: 'Mar 2026', spend: 2800, leads: 89, moveIns: 22,
    cpl: 31.46, costPerMoveIn: 127.27, roas: 4.1, occupancy: 89,
    topAudience: 'Broad + Advantage+ Optimization', topCreative: 'UGC: Customer Testimonial Reel',
  },
]

const LEAD_FEED = [
  { time: '2 min ago', name: 'Sarah M.', action: 'Submitted lead form', unit: '10×10 Standard', source: 'Meta – Lookalike', status: 'new' },
  { time: '18 min ago', name: 'David K.', action: 'Scheduled tour via phone', unit: '10×15 Drive-Up', source: 'Meta – Retargeting', status: 'tour' },
  { time: '1 hr ago', name: 'Jennifer L.', action: 'Moved in today', unit: '5×10 Climate', source: 'Meta – Life Event', status: 'moved_in' },
  { time: '2 hrs ago', name: 'Mike R.', action: 'Callback completed (< 3 min)', unit: '10×20 Drive-Up', source: 'Meta – Broad', status: 'contacted' },
  { time: '3 hrs ago', name: 'Amanda T.', action: 'Moved in today', unit: '10×10 Standard', source: 'Meta – Lookalike', status: 'moved_in' },
  { time: '5 hrs ago', name: 'Chris B.', action: 'Submitted lead form', unit: '10×30 Vehicle', source: 'Meta – Life Event', status: 'new' },
  { time: 'Yesterday', name: 'Lisa W.', action: 'Signed lease online', unit: '5×5 Climate', source: 'Meta – Retargeting', status: 'moved_in' },
  { time: 'Yesterday', name: 'Robert H.', action: 'Missed call → SMS sent → replied', unit: '10×15 Drive-Up', source: 'Meta – Lookalike', status: 'contacted' },
]

/* ═══════════════════════════════════════════════════════ */
/*  ANIMATED NUMBER HOOK                                    */
/* ═══════════════════════════════════════════════════════ */

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])

  return value
}

/* ═══════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                          */
/* ═══════════════════════════════════════════════════════ */

function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-center py-2 px-4">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Eye size={14} />
        <span>You are viewing a <strong>live demo</strong> with simulated data for a fictional facility.</span>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, prefix = '', suffix = '', change, accent }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string; value: number; prefix?: string; suffix?: string; change?: string; accent?: boolean
}) {
  const animated = useAnimatedNumber(value)
  const display = Number.isInteger(value) ? Math.round(animated) : animated.toFixed(2)

  return (
    <div className={`rounded-xl border p-4 sm:p-5 transition-all ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Icon size={18} className={accent ? 'text-emerald-600' : 'text-slate-500'} />
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            change.startsWith('+') || change.startsWith('-') && label.includes('Cost')
              ? 'bg-emerald-50 text-emerald-700'
              : change.startsWith('-')
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${accent ? 'text-emerald-700' : ''}`}>
        {prefix}{display}{suffix}
      </p>
      <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-medium">{label}</p>
    </div>
  )
}

function OccupancyChart({ data }: { data: typeof MONTHS }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Occupancy Trend</h3>
        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
          +{data[data.length - 1].occupancy - FACILITY.startingOccupancy}% from start
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Starting at {FACILITY.startingOccupancy}% → currently {data[data.length - 1].occupancy}%</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={[{ month: 'Sep (Start)', occupancy: FACILITY.startingOccupancy }, ...data]} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis domain={[55, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
          <Tooltip
            formatter={(v) => [`${v}%`, 'Occupancy']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="occupancy" stroke="#10b981" strokeWidth={2.5} fill="url(#occGrad)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CplChart({ data }: { data: typeof MONTHS }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Cost Per Lead Trend</h3>
        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
          -${(data[0].cpl - data[data.length - 1].cpl).toFixed(0)} reduction
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">CPL decreases as Pixel data matures and audiences sharpen</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'CPL']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="cpl" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#10b981' : '#94a3b8'} opacity={0.4 + (i / data.length) * 0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LeadsAndMoveInsChart({ data }: { data: typeof MONTHS }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Leads vs. Move-Ins</h3>
        <span className="text-xs text-slate-500">
          Avg conversion: {((data.reduce((s, d) => s + d.moveIns, 0) / data.reduce((s, d) => s + d.leads, 0)) * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Lead volume and move-in conversions by month</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <Bar dataKey="leads" name="Leads" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="moveIns" name="Move-Ins" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function UnitMixTable() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold">Unit Mix Performance</h3>
        <p className="text-xs text-slate-500">Campaign performance segmented by unit type</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Unit Type</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Units</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Rate</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Were Vacant</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Filled</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">MRR Recovered</th>
            </tr>
          </thead>
          <tbody>
            {FACILITY.unitMix.map((u, i) => {
              const filled = Math.min(u.vacancy, Math.round(u.vacancy * 0.78 + (i * 0.5)))
              const mrr = filled * u.rate
              return (
                <tr key={u.type} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium">{u.type}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{u.count}</td>
                  <td className="px-5 py-3 text-right text-slate-600">${u.rate}/mo</td>
                  <td className="px-5 py-3 text-right text-red-500">{u.vacancy}</td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-600">{filled}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-700">+${mrr.toLocaleString()}/mo</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">{FACILITY.totalUnits}</td>
              <td className="px-5 py-3 text-right">—</td>
              <td className="px-5 py-3 text-right text-red-500">{FACILITY.unitMix.reduce((s, u) => s + u.vacancy, 0)}</td>
              <td className="px-5 py-3 text-right text-emerald-600">
                {FACILITY.unitMix.reduce((s, u, i) => s + Math.min(u.vacancy, Math.round(u.vacancy * 0.78 + (i * 0.5))), 0)}
              </td>
              <td className="px-5 py-3 text-right text-emerald-700">
                +${FACILITY.unitMix.reduce((s, u, i) => {
                  const filled = Math.min(u.vacancy, Math.round(u.vacancy * 0.78 + (i * 0.5)))
                  return s + filled * u.rate
                }, 0).toLocaleString()}/mo
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LeadActivityFeed() {
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'New Lead' },
    contacted: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Contacted' },
    tour: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Tour Booked' },
    moved_in: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Moved In' },
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Lead Activity Feed</h3>
          <p className="text-xs text-slate-500">Real-time lead flow (simulated)</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {LEAD_FEED.map((lead, i) => {
          const s = statusStyles[lead.status]
          return (
            <div key={i} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{lead.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                  <p className="text-sm text-slate-600">{lead.action}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">{lead.unit}</span>
                    <span className="text-xs text-slate-400">via {lead.source}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{lead.time}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyBreakdownTable({ data }: { data: typeof MONTHS }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold">Monthly Campaign Performance</h3>
        <p className="text-xs text-slate-500">Full metrics by month — the numbers that matter</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Month</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Ad Spend</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Leads</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">CPL</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Move-Ins</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Cost/Move-In</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">ROAS</th>
              <th className="px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium">{m.month}</td>
                <td className="px-5 py-3 text-right text-slate-600">${m.spend.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-slate-600">{m.leads}</td>
                <td className="px-5 py-3 text-right text-slate-600">${m.cpl.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-medium text-emerald-600">{m.moveIns}</td>
                <td className="px-5 py-3 text-right text-slate-600">${m.costPerMoveIn.toFixed(0)}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-semibold ${m.roas >= 3.5 ? 'text-emerald-600' : m.roas >= 2.5 ? 'text-emerald-500' : 'text-amber-600'}`}>
                    {m.roas}x
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">{m.occupancy}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-5 py-3">6-Month Total</td>
              <td className="px-5 py-3 text-right">${data.reduce((s, m) => s + m.spend, 0).toLocaleString()}</td>
              <td className="px-5 py-3 text-right">{data.reduce((s, m) => s + m.leads, 0)}</td>
              <td className="px-5 py-3 text-right">${(data.reduce((s, m) => s + m.spend, 0) / data.reduce((s, m) => s + m.leads, 0)).toFixed(2)}</td>
              <td className="px-5 py-3 text-right text-emerald-600">{data.reduce((s, m) => s + m.moveIns, 0)}</td>
              <td className="px-5 py-3 text-right">${(data.reduce((s, m) => s + m.spend, 0) / data.reduce((s, m) => s + m.moveIns, 0)).toFixed(0)}</td>
              <td className="px-5 py-3 text-right">—</td>
              <td className="px-5 py-3 text-right">{data[data.length - 1].occupancy}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function CampaignInsights({ data }: { data: typeof MONTHS }) {
  const latest = data[data.length - 1]
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 sm:p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-amber-400" />
        <h3 className="font-semibold">Campaign Intelligence — {latest.month}</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Top Performing Audience</p>
          <p className="text-sm font-medium">{latest.topAudience}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Top Creative Asset</p>
          <p className="text-sm font-medium">{latest.topCreative}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Avg. Speed-to-Lead</p>
          <p className="text-sm font-medium text-emerald-400">3.2 minutes</p>
          <p className="text-xs text-slate-500 mt-0.5">Industry avg: 47 minutes</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Missed Call Recovery Rate</p>
          <p className="text-sm font-medium text-emerald-400">38%</p>
          <p className="text-xs text-slate-500 mt-0.5">12 recovered leads this month</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MONTH SELECTOR (PLAYBACK)                               */
/* ═══════════════════════════════════════════════════════ */

function MonthPlayback({ activeMonth, setActiveMonth, playing, setPlaying }: {
  activeMonth: number; setActiveMonth: (n: number) => void; playing: boolean; setPlaying: (b: boolean) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <button
        onClick={() => setPlaying(!playing)}
        className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {MONTHS.map((m, i) => (
            <button
              key={m.month}
              onClick={() => { setActiveMonth(i); setPlaying(false) }}
              className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                i <= activeMonth ? 'bg-emerald-500' : 'bg-slate-200'
              } ${i === activeMonth ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}
              title={m.month}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">Month {activeMonth + 1} of 6</span>
          <span className="text-sm font-semibold">{MONTHS[activeMonth].month}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD                                          */
/* ═══════════════════════════════════════════════════════ */

export default function DemoDashboard({ onBack }: { onBack: () => void }) {
  const [activeMonth, setActiveMonth] = useState(5) // Start at most recent
  const [playing, setPlaying] = useState(false)

  // Playback auto-advance
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setActiveMonth(prev => {
        if (prev >= MONTHS.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [playing])

  const visibleData = MONTHS.slice(0, activeMonth + 1)
  const current = MONTHS[activeMonth]
  const totalSpend = visibleData.reduce((s, m) => s + m.spend, 0)
  const totalLeads = visibleData.reduce((s, m) => s + m.leads, 0)
  const totalMoveIns = visibleData.reduce((s, m) => s + m.moveIns, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{FACILITY.name}</h1>
              <div className="flex items-center gap-2 -mt-0.5">
                <MapPin size={10} className="text-slate-400" />
                <p className="text-xs text-slate-500">{FACILITY.location}</p>
                <span className="text-xs text-slate-300">•</span>
                <p className="text-xs text-slate-500">{FACILITY.totalUnits} units</p>
              </div>
            </div>
          </div>
          <a
            href="#cta"
            onClick={(e) => { e.preventDefault(); onBack(); setTimeout(() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
            className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get This for Your Facility <ChevronRight size={14} />
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-emerald-200" />
              <span className="text-emerald-200 text-xs font-medium">6-Month Campaign Summary</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1">From {FACILITY.startingOccupancy}% to {MONTHS[MONTHS.length - 1].occupancy}% Occupancy</h2>
            <p className="text-emerald-100 text-sm">
              {MONTHS.reduce((s, m) => s + m.moveIns, 0)} move-ins generated at ${(MONTHS.reduce((s, m) => s + m.spend, 0) / MONTHS.reduce((s, m) => s + m.moveIns, 0)).toFixed(0)} per move-in.
              Watch the campaign compound month over month.
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mb-6">
          <MonthPlayback
            activeMonth={activeMonth}
            setActiveMonth={setActiveMonth}
            playing={playing}
            setPlaying={setPlaying}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={DollarSign} label="Total Ad Spend" value={totalSpend} prefix="$" change={`Month ${activeMonth + 1}`} />
          <KpiCard icon={Users} label="Total Leads" value={totalLeads} change={`${current.leads} this month`} />
          <KpiCard icon={Target} label="Total Move-Ins" value={totalMoveIns} change={`${current.moveIns} this month`} accent />
          <KpiCard icon={TrendingUp} label="Current ROAS" value={current.roas} suffix="x" change={current.roas >= 3 ? 'Strong' : 'Building'} accent />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <OccupancyChart data={visibleData} />
          <CplChart data={visibleData} />
        </div>

        <div className="mb-6">
          <LeadsAndMoveInsChart data={visibleData} />
        </div>

        {/* Campaign Intelligence */}
        <div className="mb-6">
          <CampaignInsights data={visibleData} />
        </div>

        {/* Lead Feed & Unit Mix side by side on desktop */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <LeadActivityFeed />
          <UnitMixTable />
        </div>

        {/* Full Monthly Table */}
        <div className="mb-6">
          <MonthlyBreakdownTable data={visibleData} />
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-center text-white">
          <Megaphone size={32} className="mx-auto mb-4 text-emerald-400" />
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Ready to See These Numbers for Your Facility?</h3>
          <p className="text-slate-400 max-w-lg mx-auto mb-6 text-sm">
            Every facility is different. Our free audit analyzes your specific market, unit mix, and competition to project what campaigns could deliver for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); onBack(); setTimeout(() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Get Your Free Facility Audit <ArrowUpRight size={16} />
            </a>
            <button
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Back to StorageAds.com
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 mb-8">
          This is a demonstration dashboard with simulated data. Actual results vary by facility, market, and ad spend.
          All metrics shown are illustrative of typical campaign performance patterns.
        </p>
      </div>
    </div>
  )
}
