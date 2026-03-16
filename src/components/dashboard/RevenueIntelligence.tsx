import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Zap,
  BarChart3, PiggyBank, AlertCircle, CheckCircle2,
  Sun, Snowflake, Leaf, Flower2,
  Maximize2, ShieldAlert
} from 'lucide-react'
import { Facility } from './types'
import {
  type IntelData, type UnitIntel, type SqftEntry, type SeasonalEntry,
  type AgingSummary, type IntelSummary, type RateDistEntry, type RevenueMonth,
  Badge, money, pct,
  RATE_COLORS, OCC_COLORS,
  type StyleProps,
} from './revenue/RevenueTypes'
import MetricsStrip from './revenue/MetricsStrip'
import HealthScore from './revenue/HealthScore'
import WaterfallAnalysis from './revenue/WaterfallAnalysis'
import ECRITable from './revenue/ECRITable'
import ScenarioModeler from './revenue/ScenarioModeler'

/* ── Collapsible section header ── */
function SectionHeader({ icon, title, subtitle, expanded, onToggle, sub }: {
  icon: React.ReactNode; title: string; subtitle: string
  expanded: boolean; onToggle: () => void; sub: string
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className={`text-xs ${sub}`}>{subtitle}</p>
        </div>
      </div>
      {expanded ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
    </button>
  )
}

/* ── Inline sections (kept in parent, not worth extracting to separate files) ── */

function UnitMixTable({ units, summary: s, expanded, onToggle, darkMode, card, text, sub, rowHover }: {
  units: UnitIntel[]; summary: IntelSummary; expanded: boolean; onToggle: () => void
} & StyleProps) {
  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<BarChart3 size={18} className="text-emerald-600" />}
        title="Unit Mix Intelligence"
        subtitle={`${units.length} unit types \u00b7 ${units.reduce((s, u) => s + u.total_count, 0)} total units`}
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  {['Unit Type','Total','Occupied','Vacant','Street Rate','Avg Actual','Gross Potential','Actual Rev','Rate','Occ','Action'].map((h, i) => (
                    <th key={i} className={`${i === 0 || i === 10 ? 'text-left' : i < 4 ? 'text-center' : i < 8 ? 'text-right' : 'text-center'} px-3 py-2 font-medium ${sub} ${i === 0 ? 'pl-4' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {units.map((u, i) => (
                  <tr key={i} className={rowHover}>
                    <td className={`px-4 py-2 font-medium ${text}`}><div>{u.unit_type}</div><div className={`text-xs ${sub}`}>{u.size_label}</div></td>
                    <td className={`px-3 py-2 text-center ${text}`}>{u.total_count}</td>
                    <td className="px-3 py-2 text-center text-emerald-600 font-medium">{u.occupied_count}</td>
                    <td className={`px-3 py-2 text-center ${u.vacant_count > 0 ? 'text-red-500 font-medium' : sub}`}>{u.vacant_count}</td>
                    <td className={`px-3 py-2 text-right font-mono ${text}`}>${u.street_rate?.toFixed(0)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${u.actual_avg_rate < u.street_rate ? 'text-amber-500' : 'text-emerald-600'}`}>${u.actual_avg_rate?.toFixed(0)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${sub}`}>{money(u.gross_potential)}</td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${text}`}>{money(u.actual_revenue)}</td>
                    <td className="px-3 py-2 text-center"><Badge signal={u.rate_signal} map={RATE_COLORS} /></td>
                    <td className="px-3 py-2 text-center"><Badge signal={u.occ_signal} map={OCC_COLORS} /></td>
                    <td className={`px-3 py-2 ${text}`}>
                      <div className="flex items-center gap-1">
                        {u.action.toLowerCase().includes('raise') && <Zap size={12} className="text-amber-500" />}
                        {u.action.toLowerCase().includes('fill') && <AlertTriangle size={12} className="text-red-500" />}
                        {u.action.toLowerCase().includes('hold') && <CheckCircle2 size={12} className="text-emerald-500" />}
                        <span className="text-xs">{u.action}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`font-semibold ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <td className={`px-4 py-2 ${text}`}>Totals</td>
                  <td className={`px-3 py-2 text-center ${text}`}>{units.reduce((s, u) => s + u.total_count, 0)}</td>
                  <td className="px-3 py-2 text-center text-emerald-600">{units.reduce((s, u) => s + u.occupied_count, 0)}</td>
                  <td className="px-3 py-2 text-center text-red-500">{units.reduce((s, u) => s + u.vacant_count, 0)}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>&mdash;</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>&mdash;</td>
                  <td className={`px-3 py-2 text-right font-mono ${text}`}>{money(s.total_gross_potential)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${text}`}>{money(s.total_actual_revenue)}</td>
                  <td colSpan={3} className={`px-3 py-2 text-center text-xs ${sub}`}>Capture: {pct(s.revenue_capture_pct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LostRevenueBreakdown({ units, summary: s, expanded, onToggle, darkMode, card, text, sub }: {
  units: UnitIntel[]; summary: IntelSummary; expanded: boolean; onToggle: () => void
} & StyleProps) {
  const vacantUnits = units.filter(u => u.vacant_count > 0).sort((a, b) => b.vacant_lost_monthly - a.vacant_lost_monthly)
  if (vacantUnits.length === 0) return null
  const maxLost = Math.max(...vacantUnits.map(u => u.vacant_lost_monthly), 1)
  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<PiggyBank size={18} className="text-red-500" />}
        title="Lost Revenue Calculator"
        subtitle={`${money(s.total_lost_revenue)}/mo lost to vacancy (${money(s.total_lost_revenue * 12)}/yr)`}
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          <div className="space-y-3">
            {vacantUnits.map((u, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${text}`}>{u.unit_type}</span>
                    <span className={`text-xs ${sub}`}>{u.vacant_count} vacant @ ${u.street_rate?.toFixed(0)}/mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-500">{money(u.vacant_lost_monthly)}/mo</span>
                    <span className={`text-xs ml-2 ${sub}`}>{money(u.vacant_lost_annual)}/yr</span>
                  </div>
                </div>
                <div className={`w-full h-3 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className="h-3 rounded bg-gradient-to-r from-red-400 to-red-500" style={{ width: `${(u.vacant_lost_monthly / maxLost) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className={`rounded-lg p-4 mt-2 ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className={`text-xs font-medium ${sub}`}>Monthly Lost Revenue</p><p className="text-xl font-bold text-red-500">{money(s.total_lost_revenue)}</p></div>
                <div><p className={`text-xs font-medium ${sub}`}>Annual Impact</p><p className="text-xl font-bold text-red-500">{money(s.total_lost_revenue * 12)}</p></div>
                <div><p className={`text-xs font-medium ${sub}`}>% of Potential</p><p className={`text-xl font-bold ${text}`}>{s.total_gross_potential > 0 ? (s.total_lost_revenue / s.total_gross_potential * 100).toFixed(1) : 0}%</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RateVarianceHeatmap({ rateDistribution, summary: s, expanded, onToggle, darkMode, card, text, sub }: {
  rateDistribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  summary: IntelSummary; expanded: boolean; onToggle: () => void
} & StyleProps) {
  if (rateDistribution.below.length === 0 && rateDistribution.above.length === 0) return null
  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<TrendingUp size={18} className="text-amber-500" />}
        title="Rate Variance Heatmap"
        subtitle={`${rateDistribution.below.length} below street \u00b7 ${rateDistribution.above.length} above street${s.total_tenants_rated > 0 ? ` \u00b7 ${s.tenants_at_street} at street` : ''}`}
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2"><span className={`text-xs font-medium ${sub}`}>Rate Distribution</span></div>
            <div className="flex h-8 rounded-lg overflow-hidden">
              {rateDistribution.below.length > 0 && <div className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center" style={{ width: `${(rateDistribution.below.length / s.total_tenants_rated) * 100}%` }}><span className="text-xs font-bold text-white">{rateDistribution.below.length}</span></div>}
              {s.tenants_at_street > 0 && <div className={`${darkMode ? 'bg-slate-600' : 'bg-slate-300'} flex items-center justify-center`} style={{ width: `${(s.tenants_at_street / s.total_tenants_rated) * 100}%` }}><span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{s.tenants_at_street}</span></div>}
              {rateDistribution.above.length > 0 && <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center" style={{ width: `${(rateDistribution.above.length / s.total_tenants_rated) * 100}%` }}><span className="text-xs font-bold text-white">{rateDistribution.above.length}</span></div>}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-red-500">Below Street</span>
              <span className={`text-xs ${sub}`}>At Street</span>
              <span className="text-xs text-emerald-600">Above Street</span>
            </div>
          </div>
          {rateDistribution.below.length > 0 && <VarianceList title="Largest Gaps (Below Street Rate)" entries={rateDistribution.below.sort((a, b) => a.variance - b.variance).slice(0, 15)} direction="below" darkMode={darkMode} text={text} sub={sub} />}
          {rateDistribution.above.length > 0 && <VarianceList title="Highest Premium Tenants (Above Street Rate)" entries={rateDistribution.above.sort((a, b) => b.variance - a.variance).slice(0, 10)} direction="above" darkMode={darkMode} text={text} sub={sub} />}
        </div>
      )}
    </div>
  )
}

function VarianceList({ title, entries, direction, darkMode, text, sub }: {
  title: string; entries: RateDistEntry[]; direction: 'above' | 'below'
  darkMode: boolean; text: string; sub: string
}) {
  const maxVar = Math.abs(entries[0]?.variance || 1)
  return (
    <div className={direction === 'above' ? 'mt-4' : ''}>
      <h4 className={`text-sm font-semibold mb-2 ${text}`}>{title}</h4>
      <div className="space-y-1.5">
        {entries.map((t, i) => {
          const barW = Math.abs(t.variance) / maxVar * 100
          return (
            <div key={i} className="flex items-center gap-3">
              <span className={`text-xs w-24 truncate ${text}`}>{t.unit}</span>
              <span className={`text-xs w-32 truncate ${sub}`}>{t.tenant}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-4 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className={`h-4 rounded ${direction === 'below' ? (t.ecri ? 'bg-gradient-to-r from-red-500 to-blue-500' : 'bg-red-400') : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} style={{ width: `${barW}%` }} />
                </div>
                <span className={`text-xs font-mono w-12 text-right ${direction === 'below' ? 'text-red-500' : 'text-emerald-600'}`}>{direction === 'below' ? '-' : '+'}${Math.abs(t.variance).toFixed(0)}</span>
              </div>
              {direction === 'below' && t.ecri && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">ECRI</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RevenueTrend({ revenueHistory, expanded, onToggle, darkMode, card, text, sub }: {
  revenueHistory: RevenueMonth[]; expanded: boolean; onToggle: () => void
} & StyleProps) {
  if (revenueHistory.length === 0) return null
  const maxRevenue = Math.max(...revenueHistory.map(r => r.revenue || 0), 1)
  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<TrendingUp size={18} className="text-indigo-600" />}
        title="Revenue Trend" subtitle={`${revenueHistory.length} months of history`}
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          <div className="flex items-end gap-1 h-40 mb-3">
            {revenueHistory.map((m, i) => {
              const h = maxRevenue > 0 ? (m.revenue / maxRevenue * 100) : 0
              const isLatest = i === revenueHistory.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full relative">
                    <div className={`w-full rounded-t transition-colors ${isLatest ? 'bg-emerald-500' : darkMode ? 'bg-indigo-600/60 group-hover:bg-indigo-500' : 'bg-indigo-400/60 group-hover:bg-indigo-500'}`} style={{ height: `${Math.max(h, 2)}%`, minHeight: '2px' }} />
                  </div>
                  <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap ${darkMode ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-white'}`}>
                    {m.month.slice(0, 3)} {m.year}: {money(m.revenue)}<br />{'\u2191'}{m.move_ins} {'\u2193'}{m.move_outs}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-1">
            {revenueHistory.map((m, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 3 === 0 && <span className={`text-[9px] ${sub}`}>{m.month.slice(0, 3)} '{String(m.year).slice(2)}</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`text-xs font-medium ${sub}`}>Total Move-Ins (shown period)</p>
              <p className="text-lg font-bold text-emerald-600">{revenueHistory.reduce((s, m) => s + (m.move_ins || 0), 0)}</p>
            </div>
            <div className={`rounded-lg p-3 ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-xs font-medium ${sub}`}>Total Move-Outs (shown period)</p>
              <p className="text-lg font-bold text-red-500">{revenueHistory.reduce((s, m) => s + (m.move_outs || 0), 0)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SqftAnalysis({ sqftAnalysis, expanded, onToggle, darkMode, card, text, sub }: {
  sqftAnalysis: SqftEntry[]; expanded: boolean; onToggle: () => void
} & StyleProps) {
  if (sqftAnalysis.length === 0) return null
  const sorted = [...sqftAnalysis].sort((a, b) => b.actual_per_sqft - a.actual_per_sqft)
  const maxPerSqft = Math.max(...sorted.map(s => s.actual_per_sqft), 1)
  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<Maximize2 size={18} className="text-orange-600" />}
        title="Revenue per Square Foot" subtitle="Which unit types generate the most revenue per sqft"
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          <div className="space-y-3">
            {sorted.map((u, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${text}`}>{u.unit_type}</span>
                    <span className={`text-xs ${sub}`}>{u.sqft} sqft</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><span className={`text-xs ${sub}`}>Street: </span><span className={`text-xs font-mono ${sub}`}>${u.street_per_sqft.toFixed(2)}/sf</span></div>
                    <span className={`text-sm font-bold ${u.actual_per_sqft >= u.street_per_sqft ? 'text-emerald-600' : 'text-amber-500'}`}>${u.actual_per_sqft.toFixed(2)}/sf</span>
                  </div>
                </div>
                <div className={`w-full h-5 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} relative overflow-hidden`}>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${(u.street_per_sqft / maxPerSqft * 100)}%` }} />
                  <div className={`h-5 rounded transition-all ${i === 0 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : u.actual_per_sqft >= u.street_per_sqft ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${(u.actual_per_sqft / maxPerSqft * 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className={`text-xs ${sub}`}>Above street $/sf</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /><span className={`text-xs ${sub}`}>Below street $/sf</span></div>
              <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-slate-400" /><span className={`text-xs ${sub}`}>Street rate line</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SeasonalPatterns({ seasonalPattern, expanded, onToggle, darkMode, card, text, sub }: {
  seasonalPattern: SeasonalEntry[]; expanded: boolean; onToggle: () => void
} & StyleProps) {
  if (seasonalPattern.length === 0 || !seasonalPattern.some(p => p.avg_move_ins > 0)) return null
  const maxActivity = Math.max(...seasonalPattern.map(p => Math.max(p.avg_move_ins, p.avg_move_outs)), 1)
  const seasonIcons: Record<string, React.ReactNode> = {
    Jan: <Snowflake size={10} />, Feb: <Snowflake size={10} />, Mar: <Flower2 size={10} />,
    Apr: <Flower2 size={10} />, May: <Flower2 size={10} />, Jun: <Sun size={10} />,
    Jul: <Sun size={10} />, Aug: <Sun size={10} />, Sep: <Leaf size={10} />,
    Oct: <Leaf size={10} />, Nov: <Snowflake size={10} />, Dec: <Snowflake size={10} />,
  }
  const peakMonth = seasonalPattern.reduce((best, m) => m.avg_move_ins > best.avg_move_ins ? m : best)
  const troughMonth = seasonalPattern.reduce((best, m) => m.avg_move_ins < best.avg_move_ins && m.avg_move_ins > 0 ? m : best, seasonalPattern[0])
  const worstNetMonth = seasonalPattern.reduce((best, m) => (m.avg_move_ins - m.avg_move_outs) < (best.avg_move_ins - best.avg_move_outs) ? m : best)

  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<Sun size={18} className="text-yellow-500" />}
        title="Seasonal Patterns" subtitle="Average move-in/out activity by month (multi-year)"
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
          <div className="space-y-4">
            <div className="flex items-end gap-1 h-36">
              {seasonalPattern.map((m, i) => {
                const inH = (m.avg_move_ins / maxActivity * 100), outH = (m.avg_move_outs / maxActivity * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                      <div className="w-[45%] rounded-t bg-emerald-500 transition-all" style={{ height: `${Math.max(inH, 3)}%` }} />
                      <div className="w-[45%] rounded-t bg-red-400 transition-all" style={{ height: `${Math.max(outH, 3)}%` }} />
                    </div>
                    <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap ${darkMode ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-white'}`}>
                      {m.month}: {'\u2191'}{m.avg_move_ins.toFixed(1)} {'\u2193'}{m.avg_move_outs.toFixed(1)} (net {(m.avg_move_ins - m.avg_move_outs) >= 0 ? '+' : ''}{(m.avg_move_ins - m.avg_move_outs).toFixed(1)})<br />Avg Rev: {money(m.avg_revenue)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1">
              {seasonalPattern.map((m, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-[10px] flex flex-col items-center gap-0.5 ${(m.avg_move_ins - m.avg_move_outs) > 0 ? 'text-emerald-600' : 'text-red-400'}`}>{seasonIcons[m.month]}{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /><span className={`text-xs ${sub}`}>Avg Move-Ins</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /><span className={`text-xs ${sub}`}>Avg Move-Outs</span></div>
              </div>
              <span className={`text-xs ${sub}`}>Based on {seasonalPattern[0]?.years_of_data || 0} year(s) of data</span>
            </div>
            <div className={`rounded-lg p-3 ${darkMode ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-xs ${text}`}>
                <span className="font-semibold">{'\ud83d\udcca'} Insight:</span>{' '}
                Peak move-in month is <span className="font-bold text-emerald-600">{peakMonth.month}</span> ({peakMonth.avg_move_ins.toFixed(1)} avg).
                Slowest is <span className="font-bold text-amber-600">{troughMonth.month}</span> ({troughMonth.avg_move_ins.toFixed(1)} avg).
                Worst net absorption is <span className="font-bold text-red-500">{worstNetMonth.month}</span> (net {(worstNetMonth.avg_move_ins - worstNetMonth.avg_move_outs).toFixed(1)}).
                <span className="font-semibold"> Ramp ad spend in {seasonalPattern.filter(m => m.avg_move_ins >= peakMonth.avg_move_ins * 0.8).map(m => m.month).join(', ')}.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DelinquencyDashboard({ aging, summary: s, expanded, onToggle, darkMode, card, text, sub }: {
  aging: AgingSummary | null; summary: IntelSummary; expanded: boolean; onToggle: () => void
} & StyleProps) {
  if (!aging || parseFloat(String(aging.total_outstanding || 0)) <= 0) return null
  const total = parseFloat(String(aging.total_outstanding || 0))
  const buckets = [
    { label: '0\u201330 days', value: parseFloat(String(aging.total_0_30 || 0)), color: 'bg-yellow-400', recovery: 0.95 },
    { label: '31\u201360 days', value: parseFloat(String(aging.total_31_60 || 0)), color: 'bg-orange-400', recovery: 0.75 },
    { label: '61\u201390 days', value: parseFloat(String(aging.total_61_90 || 0)), color: 'bg-orange-600', recovery: 0.50 },
    { label: '91\u2013120 days', value: parseFloat(String(aging.total_91_120 || 0)), color: 'bg-red-500', recovery: 0.25 },
    { label: '120+ days', value: parseFloat(String(aging.total_120_plus || 0)), color: 'bg-red-700', recovery: 0.05 },
  ]
  const maxBucket = Math.max(...buckets.map(b => b.value), 1)
  const expectedRecovery = buckets.reduce((s, b) => s + b.value * b.recovery, 0)
  const projectedWriteOff = total - expectedRecovery

  return (
    <div className={`border rounded-xl ${card}`}>
      <SectionHeader
        icon={<ShieldAlert size={18} className="text-orange-600" />}
        title="Delinquency Risk Dashboard"
        subtitle={`${money(total)} outstanding across ${aging.delinquent_count} accounts`}
        expanded={expanded} onToggle={onToggle} sub={sub}
      />
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
          <div className="grid grid-cols-5 gap-2">
            {buckets.map((b, i) => (
              <div key={i} className={`rounded-lg p-3 text-center border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`w-full h-16 rounded flex items-end justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div className={`w-3/4 rounded-t ${b.color} transition-all`} style={{ height: `${(b.value / maxBucket * 100)}%`, minHeight: b.value > 0 ? '4px' : '0' }} />
                </div>
                <p className={`text-xs font-medium mt-2 ${text}`}>{b.label}</p>
                <p className={`text-sm font-bold ${b.value > 0 ? 'text-red-500' : sub}`}>{money(b.value)}</p>
                <p className={`text-[10px] ${sub}`}>{(b.recovery * 100).toFixed(0)}% recovery</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-xs font-medium ${sub}`}>Total Outstanding</p><p className="text-lg font-bold text-red-500">{money(total)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`text-xs font-medium ${sub}`}>Expected Recovery</p><p className="text-lg font-bold text-emerald-600">{money(expectedRecovery)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
              <p className={`text-xs font-medium ${sub}`}>Projected Write-Off</p><p className={`text-lg font-bold ${text}`}>{money(projectedWriteOff)}</p>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${darkMode ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <p className={`text-xs ${text}`}>
                <span className="font-semibold">Delinquency Rate:</span>{' '}
                {s.total_actual_revenue > 0 ? (total / s.total_actual_revenue * 100).toFixed(1) : 0}% of MRR
                {aging.moved_out_count > 0 && <> &middot; {aging.moved_out_count} delinquent accounts already moved out (likely write-off: {money(parseFloat(String(aging.total_120_plus || 0)))})</>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export default function RevenueIntelligence({ facility, adminKey, darkMode }: {
  facility: Facility; adminKey: string; darkMode: boolean
}) {
  const [data, setData] = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')
  const [ecriSort, setEcriSort] = useState<'lift' | 'variance' | 'days'>('lift')
  const [scenVacancyFill, setScenVacancyFill] = useState(25)
  const [scenRateIncrease, setScenRateIncrease] = useState(0)
  const [scenEcriApply, setScenEcriApply] = useState(100)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const rowHover = darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
  const styleProps = { darkMode, card, text, sub, rowHover }

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/revenue-intelligence?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [facility.id, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className={`border rounded-xl p-12 text-center ${card}`}>
      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
      <p className={sub}>Loading revenue intelligence...</p>
    </div>
  )

  if (error) return (
    <div className={`border rounded-xl p-8 text-center ${card}`}>
      <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={fetchData} className="mt-3 text-sm text-emerald-600 hover:underline">Try again</button>
    </div>
  )

  if (!data || data.units.length === 0) return (
    <div className={`border rounded-xl p-12 text-center ${card}`}>
      <BarChart3 className={`mx-auto mb-3 ${sub}`} size={40} />
      <h3 className={`text-lg font-semibold ${text}`}>No PMS Data Yet</h3>
      <p className={`text-sm mt-1 ${sub}`}>Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power revenue intelligence.</p>
    </div>
  )

  const { summary: s, units, ecri_tenants, rate_distribution, revenue_history, health, waterfall, sqft_analysis, seasonal_pattern, aging } = data

  return (
    <div className="space-y-4">
      <MetricsStrip summary={s} {...styleProps} />
      <UnitMixTable units={units} summary={s} expanded={expandedSection === 'overview'} onToggle={() => toggle('overview')} {...styleProps} />
      <LostRevenueBreakdown units={units} summary={s} expanded={expandedSection === 'lost'} onToggle={() => toggle('lost')} {...styleProps} />
      <ECRITable ecriTenants={ecri_tenants} summary={s} ecriSort={ecriSort} onEcriSortChange={setEcriSort} expanded={expandedSection === 'ecri'} onToggle={() => toggle('ecri')} {...styleProps} />
      <RateVarianceHeatmap rateDistribution={rate_distribution} summary={s} expanded={expandedSection === 'rates'} onToggle={() => toggle('rates')} {...styleProps} />
      <RevenueTrend revenueHistory={revenue_history} expanded={expandedSection === 'trend'} onToggle={() => toggle('trend')} {...styleProps} />
      {health && <HealthScore health={health} expanded={expandedSection === 'health'} onToggle={() => toggle('health')} {...styleProps} />}
      {waterfall && <WaterfallAnalysis waterfall={waterfall} expanded={expandedSection === 'waterfall'} onToggle={() => toggle('waterfall')} {...styleProps} />}
      <ScenarioModeler units={units} summary={s} scenVacancyFill={scenVacancyFill} scenRateIncrease={scenRateIncrease} scenEcriApply={scenEcriApply} onScenVacancyFillChange={setScenVacancyFill} onScenRateIncreaseChange={setScenRateIncrease} onScenEcriApplyChange={setScenEcriApply} expanded={expandedSection === 'scenario'} onToggle={() => toggle('scenario')} {...styleProps} />
      <SqftAnalysis sqftAnalysis={sqft_analysis} expanded={expandedSection === 'sqft'} onToggle={() => toggle('sqft')} {...styleProps} />
      <SeasonalPatterns seasonalPattern={seasonal_pattern} expanded={expandedSection === 'seasonal'} onToggle={() => toggle('seasonal')} {...styleProps} />
      <DelinquencyDashboard aging={aging} summary={s} expanded={expandedSection === 'delinquency'} onToggle={() => toggle('delinquency')} {...styleProps} />
    </div>
  )
}
