/* ── Revenue Loss Calculator Types ── */

export interface LossCategory {
  label: string
  monthlyLoss: number
  annualLoss: number
  detail: string
  severity: 'critical' | 'high' | 'warning' | 'low'
  [key: string]: unknown
}

export interface UnitBreakdown {
  unitType: string
  sizeLabel?: string
  vacantCount: number
  streetRate: number
  monthlyLoss: number
}

export interface RateGapBreakdown {
  unitType: string
  yourRate: number
  streetRate: number
  gap: number
  occupiedCount: number
  monthlyGap: number
}

export interface TopCompetitor {
  name: string
  rating: number | null
  reviews: number
  distance: string | null
  website: boolean
}

export interface RecoveryTier {
  unitsFilled: number
  monthlyRecovery: number
  annualRecovery: number
}

export interface TimelineMonth {
  month: number
  vacantUnits?: number
  monthlyLoss?: number
  cumulativeLoss?: number
  unitsFilled?: number
  vacantRemaining?: number
  monthlyRevenue?: number
  stowstackCost?: number
  netGain?: number
  cumulativeNetGain?: number
}

export interface RecoveryProjection {
  stowstackPlan: string
  stowstackMonthlyFee: number
  recommendedAdSpend: number
  totalMonthlyCost: number
  projectedLeadsPerMonth: number
  projectedMoveInsPerMonth: number
  projectedMonthlyRecovery: number
  projectedAnnualRecovery: number
  projectedROAS: number
  breakevenUnits: number
  breakevenMessage: string
  timeToFirstLeads: string
  timeToFirstMoveIn: string
}

export interface RevenueLossData {
  facilityId: string
  facilityName: string
  facilityLocation: string
  calculatedAt: string
  dataSource: 'pms' | 'audit_estimate'
  totalMonthlyLoss: number
  totalAnnualLoss: number
  overallSeverity: 'critical' | 'high' | 'warning' | 'moderate'
  snapshot: {
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    occupancyPct: number
    avgRate: number
    grossPotential: number
    actualRevenue: number
  }
  categories: {
    vacancyDrag: LossCategory & { vacantUnits: number; totalUnits: number; avgRate: number; unitBreakdown: UnitBreakdown[] }
    rateGap: LossCategory & { yourAvgRate: number; marketAvgRate: number; affectedUnits: number; unitBreakdown: RateGapBreakdown[]; belowStreetCount: number; totalTenantsRated: number }
    marketingVoid: LossCategory & { estimatedSearchVolume: number; missedClicks: number; missedLeads: number; missedMoveIns: number; suggestedMonthlySpend: number; benchmarkCPL: number; population: number; renterPct: number }
    competitorCapture: LossCategory & { totalCompetitors: number; activeCompetitors: number; competitorsTotalReviews: number; yourReviews: number; yourRating: number; avgCompetitorRating: number; reviewGap: number; topCompetitors: TopCompetitor[] }
    churnBleed: LossCategory & { moveInsThisMonth: number; moveOutsThisMonth: number; netMovement: number; avgMonthlyNet: number; projectedLossUnits6mo: number; delinquencyTotal: number; delinquentTenants: number; trendMonths: number }
    discountDrag: LossCategory & { discountedTenantCount: number; activeSpecials: number; avgDiscount: number }
  }
  recovery: RecoveryProjection
  recoveryTiers: RecoveryTier[]
  inactionTimeline: TimelineMonth[]
  actionTimeline: TimelineMonth[]
  market: {
    population: number
    medianIncome: number
    renterPct: number
    competitorCount: number
    avgCompetitorRating: number
    estimatedSearchVolume: number
  }
}

/* ── Severity config ── */
export const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', label: 'CRITICAL', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', label: 'HIGH', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', label: 'WARNING', dot: 'bg-amber-500', glow: 'shadow-amber-500/20' },
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', label: 'LOW', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
  moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500', label: 'MODERATE', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
} as const

/* ── Category icons mapping ── */
export const CATEGORY_ORDER = [
  'vacancyDrag',
  'rateGap',
  'marketingVoid',
  'competitorCapture',
  'churnBleed',
  'discountDrag',
] as const

export type CategoryKey = typeof CATEGORY_ORDER[number]

export const CATEGORY_ICONS: Record<CategoryKey, { icon: string; color: string }> = {
  vacancyDrag: { icon: 'DoorOpen', color: 'text-red-500' },
  rateGap: { icon: 'TrendingDown', color: 'text-orange-500' },
  marketingVoid: { icon: 'EyeOff', color: 'text-purple-500' },
  competitorCapture: { icon: 'Shield', color: 'text-blue-500' },
  churnBleed: { icon: 'UserMinus', color: 'text-rose-500' },
  discountDrag: { icon: 'BadgePercent', color: 'text-amber-500' },
}

export function money(val: number | null | undefined) {
  if (val == null) return '$0'
  return '$' + Math.round(val).toLocaleString()
}

export function moneyK(val: number | null | undefined) {
  if (val == null) return '$0'
  if (Math.abs(val) >= 1000) return '$' + (Math.round(val / 100) / 10).toLocaleString() + 'K'
  return '$' + Math.round(val).toLocaleString()
}
