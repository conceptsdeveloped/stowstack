import { useState } from 'react'
import {
  ChevronDown, ChevronUp, DoorOpen, TrendingDown, EyeOff,
  Shield, UserMinus, BadgePercent, Star,
} from 'lucide-react'
import { type LossCategory as LossCategoryType, type CategoryKey, SEVERITY_CONFIG, money } from './RevenueLossTypes'
import { MiniCounter } from './AnimatedCounter'

const ICONS: Record<CategoryKey, React.ReactNode> = {
  vacancyDrag: <DoorOpen size={20} />,
  rateGap: <TrendingDown size={20} />,
  marketingVoid: <EyeOff size={20} />,
  competitorCapture: <Shield size={20} />,
  churnBleed: <UserMinus size={20} />,
  discountDrag: <BadgePercent size={20} />,
}

const ICON_COLORS: Record<CategoryKey, string> = {
  vacancyDrag: 'text-red-500',
  rateGap: 'text-orange-500',
  marketingVoid: 'text-purple-500',
  competitorCapture: 'text-blue-500',
  churnBleed: 'text-rose-500',
  discountDrag: 'text-amber-500',
}

interface LossCategoryProps {
  categoryKey: CategoryKey
  category: LossCategoryType & Record<string, unknown>
  darkMode: boolean
  rank: number
}

export default function LossCategoryRow({ categoryKey, category, darkMode, rank }: LossCategoryProps) {
  const [expanded, setExpanded] = useState(rank === 0) // auto-expand biggest loss
  const sev = SEVERITY_CONFIG[category.severity]

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${card} ${expanded ? `ring-1 ${sev.border}` : ''}`}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/5 transition-colors"
      >
        {/* Rank */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${sev.bg} ${sev.text}`}>
          {rank + 1}
        </div>

        {/* Icon */}
        <div className={ICON_COLORS[categoryKey]}>
          {ICONS[categoryKey]}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm ${text}`}>{category.label}</h4>
          <p className={`text-xs ${sub} truncate`}>
            {category.monthlyLoss > 0 ? `${money(category.monthlyLoss)}/mo lost` : 'No loss detected'}
          </p>
        </div>

        {/* Annual loss */}
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-bold tabular-nums ${category.annualLoss > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {category.annualLoss > 0 ? '-' : ''}<MiniCounter target={category.annualLoss} />
          </p>
          <p className={`text-xs ${sub}`}>per year</p>
        </div>

        {/* Severity badge */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${sev.bg} ${sev.text} flex-shrink-0`}>
          {sev.label}
        </span>

        {/* Expand arrow */}
        <div className={sub}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className={`border-t px-4 pb-4 pt-3 space-y-4 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
          {/* Detail text */}
          <p className={`text-sm leading-relaxed ${sub}`}>{category.detail}</p>

          {/* Category-specific breakdowns */}
          {categoryKey === 'vacancyDrag' && renderVacancyBreakdown(category, darkMode, text, sub)}
          {categoryKey === 'rateGap' && renderRateGapBreakdown(category, darkMode, text, sub)}
          {categoryKey === 'marketingVoid' && renderMarketingBreakdown(category, darkMode, text, sub)}
          {categoryKey === 'competitorCapture' && renderCompetitorBreakdown(category, darkMode, text, sub)}
          {categoryKey === 'churnBleed' && renderChurnBreakdown(category, darkMode, text, sub)}
          {categoryKey === 'discountDrag' && renderDiscountBreakdown(category, darkMode, text, sub)}
        </div>
      )}
    </div>
  )
}

/* ── Category-specific detail renderers ── */

function StatBox({ label, value, accent, darkMode }: { label: string; value: string; accent?: string; darkMode: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-sm font-bold ${accent || (darkMode ? 'text-slate-100' : 'text-slate-900')}`}>{value}</p>
    </div>
  )
}

function renderVacancyBreakdown(cat: Record<string, unknown>, darkMode: boolean, text: string, sub: string) {
  const breakdown = (cat.unitBreakdown || []) as { unitType: string; sizeLabel?: string; vacantCount: number; streetRate: number; monthlyLoss: number }[]
  if (breakdown.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Vacant Units" value={String(cat.vacantUnits)} accent="text-red-500" darkMode={darkMode} />
        <StatBox label="Total Units" value={String(cat.totalUnits)} darkMode={darkMode} />
        <StatBox label="Avg Rate" value={money(cat.avgRate as number)} darkMode={darkMode} />
        <StatBox label="Monthly Loss" value={money(cat.monthlyLoss as number)} accent="text-red-500" darkMode={darkMode} />
      </div>
      {breakdown.length > 0 && (
        <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <th className={`px-3 py-2 text-left font-medium ${sub}`}>Unit Type</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Vacant</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Rate</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Monthly Loss</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((u, i) => (
                <tr key={i} className={`border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <td className={`px-3 py-2 ${text}`}>{u.unitType}</td>
                  <td className={`px-3 py-2 text-right font-medium text-red-500`}>{u.vacantCount}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{money(u.streetRate)}</td>
                  <td className={`px-3 py-2 text-right font-bold text-red-500`}>{money(u.monthlyLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderRateGapBreakdown(cat: Record<string, unknown>, darkMode: boolean, text: string, sub: string) {
  const breakdown = (cat.unitBreakdown || []) as { unitType: string; yourRate: number; streetRate: number; gap: number; occupiedCount: number; monthlyGap: number }[]
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Your Avg Rate" value={money(cat.yourAvgRate as number)} darkMode={darkMode} />
        <StatBox label="Market Avg" value={money(cat.marketAvgRate as number)} darkMode={darkMode} />
        <StatBox label="Below-Street Tenants" value={`${cat.belowStreetCount || 0} of ${cat.totalTenantsRated || 0}`} accent="text-orange-500" darkMode={darkMode} />
        <StatBox label="Monthly Gap" value={money(cat.monthlyLoss as number)} accent="text-orange-500" darkMode={darkMode} />
      </div>
      {breakdown.length > 0 && (
        <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <th className={`px-3 py-2 text-left font-medium ${sub}`}>Unit Type</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Your Rate</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Street Rate</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Gap</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Monthly Impact</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((u, i) => (
                <tr key={i} className={`border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <td className={`px-3 py-2 ${text}`}>{u.unitType}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{money(u.yourRate)}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{money(u.streetRate)}</td>
                  <td className={`px-3 py-2 text-right text-orange-500`}>-{money(u.gap)}</td>
                  <td className={`px-3 py-2 text-right font-bold text-orange-500`}>{money(u.monthlyGap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderMarketingBreakdown(cat: Record<string, unknown>, darkMode: boolean, _text: string, _sub: string) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatBox label="Monthly Search Volume" value={(cat.estimatedSearchVolume as number)?.toLocaleString() || '—'} darkMode={darkMode} />
      <StatBox label="Missed Leads/mo" value={String(cat.missedLeads || 0)} accent="text-purple-500" darkMode={darkMode} />
      <StatBox label="Missed Move-Ins/mo" value={String(cat.missedMoveIns || 0)} accent="text-purple-500" darkMode={darkMode} />
      <StatBox label="Suggested Ad Spend" value={money(cat.suggestedMonthlySpend as number) + '/mo'} accent="text-emerald-500" darkMode={darkMode} />
      <StatBox label="Market Population" value={(cat.population as number)?.toLocaleString() || '—'} darkMode={darkMode} />
      <StatBox label="Renter %" value={`${cat.renterPct || 0}%`} darkMode={darkMode} />
      <StatBox label="Benchmark CPL" value={money(cat.benchmarkCPL as number)} darkMode={darkMode} />
      <StatBox label="Monthly Revenue Loss" value={money(cat.monthlyLoss as number)} accent="text-red-500" darkMode={darkMode} />
    </div>
  )
}

function renderCompetitorBreakdown(cat: Record<string, unknown>, darkMode: boolean, text: string, sub: string) {
  const competitors = (cat.topCompetitors || []) as { name: string; rating: number | null; reviews: number; distance: string | null; website: boolean }[]
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Competitors Found" value={String(cat.totalCompetitors)} darkMode={darkMode} />
        <StatBox label="Actively Marketing" value={String(cat.activeCompetitors)} accent="text-blue-500" darkMode={darkMode} />
        <StatBox label="Their Reviews" value={(cat.competitorsTotalReviews as number)?.toLocaleString() || '0'} darkMode={darkMode} />
        <StatBox label="Your Reviews" value={String(cat.yourReviews || 0)} accent={(cat.yourReviews as number || 0) < 50 ? 'text-red-500' : 'text-emerald-500'} darkMode={darkMode} />
      </div>
      {competitors.length > 0 && (
        <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                <th className={`px-3 py-2 text-left font-medium ${sub}`}>Competitor</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Rating</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Reviews</th>
                <th className={`px-3 py-2 text-right font-medium ${sub}`}>Distance</th>
                <th className={`px-3 py-2 text-center font-medium ${sub}`}>Website</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr key={i} className={`border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <td className={`px-3 py-2 font-medium ${text}`}>{c.name}</td>
                  <td className={`px-3 py-2 text-right`}>
                    {c.rating ? <span className="text-amber-500 flex items-center justify-end gap-1"><Star size={12} fill="currentColor" />{c.rating}</span> : <span className={sub}>—</span>}
                  </td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{c.reviews?.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{c.distance || '—'}</td>
                  <td className={`px-3 py-2 text-center`}>
                    {c.website ? <span className="text-emerald-500">Yes</span> : <span className="text-red-400">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderChurnBreakdown(cat: Record<string, unknown>, darkMode: boolean, _text: string, _sub: string) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatBox label="Move-Ins (MTD)" value={String(cat.moveInsThisMonth || 0)} accent="text-emerald-500" darkMode={darkMode} />
      <StatBox label="Move-Outs (MTD)" value={String(cat.moveOutsThisMonth || 0)} accent="text-red-500" darkMode={darkMode} />
      <StatBox label="Net Movement" value={String(cat.netMovement || 0)} accent={(cat.netMovement as number || 0) < 0 ? 'text-red-500' : 'text-emerald-500'} darkMode={darkMode} />
      <StatBox label="Projected 6mo Loss" value={`${cat.projectedLossUnits6mo || 0} units`} accent="text-rose-500" darkMode={darkMode} />
      <StatBox label="Delinquent Tenants" value={String(cat.delinquentTenants || 0)} darkMode={darkMode} />
      <StatBox label="Outstanding Rent" value={money(cat.delinquencyTotal as number)} accent="text-rose-500" darkMode={darkMode} />
      <StatBox label="Trend Months" value={String(cat.trendMonths || 0)} darkMode={darkMode} />
      <StatBox label="Avg Monthly Net" value={String(cat.avgMonthlyNet || 0)} accent={(cat.avgMonthlyNet as number || 0) < 0 ? 'text-red-500' : 'text-emerald-500'} darkMode={darkMode} />
    </div>
  )
}

function renderDiscountBreakdown(cat: Record<string, unknown>, darkMode: boolean, _text: string, _sub: string) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <StatBox label="Discounted Tenants" value={String(cat.discountedTenantCount || 0)} accent="text-amber-500" darkMode={darkMode} />
      <StatBox label="Active Specials" value={String(cat.activeSpecials || 0)} darkMode={darkMode} />
      <StatBox label="Avg Discount/Tenant" value={money(cat.avgDiscount as number)} accent="text-amber-500" darkMode={darkMode} />
    </div>
  )
}
