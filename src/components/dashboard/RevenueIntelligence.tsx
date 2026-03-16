import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, TrendingUp, AlertTriangle, Target,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, Zap,
  BarChart3, Users, PiggyBank, AlertCircle, CheckCircle2,
  Activity, Droplets, Sun, Snowflake, Leaf, Flower2,
  SlidersHorizontal, Maximize2, ShieldAlert
} from 'lucide-react'
import { Facility } from './types'

/* ── Types ── */

interface UnitIntel {
  unit_type: string
  size_label: string
  sqft: number
  total_count: number
  occupied_count: number
  vacant_count: number
  street_rate: number
  actual_avg_rate: number
  gross_potential: number
  actual_revenue: number
  lost_revenue: number
  rate_capture_pct: number
  economic_occupancy: number
  ecri_eligible: number
  rate_signal: 'premium' | 'above' | 'neutral' | 'below' | 'underpriced'
  occ_signal: 'full' | 'healthy' | 'moderate' | 'low'
  action: string
  vacant_lost_monthly: number
  vacant_lost_annual: number
}

interface ECRITenant {
  unit: string
  tenant_name: string
  moved_in: string
  standard_rate: number
  actual_rate: number
  rate_variance: number
  days_as_tenant: number
  ecri_suggested: number
  ecri_revenue_lift: number
}

interface RateDistEntry {
  unit: string
  tenant: string
  variance: number
  actual: number
  standard: number
  days: number
  ecri?: boolean
  suggested?: number
  lift?: number
}

interface RevenueMonth {
  year: number
  month: string
  revenue: number
  move_ins: number
  move_outs: number
}

interface AgingSummary {
  delinquent_count: number
  total_0_30: number
  total_31_60: number
  total_61_90: number
  total_91_120: number
  total_120_plus: number
  total_outstanding: number
  moved_out_count: number
}

interface IntelSummary {
  total_gross_potential: number
  total_actual_revenue: number
  total_lost_revenue: number
  revenue_capture_pct: number
  revenue_trend_pct: number | null
  ecri_eligible_count: number
  ecri_monthly_lift: number
  ecri_annual_lift: number
  tenants_above_street: number
  tenants_at_street: number
  tenants_below_street: number
  total_tenants_rated: number
}

interface HealthBreakdown {
  overall: number
  occupancy: { score: number; weight: number; value: number }
  rate_capture: { score: number; weight: number; value: number }
  rate_optimization: { score: number; weight: number; value: number }
  delinquency: { score: number; weight: number; value: number }
  trend: { score: number; weight: number; value: number | null }
}

interface Waterfall {
  gross_potential: number
  vacancy_loss: number
  rate_gap_loss: number
  delinquency_loss: number
  net_effective: number
  actual_collected: number
}

interface SqftEntry {
  unit_type: string
  sqft: number
  total_sqft: number
  occupied_sqft: number
  revenue_per_sqft: number
  potential_per_sqft: number
  street_per_sqft: number
  actual_per_sqft: number
}

interface SeasonalEntry {
  month: string
  avg_move_ins: number
  avg_move_outs: number
  avg_revenue: number
  years_of_data: number
}

interface IntelData {
  summary: IntelSummary & { total_discount_impact: number; discounted_tenants: number }
  health: HealthBreakdown
  waterfall: Waterfall
  sqft_analysis: SqftEntry[]
  seasonal_pattern: SeasonalEntry[]
  units: UnitIntel[]
  ecri_tenants: ECRITenant[]
  rate_distribution: { above: RateDistEntry[]; below: RateDistEntry[] }
  revenue_history: RevenueMonth[]
  aging: AgingSummary | null
}

/* ── Signal badge helpers ── */

const RATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  premium: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Premium' },
  above: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Above Street' },
  neutral: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', label: 'At Street' },
  below: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Below Street' },
  underpriced: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Underpriced' },
}

const OCC_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  full: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Near Full' },
  healthy: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Healthy' },
  moderate: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Low' },
}

function Badge({ signal, map }: { signal: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[signal] || map.neutral || { bg: 'bg-slate-100', text: 'text-slate-600', label: signal }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

function money(val: number | null | undefined) {
  if (val == null) return '—'
  return '$' + Math.round(val).toLocaleString()
}

function pct(val: number | null | undefined) {
  if (val == null) return '—'
  return val.toFixed(1) + '%'
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
  // Scenario modeler state
  const [scenVacancyFill, setScenVacancyFill] = useState(25)
  const [scenRateIncrease, setScenRateIncrease] = useState(0)
  const [scenEcriApply, setScenEcriApply] = useState(100)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const rowHover = darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/revenue-intelligence?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }, [facility.id, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className={`border rounded-xl p-12 text-center ${card}`}>
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        <p className={sub}>Loading revenue intelligence...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`border rounded-xl p-8 text-center ${card}`}>
        <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-emerald-600 hover:underline">Try again</button>
      </div>
    )
  }

  if (!data || data.units.length === 0) {
    return (
      <div className={`border rounded-xl p-12 text-center ${card}`}>
        <BarChart3 className={`mx-auto mb-3 ${sub}`} size={40} />
        <h3 className={`text-lg font-semibold ${text}`}>No PMS Data Yet</h3>
        <p className={`text-sm mt-1 ${sub}`}>
          Import a storEDGE Consolidated Occupancy report in the PMS Data tab to power revenue intelligence.
        </p>
      </div>
    )
  }

  const { summary: s, units, ecri_tenants, rate_distribution, revenue_history, health, waterfall, sqft_analysis, seasonal_pattern, aging } = data

  // Sort ECRI tenants
  const sortedEcri = [...ecri_tenants].sort((a, b) => {
    if (ecriSort === 'lift') return (b.ecri_revenue_lift || 0) - (a.ecri_revenue_lift || 0)
    if (ecriSort === 'variance') return (a.rate_variance || 0) - (b.rate_variance || 0)
    return (b.days_as_tenant || 0) - (a.days_as_tenant || 0)
  })

  // Revenue history sparkline data (simple bar chart)
  const maxRevenue = Math.max(...revenue_history.map(r => r.revenue || 0), 1)

  return (
    <div className="space-y-4">

      {/* ═══ TOP METRICS STRIP ═══ */}
      <div className={`border rounded-xl ${card} p-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Gross Potential */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Gross Potential</p>
            <p className={`text-2xl font-bold ${text}`}>{money(s.total_gross_potential)}</p>
            <p className={`text-xs ${sub}`}>at street rates</p>
          </div>

          {/* Actual Revenue */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Actual MRR</p>
            <p className={`text-2xl font-bold text-emerald-600`}>{money(s.total_actual_revenue)}</p>
            <p className={`text-xs ${sub}`}>
              {s.revenue_trend_pct != null && (
                <span className={s.revenue_trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {s.revenue_trend_pct >= 0 ? '↑' : '↓'} {Math.abs(s.revenue_trend_pct)}% MoM
                </span>
              )}
            </p>
          </div>

          {/* Lost Revenue */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Lost to Vacancy</p>
            <p className="text-2xl font-bold text-red-500">{money(s.total_lost_revenue)}</p>
            <p className={`text-xs ${sub}`}>{money(s.total_lost_revenue * 12)}/yr</p>
          </div>

          {/* Revenue Capture */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Revenue Capture</p>
            <p className={`text-2xl font-bold ${s.revenue_capture_pct >= 85 ? 'text-emerald-600' : s.revenue_capture_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct(s.revenue_capture_pct)}
            </p>
            <p className={`text-xs ${sub}`}>actual ÷ potential</p>
          </div>

          {/* ECRI Opportunity */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>ECRI Opportunity</p>
            <p className="text-2xl font-bold text-blue-600">{money(s.ecri_monthly_lift)}</p>
            <p className={`text-xs ${sub}`}>{s.ecri_eligible_count} tenants · {money(s.ecri_annual_lift)}/yr</p>
          </div>

          {/* Rate Distribution */}
          <div className="text-center">
            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Rate Position</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-emerald-600 text-sm font-bold">{s.tenants_above_street}</span>
              <ArrowUpRight size={14} className="text-emerald-600" />
              <span className={`text-sm font-bold ${sub}`}>{s.tenants_at_street}</span>
              <Minus size={14} className={sub} />
              <span className="text-red-500 text-sm font-bold">{s.tenants_below_street}</span>
              <ArrowDownRight size={14} className="text-red-500" />
            </div>
            <p className={`text-xs ${sub}`}>{s.total_tenants_rated} rated</p>
          </div>
        </div>
      </div>

      {/* ═══ REVENUE OPTIMIZATION BY UNIT TYPE ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button onClick={() => toggle('units')} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <Target size={18} className="text-emerald-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Revenue Optimization by Unit Type</h3>
              <p className={`text-xs ${sub}`}>Rate signals, vacancy cost, and action recommendations</p>
            </div>
          </div>
          {expandedSection === 'units' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'units' && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <th className={`text-left px-4 py-3 font-medium ${sub}`}>Unit Type</th>
                  <th className={`text-center px-3 py-3 font-medium ${sub}`}>Units</th>
                  <th className={`text-center px-3 py-3 font-medium ${sub}`}>Occupancy</th>
                  <th className={`text-right px-3 py-3 font-medium ${sub}`}>Street Rate</th>
                  <th className={`text-right px-3 py-3 font-medium ${sub}`}>Avg Actual</th>
                  <th className={`text-center px-3 py-3 font-medium ${sub}`}>Rate Signal</th>
                  <th className={`text-right px-3 py-3 font-medium ${sub}`}>Lost MRR</th>
                  <th className={`text-center px-3 py-3 font-medium ${sub}`}>ECRI</th>
                  <th className={`text-left px-4 py-3 font-medium ${sub}`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {units.map((u, i) => {
                  const occPct = u.total_count > 0 ? Math.round(u.occupied_count / u.total_count * 100) : 0
                  return (
                    <tr key={i} className={rowHover}>
                      <td className={`px-4 py-3 font-medium ${text}`}>
                        <div>{u.unit_type}</div>
                        <div className={`text-xs ${sub}`}>{u.sqft} sqft</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={text}>{u.occupied_count}</span>
                        <span className={sub}>/{u.total_count}</span>
                        <span className="text-red-500 text-xs ml-1">({u.vacant_count}v)</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className={`w-16 h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div
                              className={`h-2 rounded-full ${occPct >= 85 ? 'bg-emerald-500' : occPct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(occPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${text}`}>{occPct}%</span>
                        </div>
                        <Badge signal={u.occ_signal} map={OCC_COLORS} />
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${text}`}>${u.street_rate?.toFixed(0) ?? '—'}</td>
                      <td className={`px-3 py-3 text-right font-mono ${
                        (u.actual_avg_rate || 0) >= (u.street_rate || 0) ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        ${u.actual_avg_rate?.toFixed(0) ?? '—'}
                        {u.rate_capture_pct && (
                          <span className={`text-xs ml-1 ${sub}`}>({u.rate_capture_pct}%)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge signal={u.rate_signal} map={RATE_COLORS} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {u.vacant_lost_monthly > 0 ? (
                          <div>
                            <span className="text-red-500 font-medium">{money(u.vacant_lost_monthly)}</span>
                            <div className={`text-xs ${sub}`}>{money(u.vacant_lost_annual)}/yr</div>
                          </div>
                        ) : (
                          <span className={sub}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.ecri_eligible > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {u.ecri_eligible}
                          </span>
                        ) : (
                          <span className={sub}>—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs max-w-[200px] ${text}`}>
                        <div className="flex items-start gap-1.5">
                          {u.action.includes('Raise') || u.action.includes('ECRI') ? (
                            <Zap size={12} className="text-amber-500 mt-0.5 shrink-0" />
                          ) : u.action.includes('Strong') ? (
                            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          ) : u.action.includes('Lower') || u.action.includes('promotion') ? (
                            <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                          ) : (
                            <Minus size={12} className={`${sub} mt-0.5 shrink-0`} />
                          )}
                          {u.action}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className={darkMode ? 'bg-slate-800/80 border-t border-slate-600' : 'bg-slate-50 border-t border-slate-300'}>
                  <td className={`px-4 py-3 font-bold ${text}`}>TOTALS</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold ${text}`}>{units.reduce((s, u) => s + u.occupied_count, 0)}</span>
                    <span className={sub}>/{units.reduce((s, u) => s + u.total_count, 0)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-bold ${text}`}>
                      {units.reduce((s, u) => s + u.total_count, 0) > 0
                        ? Math.round(units.reduce((s, u) => s + u.occupied_count, 0) / units.reduce((s, u) => s + u.total_count, 0) * 100)
                        : 0}%
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${text}`}>{money(s.total_gross_potential)}</td>
                  <td className={`px-3 py-3 text-right font-bold text-emerald-600`}>{money(s.total_actual_revenue)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-medium ${sub}`}>{pct(s.revenue_capture_pct)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-red-500 font-bold">{money(s.total_lost_revenue)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-blue-600">{s.ecri_eligible_count}</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══ LOST REVENUE BREAKDOWN ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button onClick={() => toggle('lost')} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <PiggyBank size={18} className="text-red-500" />
            <div>
              <h3 className={`font-semibold ${text}`}>Lost Revenue Calculator</h3>
              <p className={`text-xs ${sub}`}>
                {money(s.total_lost_revenue)}/mo · {money(s.total_lost_revenue * 12)}/yr bleeding from vacancy
              </p>
            </div>
          </div>
          {expandedSection === 'lost' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'lost' && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
            {/* Visual breakdown */}
            <div className="space-y-3">
              {units
                .filter(u => u.vacant_count > 0)
                .sort((a, b) => b.vacant_lost_monthly - a.vacant_lost_monthly)
                .map((u, i) => {
                  const pctOfTotal = s.total_lost_revenue > 0 ? (u.vacant_lost_monthly / s.total_lost_revenue * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${text}`}>{u.unit_type}</span>
                          <span className={`text-xs ${sub}`}>{u.vacant_count} vacant × ${u.street_rate?.toFixed(0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-red-500">{money(u.vacant_lost_monthly)}/mo</span>
                          <span className={`text-xs ml-2 ${sub}`}>{money(u.vacant_lost_annual)}/yr</span>
                        </div>
                      </div>
                      <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400"
                          style={{ width: `${Math.min(pctOfTotal, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Summary callout */}
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className={`text-sm font-semibold ${text}`}>
                    {units.reduce((s, u) => s + u.vacant_count, 0)} vacant units are costing {money(s.total_lost_revenue)}/month ({money(s.total_lost_revenue * 12)}/year)
                  </p>
                  <p className={`text-xs mt-1 ${sub}`}>
                    Filling just {Math.ceil(units.reduce((s, u) => s + u.vacant_count, 0) * 0.25)} units would recover ~{money(s.total_lost_revenue * 0.25)}/mo.
                    {s.ecri_eligible_count > 0 && ` Combined with ECRI on ${s.ecri_eligible_count} tenants (+${money(s.ecri_monthly_lift)}/mo), total recovery potential: ${money(s.total_lost_revenue * 0.25 + s.ecri_monthly_lift)}/mo.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ECRI RECOMMENDATION ENGINE ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button onClick={() => toggle('ecri')} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-blue-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>ECRI Recommendations</h3>
              <p className={`text-xs ${sub}`}>
                {ecri_tenants.length > 0
                  ? `${ecri_tenants.length} tenants eligible · +${money(s.ecri_monthly_lift)}/mo potential lift`
                  : 'Import Rent Rates by Tenant report to power ECRI analysis'}
              </p>
            </div>
          </div>
          {expandedSection === 'ecri' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'ecri' && ecri_tenants.length > 0 && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* ECRI summary */}
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Eligible Tenants</p>
                  <p className="text-xl font-bold text-blue-600">{ecri_tenants.length}</p>
                </div>
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Monthly Lift</p>
                  <p className="text-xl font-bold text-emerald-600">{money(s.ecri_monthly_lift)}</p>
                </div>
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Annual Lift</p>
                  <p className="text-xl font-bold text-emerald-600">{money(s.ecri_annual_lift)}</p>
                </div>
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Avg Tenure</p>
                  <p className={`text-xl font-bold ${text}`}>
                    {Math.round(ecri_tenants.reduce((s, t) => s + (t.days_as_tenant || 0), 0) / ecri_tenants.length / 30)}mo
                  </p>
                </div>
              </div>
            </div>

            {/* Sort controls */}
            <div className={`px-4 pb-2 flex gap-2`}>
              <span className={`text-xs ${sub} self-center`}>Sort by:</span>
              {(['lift', 'variance', 'days'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setEcriSort(s)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    ecriSort === s
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {s === 'lift' ? 'Revenue Lift' : s === 'variance' ? 'Underpaying' : 'Tenure'}
                </button>
              ))}
            </div>

            {/* ECRI tenant table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <th className={`text-left px-4 py-2 font-medium ${sub}`}>Unit</th>
                    <th className={`text-left px-3 py-2 font-medium ${sub}`}>Tenant</th>
                    <th className={`text-center px-3 py-2 font-medium ${sub}`}>Tenure</th>
                    <th className={`text-right px-3 py-2 font-medium ${sub}`}>Street</th>
                    <th className={`text-right px-3 py-2 font-medium ${sub}`}>Paying</th>
                    <th className={`text-right px-3 py-2 font-medium ${sub}`}>Gap</th>
                    <th className={`text-right px-3 py-2 font-medium ${sub}`}>Suggested</th>
                    <th className={`text-right px-4 py-2 font-medium ${sub}`}>Monthly Lift</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {sortedEcri.map((t, i) => (
                    <tr key={i} className={rowHover}>
                      <td className={`px-4 py-2 font-medium ${text}`}>{t.unit}</td>
                      <td className={`px-3 py-2 ${text}`}>{t.tenant_name}</td>
                      <td className={`px-3 py-2 text-center ${sub}`}>
                        {Math.round((t.days_as_tenant || 0) / 30)}mo
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${sub}`}>${t.standard_rate?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-500">${t.actual_rate?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-500">
                        -${Math.abs(t.rate_variance || 0).toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-blue-600">${t.ecri_suggested?.toFixed(0)}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-600">+${t.ecri_revenue_lift?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {expandedSection === 'ecri' && ecri_tenants.length === 0 && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-6 text-center`}>
            <Users className={`mx-auto mb-2 ${sub}`} size={32} />
            <p className={`text-sm ${text}`}>No ECRI data available</p>
            <p className={`text-xs mt-1 ${sub}`}>Upload a "Rent Rates by Tenant" CSV from storEDGE to see tenant-level rate analysis</p>
          </div>
        )}
      </div>

      {/* ═══ RATE VARIANCE HEATMAP ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button onClick={() => toggle('rates')} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-purple-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Rate Variance Heatmap</h3>
              <p className={`text-xs ${sub}`}>
                {rate_distribution.above.length + rate_distribution.below.length > 0
                  ? `${rate_distribution.above.length} above street · ${rate_distribution.below.length} below street`
                  : 'Import Rent Rates report to see tenant-level rate positioning'}
              </p>
            </div>
          </div>
          {expandedSection === 'rates' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'rates' && (rate_distribution.above.length > 0 || rate_distribution.below.length > 0) && (
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
            {/* Visual distribution */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium ${sub}`}>Rate Distribution</span>
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {rate_distribution.below.length > 0 && (
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center"
                    style={{ width: `${(rate_distribution.below.length / s.total_tenants_rated) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white">{rate_distribution.below.length}</span>
                  </div>
                )}
                {s.tenants_at_street > 0 && (
                  <div
                    className={`${darkMode ? 'bg-slate-600' : 'bg-slate-300'} flex items-center justify-center`}
                    style={{ width: `${(s.tenants_at_street / s.total_tenants_rated) * 100}%` }}
                  >
                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{s.tenants_at_street}</span>
                  </div>
                )}
                {rate_distribution.above.length > 0 && (
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center"
                    style={{ width: `${(rate_distribution.above.length / s.total_tenants_rated) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white">{rate_distribution.above.length}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-red-500">Below Street</span>
                <span className={`text-xs ${sub}`}>At Street</span>
                <span className="text-xs text-emerald-600">Above Street</span>
              </div>
            </div>

            {/* Top underpaying tenants */}
            {rate_distribution.below.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold mb-2 ${text}`}>
                  Largest Gaps (Below Street Rate)
                </h4>
                <div className="space-y-1.5">
                  {rate_distribution.below
                    .sort((a, b) => a.variance - b.variance)
                    .slice(0, 15)
                    .map((t, i) => {
                      const maxVar = Math.abs(rate_distribution.below[0]?.variance || 1)
                      const barW = Math.abs(t.variance) / maxVar * 100
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-xs w-24 truncate ${text}`}>{t.unit}</span>
                          <span className={`text-xs w-32 truncate ${sub}`}>{t.tenant}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className={`flex-1 h-4 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                              <div
                                className={`h-4 rounded ${t.ecri ? 'bg-gradient-to-r from-red-500 to-blue-500' : 'bg-red-400'}`}
                                style={{ width: `${barW}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-red-500 w-12 text-right">-${Math.abs(t.variance).toFixed(0)}</span>
                          </div>
                          {t.ecri && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">ECRI</span>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Top overpaying tenants */}
            {rate_distribution.above.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-semibold mb-2 ${text}`}>
                  Highest Premium Tenants (Above Street Rate)
                </h4>
                <div className="space-y-1.5">
                  {rate_distribution.above
                    .sort((a, b) => b.variance - a.variance)
                    .slice(0, 10)
                    .map((t, i) => {
                      const maxVar = rate_distribution.above[0]?.variance || 1
                      const barW = t.variance / maxVar * 100
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-xs w-24 truncate ${text}`}>{t.unit}</span>
                          <span className={`text-xs w-32 truncate ${sub}`}>{t.tenant}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className={`flex-1 h-4 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                              <div className="h-4 rounded bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${barW}%` }} />
                            </div>
                            <span className="text-xs font-mono text-emerald-600 w-12 text-right">+${t.variance.toFixed(0)}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ REVENUE TREND ═══ */}
      {revenue_history.length > 0 && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('trend')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <TrendingUp size={18} className="text-indigo-600" />
              <div>
                <h3 className={`font-semibold ${text}`}>Revenue Trend</h3>
                <p className={`text-xs ${sub}`}>{revenue_history.length} months of history</p>
              </div>
            </div>
            {expandedSection === 'trend' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
          </button>

          {expandedSection === 'trend' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-40 mb-3">
                {revenue_history.map((m, i) => {
                  const h = maxRevenue > 0 ? (m.revenue / maxRevenue * 100) : 0
                  const isLatest = i === revenue_history.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full relative">
                        <div
                          className={`w-full rounded-t transition-colors ${
                            isLatest ? 'bg-emerald-500' : darkMode ? 'bg-indigo-600/60 group-hover:bg-indigo-500' : 'bg-indigo-400/60 group-hover:bg-indigo-500'
                          }`}
                          style={{ height: `${Math.max(h, 2)}%`, minHeight: '2px' }}
                        />
                      </div>
                      {/* Tooltip */}
                      <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap ${darkMode ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-white'}`}>
                        {m.month.slice(0, 3)} {m.year}: {money(m.revenue)}
                        <br />↑{m.move_ins} ↓{m.move_outs}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* X-axis labels (every 3rd month) */}
              <div className="flex gap-1">
                {revenue_history.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    {i % 3 === 0 && (
                      <span className={`text-[9px] ${sub}`}>{m.month.slice(0, 3)} '{String(m.year).slice(2)}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Move-in/out trend */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Total Move-Ins (shown period)</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {revenue_history.reduce((s, m) => s + (m.move_ins || 0), 0)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-xs font-medium ${sub}`}>Total Move-Outs (shown period)</p>
                  <p className="text-lg font-bold text-red-500">
                    {revenue_history.reduce((s, m) => s + (m.move_outs || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ═══ FACILITY HEALTH SCORE ═══ */}
      {health && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('health')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <Activity size={18} className={health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'} />
              <div>
                <h3 className={`font-semibold ${text}`}>Facility Health Score</h3>
                <p className={`text-xs ${sub}`}>Composite score across 5 key dimensions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-black ${health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {health.overall}
              </div>
              {expandedSection === 'health' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
            </div>
          </button>

          {expandedSection === 'health' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-5`}>
              {/* Big gauge */}
              <div className="flex justify-center">
                <div className="relative w-48 h-24 overflow-hidden">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Background arc */}
                    <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke={darkMode ? '#334155' : '#e2e8f0'} strokeWidth="12" strokeLinecap="round" />
                    {/* Score arc */}
                    <path
                      d="M 20 95 A 80 80 0 0 1 180 95"
                      fill="none"
                      stroke={health.overall >= 75 ? '#10b981' : health.overall >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${health.overall * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className={`text-4xl font-black ${health.overall >= 75 ? 'text-emerald-600' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {health.overall}
                    </span>
                    <span className={`text-sm ml-1 mb-1 ${sub}`}>/100</span>
                  </div>
                </div>
              </div>

              {/* Component breakdowns */}
              <div className="space-y-3">
                {[
                  { label: 'Physical Occupancy', data: health.occupancy, detail: `${health.occupancy.value.toFixed(1)}% occupied`, icon: <Users size={14} /> },
                  { label: 'Rate Capture', data: health.rate_capture, detail: `${health.rate_capture.value.toFixed(1)}% of potential`, icon: <Target size={14} /> },
                  { label: 'Rate Optimization', data: health.rate_optimization, detail: `${health.rate_optimization.value} ECRI eligible`, icon: <TrendingUp size={14} /> },
                  { label: 'Collections Health', data: health.delinquency, detail: money(health.delinquency.value) + ' outstanding', icon: <ShieldAlert size={14} /> },
                  { label: 'Revenue Trend', data: health.trend, detail: health.trend.value != null ? `${health.trend.value > 0 ? '+' : ''}${health.trend.value}% MoM` : 'No history', icon: <TrendingUp size={14} /> },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={item.data.score >= 75 ? 'text-emerald-500' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}>{item.icon}</span>
                        <span className={`text-sm font-medium ${text}`}>{item.label}</span>
                        <span className={`text-xs ${sub}`}>({item.data.weight}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${sub}`}>{item.detail}</span>
                        <span className={`text-sm font-bold ${item.data.score >= 75 ? 'text-emerald-600' : item.data.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {item.data.score}
                        </span>
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div
                        className={`h-2 rounded-full transition-all ${item.data.score >= 75 ? 'bg-emerald-500' : item.data.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${item.data.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ REVENUE WATERFALL ═══ */}
      {waterfall && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('waterfall')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <Droplets size={18} className="text-cyan-600" />
              <div>
                <h3 className={`font-semibold ${text}`}>Revenue Waterfall</h3>
                <p className={`text-xs ${sub}`}>Where your potential revenue goes</p>
              </div>
            </div>
            {expandedSection === 'waterfall' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
          </button>

          {expandedSection === 'waterfall' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
              {(() => {
                const maxVal = waterfall.gross_potential || 1
                const steps = [
                  { label: 'Gross Potential', value: waterfall.gross_potential, color: 'bg-blue-500', type: 'total' as const },
                  { label: 'Vacancy Loss', value: -waterfall.vacancy_loss, color: 'bg-red-400', type: 'loss' as const },
                  { label: 'Rate Gap (Below Street)', value: -waterfall.rate_gap_loss, color: 'bg-amber-400', type: 'loss' as const },
                  { label: 'Delinquency', value: -waterfall.delinquency_loss, color: 'bg-orange-400', type: 'loss' as const },
                  { label: 'Actual Collected', value: waterfall.actual_collected, color: 'bg-emerald-500', type: 'total' as const },
                ]

                let running = waterfall.gross_potential
                return (
                  <div className="space-y-3">
                    {steps.map((step, i) => {
                      const barWidth = Math.abs(step.value) / maxVal * 100
                      const isLoss = step.type === 'loss'
                      const offset = isLoss ? ((running + step.value) / maxVal * 100) : 0
                      if (isLoss) running += step.value

                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${text}`}>{step.label}</span>
                            <span className={`text-sm font-bold ${isLoss ? 'text-red-500' : i === steps.length - 1 ? 'text-emerald-600' : text}`}>
                              {isLoss ? '-' : ''}{money(Math.abs(step.value))}
                            </span>
                          </div>
                          <div className={`w-full h-6 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} relative`}>
                            <div
                              className={`h-6 rounded ${step.color} transition-all`}
                              style={{
                                width: `${barWidth}%`,
                                marginLeft: isLoss ? `${offset}%` : '0',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {/* Leakage summary */}
                    <div className={`rounded-lg p-3 mt-2 ${darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className={`text-xs ${sub}`}>Total Leakage</p>
                          <p className="text-lg font-bold text-red-500">
                            {money(waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss)}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${sub}`}>Leakage Rate</p>
                          <p className={`text-lg font-bold ${text}`}>
                            {waterfall.gross_potential > 0
                              ? ((waterfall.vacancy_loss + waterfall.rate_gap_loss + waterfall.delinquency_loss) / waterfall.gross_potential * 100).toFixed(1)
                              : 0}%
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${sub}`}>Collection Rate</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {waterfall.gross_potential > 0 ? (waterfall.actual_collected / waterfall.gross_potential * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ SCENARIO MODELER ═══ */}
      <div className={`border rounded-xl ${card}`}>
        <button onClick={() => toggle('scenario')} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={18} className="text-violet-600" />
            <div>
              <h3 className={`font-semibold ${text}`}>Revenue Scenario Modeler</h3>
              <p className={`text-xs ${sub}`}>What-if analysis — model revenue impact of actions</p>
            </div>
          </div>
          {expandedSection === 'scenario' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
        </button>

        {expandedSection === 'scenario' && (
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
                        onChange={e => setScenVacancyFill(Number(e.target.value))}
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
                        onChange={e => setScenRateIncrease(Number(e.target.value))}
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
                        onChange={e => setScenEcriApply(Number(e.target.value))}
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

      {/* ═══ REVENUE PER SQFT ═══ */}
      {sqft_analysis.length > 0 && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('sqft')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <Maximize2 size={18} className="text-orange-600" />
              <div>
                <h3 className={`font-semibold ${text}`}>Revenue per Square Foot</h3>
                <p className={`text-xs ${sub}`}>Which unit types generate the most revenue per sqft</p>
              </div>
            </div>
            {expandedSection === 'sqft' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
          </button>

          {expandedSection === 'sqft' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
              {(() => {
                const sorted = [...sqft_analysis].sort((a, b) => b.actual_per_sqft - a.actual_per_sqft)
                const maxPerSqft = Math.max(...sorted.map(s => s.actual_per_sqft), 1)
                return (
                  <div className="space-y-3">
                    {sorted.map((u, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${text}`}>{u.unit_type}</span>
                            <span className={`text-xs ${sub}`}>{u.sqft} sqft</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className={`text-xs ${sub}`}>Street: </span>
                              <span className={`text-xs font-mono ${sub}`}>${u.street_per_sqft.toFixed(2)}/sf</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-bold ${u.actual_per_sqft >= u.street_per_sqft ? 'text-emerald-600' : 'text-amber-500'}`}>
                                ${u.actual_per_sqft.toFixed(2)}/sf
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-full h-5 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} relative overflow-hidden`}>
                          {/* Street rate marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                            style={{ left: `${(u.street_per_sqft / maxPerSqft * 100)}%` }}
                          />
                          {/* Actual bar */}
                          <div
                            className={`h-5 rounded transition-all ${
                              i === 0 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                              u.actual_per_sqft >= u.street_per_sqft ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${(u.actual_per_sqft / maxPerSqft * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-400" />
                        <span className={`text-xs ${sub}`}>Above street $/sf</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        <span className={`text-xs ${sub}`}>Below street $/sf</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-0.5 h-3 bg-slate-400" />
                        <span className={`text-xs ${sub}`}>Street rate line</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ SEASONAL PATTERNS ═══ */}
      {seasonal_pattern.length > 0 && seasonal_pattern.some(p => p.avg_move_ins > 0) && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('seasonal')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-yellow-500" />
              <div>
                <h3 className={`font-semibold ${text}`}>Seasonal Patterns</h3>
                <p className={`text-xs ${sub}`}>Average move-in/out activity by month (multi-year)</p>
              </div>
            </div>
            {expandedSection === 'seasonal' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
          </button>

          {expandedSection === 'seasonal' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4`}>
              {(() => {
                const maxMoveIn = Math.max(...seasonal_pattern.map(p => p.avg_move_ins), 1)
                const maxMoveOut = Math.max(...seasonal_pattern.map(p => p.avg_move_outs), 1)
                const maxActivity = Math.max(maxMoveIn, maxMoveOut)
                const seasonIcons: Record<string, React.ReactNode> = {
                  Jan: <Snowflake size={10} />, Feb: <Snowflake size={10} />, Mar: <Flower2 size={10} />,
                  Apr: <Flower2 size={10} />, May: <Flower2 size={10} />, Jun: <Sun size={10} />,
                  Jul: <Sun size={10} />, Aug: <Sun size={10} />, Sep: <Leaf size={10} />,
                  Oct: <Leaf size={10} />, Nov: <Snowflake size={10} />, Dec: <Snowflake size={10} />,
                }

                return (
                  <div className="space-y-4">
                    {/* Dual bar chart */}
                    <div className="flex items-end gap-1 h-36">
                      {seasonal_pattern.map((m, i) => {
                        const inH = (m.avg_move_ins / maxActivity * 100)
                        const outH = (m.avg_move_outs / maxActivity * 100)
                        const net = m.avg_move_ins - m.avg_move_outs
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group relative">
                            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100%' }}>
                              <div
                                className="w-[45%] rounded-t bg-emerald-500 transition-all"
                                style={{ height: `${Math.max(inH, 3)}%` }}
                              />
                              <div
                                className="w-[45%] rounded-t bg-red-400 transition-all"
                                style={{ height: `${Math.max(outH, 3)}%` }}
                              />
                            </div>
                            {/* Tooltip */}
                            <div className={`absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 rounded text-xs whitespace-nowrap ${darkMode ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-white'}`}>
                              {m.month}: ↑{m.avg_move_ins.toFixed(1)} ↓{m.avg_move_outs.toFixed(1)} (net {net >= 0 ? '+' : ''}{net.toFixed(1)})
                              <br />Avg Rev: {money(m.avg_revenue)}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Month labels */}
                    <div className="flex gap-1">
                      {seasonal_pattern.map((m, i) => (
                        <div key={i} className="flex-1 text-center">
                          <span className={`text-[10px] flex flex-col items-center gap-0.5 ${
                            (m.avg_move_ins - m.avg_move_outs) > 0 ? 'text-emerald-600' : 'text-red-400'
                          }`}>
                            {seasonIcons[m.month]}
                            {m.month}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Legend + insights */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-emerald-500" />
                          <span className={`text-xs ${sub}`}>Avg Move-Ins</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-red-400" />
                          <span className={`text-xs ${sub}`}>Avg Move-Outs</span>
                        </div>
                      </div>
                      <span className={`text-xs ${sub}`}>Based on {seasonal_pattern[0]?.years_of_data || 0} year(s) of data</span>
                    </div>

                    {/* Peak/trough callout */}
                    {(() => {
                      const peakMonth = seasonal_pattern.reduce((best, m) => m.avg_move_ins > best.avg_move_ins ? m : best)
                      const troughMonth = seasonal_pattern.reduce((best, m) => m.avg_move_ins < best.avg_move_ins && m.avg_move_ins > 0 ? m : best, seasonal_pattern[0])
                      const worstNetMonth = seasonal_pattern.reduce((best, m) => (m.avg_move_ins - m.avg_move_outs) < (best.avg_move_ins - best.avg_move_outs) ? m : best)

                      return (
                        <div className={`rounded-lg p-3 ${darkMode ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                          <p className={`text-xs ${text}`}>
                            <span className="font-semibold">📊 Insight:</span>{' '}
                            Peak move-in month is <span className="font-bold text-emerald-600">{peakMonth.month}</span> ({peakMonth.avg_move_ins.toFixed(1)} avg).
                            Slowest is <span className="font-bold text-amber-600">{troughMonth.month}</span> ({troughMonth.avg_move_ins.toFixed(1)} avg).
                            Worst net absorption is <span className="font-bold text-red-500">{worstNetMonth.month}</span> (net {(worstNetMonth.avg_move_ins - worstNetMonth.avg_move_outs).toFixed(1)}).
                            <span className="font-semibold"> Ramp ad spend in {seasonal_pattern.filter(m => m.avg_move_ins >= peakMonth.avg_move_ins * 0.8).map(m => m.month).join(', ')}.</span>
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ DELINQUENCY RISK DASHBOARD ═══ */}
      {aging && parseFloat(String(aging.total_outstanding || 0)) > 0 && (
        <div className={`border rounded-xl ${card}`}>
          <button onClick={() => toggle('delinquency')} className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-orange-600" />
              <div>
                <h3 className={`font-semibold ${text}`}>Delinquency Risk Dashboard</h3>
                <p className={`text-xs ${sub}`}>{money(parseFloat(String(aging.total_outstanding)))} outstanding across {aging.delinquent_count} accounts</p>
              </div>
            </div>
            {expandedSection === 'delinquency' ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
          </button>

          {expandedSection === 'delinquency' && (
            <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-4 space-y-4`}>
              {(() => {
                const buckets = [
                  { label: '0–30 days', value: parseFloat(String(aging.total_0_30 || 0)), color: 'bg-yellow-400', recovery: 0.95 },
                  { label: '31–60 days', value: parseFloat(String(aging.total_31_60 || 0)), color: 'bg-orange-400', recovery: 0.75 },
                  { label: '61–90 days', value: parseFloat(String(aging.total_61_90 || 0)), color: 'bg-orange-600', recovery: 0.50 },
                  { label: '91–120 days', value: parseFloat(String(aging.total_91_120 || 0)), color: 'bg-red-500', recovery: 0.25 },
                  { label: '120+ days', value: parseFloat(String(aging.total_120_plus || 0)), color: 'bg-red-700', recovery: 0.05 },
                ]
                const total = parseFloat(String(aging.total_outstanding || 0))
                const maxBucket = Math.max(...buckets.map(b => b.value), 1)
                const expectedRecovery = buckets.reduce((s, b) => s + b.value * b.recovery, 0)
                const projectedWriteOff = total - expectedRecovery

                return (
                  <>
                    {/* Aging buckets */}
                    <div className="grid grid-cols-5 gap-2">
                      {buckets.map((b, i) => (
                        <div key={i} className={`rounded-lg p-3 text-center border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <div className={`w-full h-16 rounded flex items-end justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <div
                              className={`w-3/4 rounded-t ${b.color} transition-all`}
                              style={{ height: `${(b.value / maxBucket * 100)}%`, minHeight: b.value > 0 ? '4px' : '0' }}
                            />
                          </div>
                          <p className={`text-xs font-medium mt-2 ${text}`}>{b.label}</p>
                          <p className={`text-sm font-bold ${b.value > 0 ? 'text-red-500' : sub}`}>{money(b.value)}</p>
                          <p className={`text-[10px] ${sub}`}>{(b.recovery * 100).toFixed(0)}% recovery</p>
                        </div>
                      ))}
                    </div>

                    {/* Recovery projection */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-xs font-medium ${sub}`}>Total Outstanding</p>
                        <p className="text-lg font-bold text-red-500">{money(total)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                        <p className={`text-xs font-medium ${sub}`}>Expected Recovery</p>
                        <p className="text-lg font-bold text-emerald-600">{money(expectedRecovery)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                        <p className={`text-xs font-medium ${sub}`}>Projected Write-Off</p>
                        <p className={`text-lg font-bold ${text}`}>{money(projectedWriteOff)}</p>
                      </div>
                    </div>

                    {/* Delinquency as % of revenue */}
                    <div className={`rounded-lg p-3 ${darkMode ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-orange-50 border border-orange-200'}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" />
                        <p className={`text-xs ${text}`}>
                          <span className="font-semibold">Delinquency Rate:</span>{' '}
                          {s.total_actual_revenue > 0 ? (total / s.total_actual_revenue * 100).toFixed(1) : 0}% of MRR
                          {aging.moved_out_count > 0 && (
                            <> · {aging.moved_out_count} delinquent accounts already moved out (likely write-off: {money(parseFloat(String(aging.total_120_plus || 0)))})</>
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
