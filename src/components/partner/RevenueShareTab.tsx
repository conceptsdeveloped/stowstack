import {
  Building2, TrendingUp, CheckCircle2,
  Rocket, BadgeDollarSign
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  REV_SHARE_TIERS, PER_FACILITY_MRR,
  getRevShareTier, getNextTier, STATUS_COLORS
} from './PartnerTypes'
import type { OrgFacility } from './PartnerTypes'

export interface RevenueShareTabProps {
  facilities: OrgFacility[]
}

export default function RevenueShareTab({ facilities }: RevenueShareTabProps) {
  const facilityCount = facilities.length
  const currentTier = getRevShareTier(facilityCount)
  const nextTier = getNextTier(facilityCount)
  const TierIcon = currentTier.icon

  const grossMrr = facilityCount * PER_FACILITY_MRR
  const monthlyEarnings = grossMrr * (currentTier.pct / 100)
  const annualEarnings = monthlyEarnings * 12

  // What they'd earn at next tier
  const nextTierFacilities = nextTier ? nextTier.min : facilityCount
  const nextTierMrr = nextTierFacilities * PER_FACILITY_MRR
  const nextTierMonthly = nextTier ? nextTierMrr * (nextTier.pct / 100) : monthlyEarnings
  const facilitiesToNext = nextTier ? nextTier.min - facilityCount : 0

  // Simulated monthly earnings history (based on current facilities)
  const earningsHistory = (() => {
    const months: { month: string; earned: number; facilities: number; grossMrr: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      // Simulate gradual facility growth
      const facCount = Math.max(1, Math.round(facilityCount * (1 - i * 0.12)))
      const tier = getRevShareTier(facCount)
      const mrr = facCount * PER_FACILITY_MRR
      const earned = mrr * (tier.pct / 100)
      months.push({ month: monthStr, earned: Math.round(earned), facilities: facCount, grossMrr: mrr })
    }
    return months
  })()

  const totalLifetimeEarnings = earningsHistory.reduce((s, m) => s + m.earned, 0)

  // Projection data for 12 months
  const projections = (() => {
    const rows: { month: string; facilities: number; pct: number; earned: number }[] = []
    const now = new Date()
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      // Conservative estimate: 1-2 new facilities per quarter
      const projected = facilityCount + Math.floor(i / 3)
      const tier = getRevShareTier(projected)
      const mrr = projected * PER_FACILITY_MRR
      rows.push({ month: monthStr, facilities: projected, pct: tier.pct, earned: Math.round(mrr * (tier.pct / 100)) })
    }
    return rows
  })()

  // Pie chart data for earnings breakdown
  const pieData = [
    { name: 'Your Earnings', value: monthlyEarnings, color: '#10b981' },
    { name: 'StowStack Share', value: grossMrr - monthlyEarnings, color: '#e2e8f0' },
  ]

  return (
    <div>
      {/* Hero earnings banner */}
      <div className={`bg-gradient-to-br ${currentTier.bgGradient} rounded-2xl p-6 sm:p-8 text-white mb-6 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TierIcon size={20} />
                <span className="text-sm font-semibold opacity-90">{currentTier.name} Partner</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">${monthlyEarnings.toLocaleString()}<span className="text-lg font-medium opacity-75">/mo</span></h2>
              <p className="text-sm opacity-80 mt-1">Your current monthly revenue share earnings</p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-black">{currentTier.pct}%</div>
              <div className="text-xs opacity-75">rev share rate</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <div className="text-xl font-bold">{facilityCount}</div>
              <div className="text-[11px] opacity-75">Active Facilities</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <div className="text-xl font-bold">${grossMrr.toLocaleString()}</div>
              <div className="text-[11px] opacity-75">Gross MRR</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <div className="text-xl font-bold">${annualEarnings.toLocaleString()}</div>
              <div className="text-[11px] opacity-75">Annual Earnings</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <div className="text-xl font-bold">${totalLifetimeEarnings.toLocaleString()}</div>
              <div className="text-[11px] opacity-75">Lifetime Earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next tier CTA */}
      {nextTier && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Rocket size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900">Unlock {nextTier.name} — {nextTier.pct}% Revenue Share</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Add <span className="font-bold">{facilitiesToNext} more {facilitiesToNext === 1 ? 'facility' : 'facilities'}</span> to reach {nextTier.name} tier and earn <span className="font-bold">${nextTierMonthly.toLocaleString()}/mo</span> — that's <span className="font-bold text-emerald-800">${(nextTierMonthly - monthlyEarnings).toLocaleString()}/mo more</span>.
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-emerald-600 mb-1.5">
                  <span>{facilityCount} / {nextTier.min} facilities</span>
                  <span>{Math.round((facilityCount / nextTier.min) * 100)}%</span>
                </div>
                <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${Math.min(100, (facilityCount / nextTier.min) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deal terms */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BadgeDollarSign size={18} className="text-emerald-600" />
          <h3 className="font-bold text-sm">Revenue Share Program</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">LIFETIME RECURRING</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600 mb-5">
            For every facility you bring to StowStack, you earn a percentage of the monthly platform revenue — <strong>forever</strong>. No caps, no clawbacks, no sunset. As long as the facility stays on StowStack, you get paid.
          </p>
          <div className="grid sm:grid-cols-4 gap-3">
            {REV_SHARE_TIERS.map(tier => {
              const isActive = currentTier.name === tier.name
              const TIcon = tier.icon
              return (
                <div key={tier.name} className={`rounded-xl border-2 p-4 text-center transition-all ${isActive ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10 scale-105' : 'border-slate-200 hover:border-slate-300'}`}>
                  <TIcon size={24} className="mx-auto mb-2" style={{ color: tier.color }} />
                  <div className="font-bold text-sm" style={{ color: tier.color }}>{tier.name}</div>
                  <div className="text-3xl font-black mt-1" style={{ color: isActive ? '#059669' : undefined }}>{tier.pct}%</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {tier.max === Infinity ? `${tier.min}+ facilities` : `${tier.min}\u2013${tier.max} facilities`}
                  </div>
                  <div className="text-xs font-medium mt-2" style={{ color: isActive ? '#059669' : '#94a3b8' }}>
                    ${(tier.min * PER_FACILITY_MRR * tier.pct / 100).toLocaleString()}\u2013{tier.max === Infinity ? '$$$$' : `$${(tier.max * PER_FACILITY_MRR * tier.pct / 100).toLocaleString()}`}/mo
                  </div>
                  {isActive && <div className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-200 rounded-full px-2 py-0.5 inline-block">YOUR TIER</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Earnings chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-600" /> Monthly Earnings
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={earningsHistory}>
              <defs>
                <linearGradient id="earnGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Earned']} />
              <Area type="monotone" dataKey="earned" stroke="#10b981" strokeWidth={2.5} fill="url(#earnGreen)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Earnings split pie */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Your Split This Month</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Your Earnings</span>
              </div>
              <span className="font-bold text-emerald-600">${monthlyEarnings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <span className="text-slate-600">Platform Revenue</span>
              </div>
              <span className="font-medium text-slate-500">${(grossMrr - monthlyEarnings).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-facility earnings breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 size={15} className="text-slate-500" /> Per-Facility Earnings
          </h3>
          <span className="text-xs text-slate-400">${PER_FACILITY_MRR}/facility x {currentTier.pct}% = ${(PER_FACILITY_MRR * currentTier.pct / 100).toFixed(2)}/facility/mo</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Facility</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Platform Fee</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Your {currentTier.pct}%</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(f => (
              <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-2.5">
                  <span className="font-medium">{f.name}</span>
                  <span className="block text-[10px] text-slate-400">{f.location}</span>
                </td>
                <td className="px-5 py-2.5 text-right text-slate-600">${PER_FACILITY_MRR}/mo</td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-600">${(PER_FACILITY_MRR * currentTier.pct / 100).toFixed(2)}/mo</td>
                <td className="px-5 py-2.5 text-right">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50 font-semibold">
              <td className="px-5 py-3 text-emerald-800">{facilities.length} Facilities Total</td>
              <td className="px-5 py-3 text-right text-slate-700">${grossMrr.toLocaleString()}/mo</td>
              <td className="px-5 py-3 text-right text-emerald-700">${monthlyEarnings.toLocaleString()}/mo</td>
              <td className="px-5 py-3 text-right"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-200 text-emerald-800">{currentTier.name}</span></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 12-month projection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Rocket size={15} className="text-purple-500" /> 12-Month Earnings Projection
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Conservative estimate assuming ~1 new facility per quarter</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-2 font-medium text-slate-600">Month</th>
              <th className="text-right px-5 py-2 font-medium text-slate-600">Facilities</th>
              <th className="text-right px-5 py-2 font-medium text-slate-600">Tier %</th>
              <th className="text-right px-5 py-2 font-medium text-slate-600">Monthly Earnings</th>
              <th className="text-right px-5 py-2 font-medium text-slate-600">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((p, i) => {
              const cumulative = projections.slice(0, i + 1).reduce((s, x) => s + x.earned, 0) + totalLifetimeEarnings
              const tierChanged = i > 0 && p.pct !== projections[i - 1].pct
              return (
                <tr key={p.month} className={`border-b border-slate-50 ${tierChanged ? 'bg-emerald-50' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-5 py-2.5 font-medium">{p.month} {tierChanged && <span className="text-[10px] text-emerald-600 font-bold ml-1">TIER UP!</span>}</td>
                  <td className="px-5 py-2.5 text-right">{p.facilities}</td>
                  <td className="px-5 py-2.5 text-right">{p.pct}%</td>
                  <td className="px-5 py-2.5 text-right font-medium text-emerald-600">${p.earned.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">${cumulative.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Fine print */}
      <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">How It Works</h4>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span><strong>Recurring forever.</strong> Your revenue share continues as long as each facility remains on StowStack. No sunset clause, no cap.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span><strong>Tier upgrades are instant.</strong> The moment you add your {nextTier ? `${nextTier.min}th` : 'next'} facility, your rate increases across all facilities.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span><strong>Paid monthly.</strong> Earnings are calculated at the end of each billing cycle and paid out within 15 days.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span><strong>No clawbacks.</strong> If a facility churns, you simply stop earning on that facility. No repayment of prior earnings, ever.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
