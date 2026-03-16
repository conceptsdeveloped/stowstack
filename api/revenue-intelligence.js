import { query } from './_db.js'
import { requireAdmin } from './_auth.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const facilityId = req.query.facilityId
  if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

  try {
    // Run all queries in parallel
    const [
      unitsRes,
      snapshotRes,
      tenantRatesRes,
      revenueHistoryRes,
      agingRes,
    ] = await Promise.all([
      // Unit mix with computed fields
      query(`
        SELECT *,
          (total_count * COALESCE(street_rate, 0)) as gross_potential,
          (occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) as actual_revenue,
          ((total_count - occupied_count) * COALESCE(street_rate, 0)) as lost_revenue,
          CASE WHEN street_rate > 0 AND actual_avg_rate > 0
            THEN ROUND((actual_avg_rate / street_rate * 100)::numeric, 1)
            ELSE NULL END as rate_capture_pct,
          CASE WHEN total_count > 0 AND street_rate > 0
            THEN ROUND((occupied_count * COALESCE(actual_avg_rate, street_rate, 0)) / (total_count * street_rate) * 100, 1)
            ELSE NULL END as economic_occupancy
        FROM facility_pms_units
        WHERE facility_id = $1
        ORDER BY sqft ASC NULLS LAST, street_rate ASC
      `, [facilityId]),

      // Latest snapshot
      query(`
        SELECT * FROM facility_pms_snapshots
        WHERE facility_id = $1
        ORDER BY snapshot_date DESC LIMIT 1
      `, [facilityId]),

      // Tenant rates for ECRI analysis
      query(`
        SELECT * FROM facility_pms_tenant_rates
        WHERE facility_id = $1
        ORDER BY rate_variance ASC
      `, [facilityId]),

      // Revenue history (last 24 months)
      query(`
        SELECT * FROM facility_pms_revenue_history
        WHERE facility_id = $1
        ORDER BY year DESC,
          CASE month
            WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
            WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
            WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
            WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
          END DESC
        LIMIT 24
      `, [facilityId]),

      // Aging summary
      query(`
        SELECT
          COUNT(*) as delinquent_count,
          SUM(bucket_0_30) as total_0_30,
          SUM(bucket_31_60) as total_31_60,
          SUM(bucket_61_90) as total_61_90,
          SUM(bucket_91_120) as total_91_120,
          SUM(bucket_120_plus) as total_120_plus,
          SUM(total) as total_outstanding,
          COUNT(CASE WHEN move_out_date IS NOT NULL THEN 1 END) as moved_out_count
        FROM facility_pms_aging
        WHERE facility_id = $1
          AND snapshot_date = (SELECT MAX(snapshot_date) FROM facility_pms_aging WHERE facility_id = $1)
      `, [facilityId]),
    ])

    const units = unitsRes.rows || []
    const snapshot = snapshotRes.rows?.[0] || null
    const tenantRates = tenantRatesRes.rows || []
    const revenueHistory = (revenueHistoryRes.rows || []).reverse() // chronological
    const agingSummary = agingRes.rows?.[0] || null

    // ── Compute aggregated intelligence ──

    // Total revenue metrics
    const totalGrossPotential = units.reduce((s, u) => s + parseFloat(u.gross_potential || 0), 0)
    const totalActualRevenue = units.reduce((s, u) => s + parseFloat(u.actual_revenue || 0), 0)
    const totalLostRevenue = units.reduce((s, u) => s + parseFloat(u.lost_revenue || 0), 0)
    const overallRevenueCapture = totalGrossPotential > 0
      ? Math.round((totalActualRevenue / totalGrossPotential) * 1000) / 10
      : 0

    // ECRI analysis
    const ecriTenants = tenantRates.filter(t => t.ecri_flag)
    const totalEcriLift = ecriTenants.reduce((s, t) => s + parseFloat(t.ecri_revenue_lift || 0), 0)
    const totalEcriAnnual = totalEcriLift * 12

    // Rate variance distribution
    const aboveStreet = tenantRates.filter(t => parseFloat(t.rate_variance) > 0)
    const atStreet = tenantRates.filter(t => parseFloat(t.rate_variance) === 0)
    const belowStreet = tenantRates.filter(t => parseFloat(t.rate_variance) < 0)

    // Revenue trend (month-over-month)
    let revenueTrend = null
    if (revenueHistory.length >= 2) {
      const recent = parseFloat(revenueHistory[revenueHistory.length - 1]?.revenue || 0)
      const prior = parseFloat(revenueHistory[revenueHistory.length - 2]?.revenue || 0)
      if (prior > 0) {
        revenueTrend = Math.round(((recent - prior) / prior) * 1000) / 10
      }
    }

    // Per-unit-type intelligence
    const unitIntel = units.map(u => {
      const streetRate = parseFloat(u.street_rate || 0)
      const avgRate = parseFloat(u.actual_avg_rate || 0)
      const totalCount = parseInt(u.total_count || 0)
      const occupied = parseInt(u.occupied_count || 0)
      const vacant = totalCount - occupied

      // Rate optimization signal
      let rateSignal = 'neutral'
      if (avgRate > streetRate * 1.15) rateSignal = 'premium'      // paying 15%+ above street
      else if (avgRate > streetRate) rateSignal = 'above'           // paying above street
      else if (avgRate < streetRate * 0.85) rateSignal = 'underpriced' // 15%+ below street
      else if (avgRate < streetRate) rateSignal = 'below'           // paying below street

      // Occupancy signal
      let occSignal = 'healthy'
      const occPct = totalCount > 0 ? (occupied / totalCount * 100) : 0
      if (occPct >= 95) occSignal = 'full'          // time to raise rates
      else if (occPct >= 85) occSignal = 'healthy'
      else if (occPct >= 70) occSignal = 'moderate'
      else occSignal = 'low'                         // need to fill

      // Action recommendation
      let action = ''
      if (occSignal === 'full' && rateSignal !== 'premium') action = 'Raise rates — near full occupancy'
      else if (occSignal === 'low' && rateSignal === 'underpriced') action = 'Run promotion to fill — already priced low'
      else if (occSignal === 'low') action = 'Lower web rate or run special to fill vacancies'
      else if (rateSignal === 'underpriced') action = 'ECRI opportunity — tenants paying well below street'
      else if (rateSignal === 'premium' && occSignal === 'healthy') action = 'Strong performance — maintain current strategy'
      else action = 'Monitor — performing within range'

      return {
        ...u,
        rate_signal: rateSignal,
        occ_signal: occSignal,
        action,
        vacant_lost_monthly: vacant * streetRate,
        vacant_lost_annual: vacant * streetRate * 12,
      }
    })

    // ── Facility Health Score (0-100) ──
    const totalUnits = units.reduce((s, u) => s + parseInt(u.total_count || 0), 0)
    const totalOccupied = units.reduce((s, u) => s + parseInt(u.occupied_count || 0), 0)
    const physicalOccPct = totalUnits > 0 ? (totalOccupied / totalUnits * 100) : 0

    // Component scores (each 0-100)
    const occScore = Math.min(physicalOccPct / 0.92 * 100, 100) // 92%+ = 100
    const rateScore = Math.min(overallRevenueCapture / 0.95 * 100, 100) // 95%+ capture = 100
    const ecriHealthScore = tenantRates.length > 0
      ? Math.max(0, 100 - (ecriTenants.length / tenantRates.length * 100 * 3)) // Penalize high ECRI %
      : 80 // Default if no tenant data
    const delinquencyScore = agingSummary && totalActualRevenue > 0
      ? Math.max(0, 100 - (parseFloat(agingSummary.total_outstanding || 0) / totalActualRevenue * 100 * 2))
      : 85 // Default
    const trendScore = revenueTrend != null
      ? Math.min(100, Math.max(0, 50 + revenueTrend * 5)) // +10% MoM = 100, -10% = 0
      : 50

    const healthScore = Math.round(
      occScore * 0.30 +        // 30% weight on occupancy
      rateScore * 0.25 +       // 25% weight on rate capture
      ecriHealthScore * 0.15 + // 15% weight on rate optimization
      delinquencyScore * 0.15 + // 15% weight on collections
      trendScore * 0.15         // 15% weight on trend
    )

    const healthBreakdown = {
      overall: healthScore,
      occupancy: { score: Math.round(occScore), weight: 30, value: physicalOccPct },
      rate_capture: { score: Math.round(rateScore), weight: 25, value: overallRevenueCapture },
      rate_optimization: { score: Math.round(ecriHealthScore), weight: 15, value: ecriTenants.length },
      delinquency: { score: Math.round(delinquencyScore), weight: 15, value: parseFloat(agingSummary?.total_outstanding || 0) },
      trend: { score: Math.round(trendScore), weight: 15, value: revenueTrend },
    }

    // ── Revenue Waterfall ──
    const totalRateGap = tenantRates.reduce((s, t) => {
      const v = parseFloat(t.rate_variance || 0)
      return v < 0 ? s + Math.abs(v) : s
    }, 0)
    const delinquencyAmount = parseFloat(agingSummary?.total_outstanding || 0)

    const waterfall = {
      gross_potential: totalGrossPotential,
      vacancy_loss: totalLostRevenue,
      rate_gap_loss: totalRateGap, // Tenants paying below street
      delinquency_loss: delinquencyAmount,
      net_effective: totalActualRevenue - delinquencyAmount,
      actual_collected: totalActualRevenue,
    }

    // ── Revenue per sqft by unit type ──
    const sqftAnalysis = unitIntel.map(u => {
      const totalSqft = parseFloat(u.sqft || 0) * parseInt(u.total_count || 0)
      const occSqft = parseFloat(u.sqft || 0) * parseInt(u.occupied_count || 0)
      return {
        unit_type: u.unit_type,
        sqft: parseFloat(u.sqft || 0),
        total_sqft: totalSqft,
        occupied_sqft: occSqft,
        revenue_per_sqft: occSqft > 0 ? Math.round(parseFloat(u.actual_revenue || 0) / occSqft * 100) / 100 : 0,
        potential_per_sqft: totalSqft > 0 ? Math.round(parseFloat(u.gross_potential || 0) / totalSqft * 100) / 100 : 0,
        street_per_sqft: parseFloat(u.sqft || 0) > 0 ? Math.round(parseFloat(u.street_rate || 0) / parseFloat(u.sqft || 0) * 100) / 100 : 0,
        actual_per_sqft: parseFloat(u.sqft || 0) > 0 && parseFloat(u.actual_avg_rate || 0) > 0 ? Math.round(parseFloat(u.actual_avg_rate || 0) / parseFloat(u.sqft || 0) * 100) / 100 : 0,
      }
    })

    // ── Seasonal move-in/out pattern (aggregated by month across years) ──
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const seasonalPattern = MONTHS.map(month => {
      const monthData = revenueHistory.filter(r => r.month === month)
      return {
        month: month.slice(0, 3),
        avg_move_ins: monthData.length > 0 ? Math.round(monthData.reduce((s, r) => s + (r.move_ins || 0), 0) / monthData.length * 10) / 10 : 0,
        avg_move_outs: monthData.length > 0 ? Math.round(monthData.reduce((s, r) => s + (r.move_outs || 0), 0) / monthData.length * 10) / 10 : 0,
        avg_revenue: monthData.length > 0 ? Math.round(monthData.reduce((s, r) => s + parseFloat(r.revenue || 0), 0) / monthData.length) : 0,
        years_of_data: monthData.length,
      }
    })

    // ── Discount analysis from tenant rates ──
    const discountedTenants = tenantRates.filter(t => parseFloat(t.discount || 0) > 0)
    const totalDiscountImpact = discountedTenants.reduce((s, t) => s + parseFloat(t.discount || 0), 0)

    return res.status(200).json({
      success: true,
      summary: {
        total_gross_potential: totalGrossPotential,
        total_actual_revenue: totalActualRevenue,
        total_lost_revenue: totalLostRevenue,
        revenue_capture_pct: overallRevenueCapture,
        revenue_trend_pct: revenueTrend,
        ecri_eligible_count: ecriTenants.length,
        ecri_monthly_lift: totalEcriLift,
        ecri_annual_lift: totalEcriAnnual,
        tenants_above_street: aboveStreet.length,
        tenants_at_street: atStreet.length,
        tenants_below_street: belowStreet.length,
        total_tenants_rated: tenantRates.length,
        total_discount_impact: totalDiscountImpact,
        discounted_tenants: discountedTenants.length,
      },
      health: healthBreakdown,
      waterfall,
      sqft_analysis: sqftAnalysis,
      seasonal_pattern: seasonalPattern,
      units: unitIntel,
      snapshot,
      ecri_tenants: ecriTenants,
      rate_distribution: {
        above: aboveStreet.map(t => ({ unit: t.unit, tenant: t.tenant_name, variance: parseFloat(t.rate_variance), actual: parseFloat(t.actual_rate), standard: parseFloat(t.standard_rate), days: t.days_as_tenant })),
        below: belowStreet.map(t => ({ unit: t.unit, tenant: t.tenant_name, variance: parseFloat(t.rate_variance), actual: parseFloat(t.actual_rate), standard: parseFloat(t.standard_rate), days: t.days_as_tenant, ecri: t.ecri_flag, suggested: parseFloat(t.ecri_suggested || 0), lift: parseFloat(t.ecri_revenue_lift || 0) })),
      },
      revenue_history: revenueHistory,
      aging: agingSummary,
    })
  } catch (err) {
    console.error('Revenue intelligence failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
