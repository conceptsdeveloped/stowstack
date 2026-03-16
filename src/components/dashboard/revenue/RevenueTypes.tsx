/* ── Revenue Intelligence Types & Constants ── */

export interface UnitIntel {
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

export interface ECRITenant {
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

export interface RateDistEntry {
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

export interface RevenueMonth {
  year: number
  month: string
  revenue: number
  move_ins: number
  move_outs: number
}

export interface AgingSummary {
  delinquent_count: number
  total_0_30: number
  total_31_60: number
  total_61_90: number
  total_91_120: number
  total_120_plus: number
  total_outstanding: number
  moved_out_count: number
}

export interface IntelSummary {
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

export interface HealthBreakdown {
  overall: number
  occupancy: { score: number; weight: number; value: number }
  rate_capture: { score: number; weight: number; value: number }
  rate_optimization: { score: number; weight: number; value: number }
  delinquency: { score: number; weight: number; value: number }
  trend: { score: number; weight: number; value: number | null }
}

export interface Waterfall {
  gross_potential: number
  vacancy_loss: number
  rate_gap_loss: number
  delinquency_loss: number
  net_effective: number
  actual_collected: number
}

export interface SqftEntry {
  unit_type: string
  sqft: number
  total_sqft: number
  occupied_sqft: number
  revenue_per_sqft: number
  potential_per_sqft: number
  street_per_sqft: number
  actual_per_sqft: number
}

export interface SeasonalEntry {
  month: string
  avg_move_ins: number
  avg_move_outs: number
  avg_revenue: number
  years_of_data: number
}

export interface IntelData {
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

export const RATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  premium: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Premium' },
  above: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Above Street' },
  neutral: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', label: 'At Street' },
  below: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Below Street' },
  underpriced: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Underpriced' },
}

export const OCC_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  full: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Near Full' },
  healthy: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Healthy' },
  moderate: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Low' },
}

export function Badge({ signal, map }: { signal: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[signal] || map.neutral || { bg: 'bg-slate-100', text: 'text-slate-600', label: signal }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

export function money(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return '$' + Math.round(val).toLocaleString()
}

export function pct(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return val.toFixed(1) + '%'
}

/** Shared style props passed to all sub-components */
export interface StyleProps {
  darkMode: boolean
  card: string
  text: string
  sub: string
  rowHover: string
}
