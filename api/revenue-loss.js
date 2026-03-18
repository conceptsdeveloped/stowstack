import { query, queryOne } from './_db.js'
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

/* ── Audit form fallback mappings (same as audit-report.js) ── */
const OCCUPANCY_MID = {
  'below-60': 50, '60-75': 67.5, '75-85': 80, '85-95': 90, 'above-95': 97,
}
const UNIT_COUNTS = {
  'under-100': 75, '100-300': 200, '300-500': 400, '500+': 650,
}
const AVG_UNIT_RATE = 125

/* ── Severity thresholds ── */
function severity(annualLoss) {
  if (annualLoss >= 24000) return 'critical'
  if (annualLoss >= 12000) return 'high'
  if (annualLoss >= 4000) return 'warning'
  return 'low'
}

function overallSeverity(total) {
  if (total >= 60000) return 'critical'
  if (total >= 30000) return 'high'
  if (total >= 12000) return 'warning'
  return 'moderate'
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
    /* ── Pull all data in parallel ── */
    const [
      facilityRow,
      snapshotRows,
      unitRows,
      intelRow,
      tenantRateRows,
      revenueHistoryRows,
      agingRows,
      specialRows,
    ] = await Promise.all([
      queryOne(`SELECT * FROM facilities WHERE id = $1`, [facilityId]),
      query(`SELECT * FROM facility_pms_snapshots WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 3`, [facilityId]),
      query(`SELECT *, (total_count - occupied_count) as vacant_count,
        (total_count * COALESCE(street_rate, 0)) as gross_potential,
        ((total_count - occupied_count) * COALESCE(street_rate, 0)) as vacant_lost_monthly
        FROM facility_pms_units WHERE facility_id = $1 ORDER BY sqft ASC NULLS LAST`, [facilityId]),
      queryOne(`SELECT * FROM facility_market_intel WHERE facility_id = $1`, [facilityId]),
      query(`SELECT * FROM facility_pms_tenant_rates WHERE facility_id = $1 ORDER BY rate_variance ASC`, [facilityId]),
      query(`SELECT * FROM facility_pms_revenue_history WHERE facility_id = $1
        ORDER BY year DESC, CASE month
          WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
        END DESC LIMIT 12`, [facilityId]),
      query(`SELECT * FROM facility_pms_aging WHERE facility_id = $1 ORDER BY total DESC`, [facilityId]),
      query(`SELECT * FROM facility_pms_specials WHERE facility_id = $1 AND active = true`, [facilityId]),
    ])

    if (!facilityRow) return res.status(404).json({ error: 'Facility not found' })

    /* ── Determine data source: PMS (rich) or audit form (lean) ── */
    const hasPMS = unitRows.length > 0 && snapshotRows.length > 0
    const snapshot = snapshotRows[0] || null
    const competitors = intelRow?.competitors || []
    const demographics = intelRow?.demographics || {}

    let totalUnits, occupiedUnits, vacantUnits, occupancyPct, avgRate, grossPotential, actualRevenue

    if (hasPMS) {
      totalUnits = parseInt(snapshot.total_units || 0)
      occupiedUnits = parseInt(snapshot.occupied_units || 0)
      vacantUnits = totalUnits - occupiedUnits
      occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0
      // Weighted avg rate from unit mix
      const totalOccupied = unitRows.reduce((s, u) => s + parseInt(u.occupied_count || 0), 0)
      avgRate = totalOccupied > 0
        ? unitRows.reduce((s, u) => s + parseFloat(u.actual_avg_rate || u.street_rate || 0) * parseInt(u.occupied_count || 0), 0) / totalOccupied
        : AVG_UNIT_RATE
      grossPotential = unitRows.reduce((s, u) => s + parseFloat(u.gross_potential || 0), 0)
      actualRevenue = parseFloat(snapshot.actual_revenue || 0) ||
        unitRows.reduce((s, u) => s + parseFloat(u.occupied_count || 0) * parseFloat(u.actual_avg_rate || u.street_rate || 0), 0)
    } else {
      // Fallback to audit form data
      const occRange = facilityRow.occupancy_range || '75-85'
      occupancyPct = OCCUPANCY_MID[occRange] || 80
      totalUnits = UNIT_COUNTS[facilityRow.total_units] || 200
      occupiedUnits = Math.round(totalUnits * (occupancyPct / 100))
      vacantUnits = totalUnits - occupiedUnits
      avgRate = AVG_UNIT_RATE
      grossPotential = totalUnits * avgRate
      actualRevenue = occupiedUnits * avgRate
    }

    /* ════════════════════════════════════════════
       CATEGORY 1: VACANCY DRAG
       Empty units × avg rate = money sitting idle
    ════════════════════════════════════════════ */
    let vacancyDetail
    if (hasPMS) {
      // Per-unit-type breakdown
      const unitBreakdown = unitRows
        .filter(u => parseInt(u.vacant_count || 0) > 0)
        .map(u => ({
          unitType: u.unit_type,
          sizeLabel: u.size_label,
          vacantCount: parseInt(u.vacant_count || 0),
          streetRate: parseFloat(u.street_rate || 0),
          monthlyLoss: parseInt(u.vacant_count || 0) * parseFloat(u.street_rate || 0),
        }))
        .sort((a, b) => b.monthlyLoss - a.monthlyLoss)

      const vacancyMonthly = unitBreakdown.reduce((s, u) => s + u.monthlyLoss, 0)
      vacancyDetail = {
        label: 'Empty Units Sitting Idle',
        monthlyLoss: Math.round(vacancyMonthly),
        annualLoss: Math.round(vacancyMonthly * 12),
        vacantUnits,
        totalUnits,
        avgRate: Math.round(avgRate),
        unitBreakdown,
        detail: vacantUnits === 0
          ? 'You\'re at full occupancy — no vacancy drag. Nice.'
          : `You have ${vacantUnits} vacant units across ${unitBreakdown.length} unit types. That's $${Math.round(vacancyMonthly).toLocaleString()}/mo in potential revenue sitting empty.`,
        severity: severity(vacancyMonthly * 12),
      }
    } else {
      const vacancyMonthly = vacantUnits * avgRate
      vacancyDetail = {
        label: 'Empty Units Sitting Idle',
        monthlyLoss: Math.round(vacancyMonthly),
        annualLoss: Math.round(vacancyMonthly * 12),
        vacantUnits,
        totalUnits,
        avgRate: Math.round(avgRate),
        unitBreakdown: [],
        detail: `Estimated ${vacantUnits} vacant units at ~$${avgRate}/mo average rate. That's $${Math.round(vacancyMonthly).toLocaleString()}/mo in lost revenue.`,
        severity: severity(vacancyMonthly * 12),
      }
    }

    /* ════════════════════════════════════════════
       CATEGORY 2: RATE GAP
       Your rates vs market/competitor rates
    ════════════════════════════════════════════ */
    let rateGapMonthly = 0
    let rateGapBreakdown = []
    let yourAvgRate = Math.round(avgRate)
    let marketAvgRate = yourAvgRate

    if (hasPMS && tenantRateRows.length > 0) {
      // Use actual tenant-level rate variance data
      const belowStreet = tenantRateRows.filter(t => parseFloat(t.rate_variance || 0) < 0)
      rateGapMonthly = belowStreet.reduce((s, t) => s + Math.abs(parseFloat(t.rate_variance || 0)), 0)

      rateGapBreakdown = unitRows.map(u => {
        const streetRate = parseFloat(u.street_rate || 0)
        const actualRate = parseFloat(u.actual_avg_rate || 0)
        const gap = streetRate - actualRate
        return {
          unitType: u.unit_type,
          yourRate: Math.round(actualRate),
          streetRate: Math.round(streetRate),
          gap: Math.round(gap),
          occupiedCount: parseInt(u.occupied_count || 0),
          monthlyGap: gap > 0 ? Math.round(gap * parseInt(u.occupied_count || 0)) : 0,
        }
      }).filter(u => u.monthlyGap > 0).sort((a, b) => b.monthlyGap - a.monthlyGap)

      // Also factor in competitor rates if available
      // (competitors from market intel don't have per-unit pricing yet — that's Feature 5)
    } else if (competitors.length > 0) {
      // Rough estimate: assume 8% underpricing vs market
      rateGapMonthly = occupiedUnits * avgRate * 0.08
      marketAvgRate = Math.round(avgRate * 1.08)
    } else {
      // Conservative estimate
      rateGapMonthly = occupiedUnits * avgRate * 0.05
      marketAvgRate = Math.round(avgRate * 1.05)
    }

    const rateGapDetail = {
      label: 'Underpriced vs. Street Rate',
      monthlyLoss: Math.round(rateGapMonthly),
      annualLoss: Math.round(rateGapMonthly * 12),
      yourAvgRate,
      marketAvgRate,
      affectedUnits: rateGapBreakdown.length > 0
        ? rateGapBreakdown.reduce((s, u) => s + u.occupiedCount, 0)
        : occupiedUnits,
      unitBreakdown: rateGapBreakdown,
      belowStreetCount: tenantRateRows.filter(t => parseFloat(t.rate_variance || 0) < 0).length,
      totalTenantsRated: tenantRateRows.length,
      detail: rateGapMonthly <= 0
        ? 'Your rates are at or above street rate. No rate gap detected.'
        : hasPMS
          ? `${rateGapBreakdown.length} unit types have tenants paying below street rate. Total gap: $${Math.round(rateGapMonthly).toLocaleString()}/mo across ${rateGapBreakdown.reduce((s, u) => s + u.occupiedCount, 0)} units.`
          : `Estimated ~${Math.round((marketAvgRate - yourAvgRate) / yourAvgRate * 100)}% below market rate. Across ${occupiedUnits} occupied units, that's $${Math.round(rateGapMonthly).toLocaleString()}/mo left on the table.`,
      severity: severity(rateGapMonthly * 12),
    }

    /* ════════════════════════════════════════════
       CATEGORY 3: MARKETING VOID
       No ads = invisible to demand
    ════════════════════════════════════════════ */
    const population = parseInt(demographics.population || 0)
    const renterPct = parseFloat(demographics.renter_pct || 35) / 100
    // ~2% of population searches for storage monthly, weighted by renter %
    const estimatedSearchVolume = population > 0
      ? Math.round(population * 0.015 * (0.5 + renterPct * 0.5))
      : 2000 // default for unknown markets
    const benchmarkCTR = 0.035 // 3.5% search-to-click
    const benchmarkLeadRate = 0.08 // 8% click-to-lead
    const benchmarkCloseRate = 0.22 // 22% lead-to-move-in
    const benchmarkCPL = 35

    const missedClicks = Math.round(estimatedSearchVolume * benchmarkCTR)
    const missedLeads = Math.round(missedClicks * benchmarkLeadRate)
    const missedMoveIns = Math.round(missedLeads * benchmarkCloseRate)
    const missedMonthlyRevenue = missedMoveIns * avgRate
    // Cost to capture those move-ins
    const suggestedSpend = Math.round(missedLeads / benchmarkLeadRate * benchmarkCPL * benchmarkLeadRate)

    const marketingVoidDetail = {
      label: 'Leads You\'re Not Getting',
      monthlyLoss: Math.round(missedMonthlyRevenue),
      annualLoss: Math.round(missedMonthlyRevenue * 12),
      estimatedSearchVolume,
      missedClicks,
      missedLeads,
      missedMoveIns,
      suggestedMonthlySpend: Math.min(suggestedSpend, 3000), // cap at reasonable number
      benchmarkCPL,
      population,
      renterPct: Math.round(renterPct * 100),
      detail: `An estimated ${estimatedSearchVolume.toLocaleString()} people search for storage in your area monthly. Without ads, you're invisible to them. At industry benchmarks, that's ~${missedMoveIns} move-ins/mo you're missing — $${Math.round(missedMonthlyRevenue).toLocaleString()}/mo in revenue.`,
      severity: severity(missedMonthlyRevenue * 12),
    }

    /* ════════════════════════════════════════════
       CATEGORY 4: COMPETITOR CAPTURE
       Competitors with ads/reviews absorbing your demand
    ════════════════════════════════════════════ */
    const totalCompetitors = competitors.length
    // Proxy for "running ads": has website + high rating + many reviews
    const activeCompetitors = competitors.filter(c =>
      c.website && (c.rating >= 4.0 || c.reviewCount >= 50)
    )
    const competitorsTotalReviews = competitors.reduce((s, c) => s + (c.reviewCount || 0), 0)
    const facilityReviews = parseInt(facilityRow.review_count || 0)
    const facilityRating = parseFloat(facilityRow.google_rating || 0)
    const avgCompetitorRating = competitors.length > 0
      ? competitors.reduce((s, c) => s + (c.rating || 0), 0) / competitors.length
      : 0

    // Each active competitor captures ~1-3 units of demand/month from you
    const captureRate = activeCompetitors.length > 0
      ? Math.min(activeCompetitors.length * 1.5, vacantUnits * 0.3)
      : 0
    const competitorMonthly = Math.round(captureRate * avgRate)

    const topCompetitors = [...competitors]
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        rating: c.rating,
        reviews: c.reviewCount,
        distance: c.distance_miles ? `${Math.round(c.distance_miles * 10) / 10} mi` : null,
        website: !!c.website,
      }))

    const competitorCaptureDetail = {
      label: 'Demand Your Competitors Are Taking',
      monthlyLoss: competitorMonthly,
      annualLoss: competitorMonthly * 12,
      totalCompetitors,
      activeCompetitors: activeCompetitors.length,
      competitorsTotalReviews,
      yourReviews: facilityReviews,
      yourRating: facilityRating,
      avgCompetitorRating: Math.round(avgCompetitorRating * 10) / 10,
      reviewGap: competitorsTotalReviews - facilityReviews,
      topCompetitors,
      detail: totalCompetitors === 0
        ? 'No competitor data available. Run a market scan to see who\'s capturing demand in your area.'
        : `${activeCompetitors.length} of ${totalCompetitors} competitors within range are actively marketing. They have ${competitorsTotalReviews.toLocaleString()} combined reviews vs. your ${facilityReviews}. They're capturing demand you're not competing for.`,
      severity: severity(competitorMonthly * 12),
    }

    /* ════════════════════════════════════════════
       CATEGORY 5: CHURN BLEED
       Net move-out trend projected forward
    ════════════════════════════════════════════ */
    const moveIns = parseInt(snapshot?.move_ins_mtd || 0)
    const moveOuts = parseInt(snapshot?.move_outs_mtd || 0)
    const netMovement = moveIns - moveOuts

    // Check multi-month trend if available
    let trendMonths = 0
    let trendNetTotal = 0
    if (snapshotRows.length >= 2) {
      snapshotRows.forEach(s => {
        const mi = parseInt(s.move_ins_mtd || 0)
        const mo = parseInt(s.move_outs_mtd || 0)
        trendNetTotal += (mi - mo)
        trendMonths++
      })
    }
    const avgMonthlyNet = trendMonths > 0 ? trendNetTotal / trendMonths : netMovement

    let churnMonthly = 0
    let projectedLoss6mo = 0
    if (avgMonthlyNet < 0) {
      projectedLoss6mo = Math.round(Math.abs(avgMonthlyNet) * 6)
      churnMonthly = Math.round(Math.abs(avgMonthlyNet) * avgRate)
    }

    // Delinquency add-on
    const delinquencyTotal = agingRows.reduce((s, a) => s + parseFloat(a.total || 0), 0)
    const delinquencyMonthly = Math.round(delinquencyTotal * 0.4) // ~40% of delinquent revenue is effectively lost

    const totalChurnMonthly = churnMonthly + delinquencyMonthly

    const churnBleedDetail = {
      label: 'Churn & Delinquency Bleed',
      monthlyLoss: totalChurnMonthly,
      annualLoss: totalChurnMonthly * 12,
      moveInsThisMonth: moveIns,
      moveOutsThisMonth: moveOuts,
      netMovement,
      avgMonthlyNet: Math.round(avgMonthlyNet * 10) / 10,
      projectedLossUnits6mo: projectedLoss6mo,
      delinquencyTotal: Math.round(delinquencyTotal),
      delinquentTenants: agingRows.length,
      trendMonths,
      detail: totalChurnMonthly <= 0
        ? 'Positive move-in trend and minimal delinquency. Your retention is solid.'
        : netMovement < 0
          ? `${moveOuts} move-outs vs ${moveIns} move-ins this month (net ${netMovement}). At this pace, you'll lose ${projectedLoss6mo} more units in 6 months. ${delinquencyTotal > 0 ? `Plus $${Math.round(delinquencyTotal).toLocaleString()} in outstanding delinquent rent.` : ''}`
          : `Move-in trend is flat/positive, but $${Math.round(delinquencyTotal).toLocaleString()} in delinquent rent across ${agingRows.length} tenants is dragging revenue.`,
      severity: severity(totalChurnMonthly * 12),
    }

    /* ════════════════════════════════════════════
       CATEGORY 6: DISCOUNT DRAG (bonus category)
       Active specials eroding rate integrity
    ════════════════════════════════════════════ */
    const discountedTenants = tenantRateRows.filter(t => parseFloat(t.discount || 0) > 0)
    const totalDiscountImpact = discountedTenants.reduce((s, t) => s + Math.abs(parseFloat(t.discount || 0)), 0)
    const activeSpecials = specialRows.length

    const discountDragDetail = {
      label: 'Discount & Promotion Drag',
      monthlyLoss: Math.round(totalDiscountImpact),
      annualLoss: Math.round(totalDiscountImpact * 12),
      discountedTenantCount: discountedTenants.length,
      activeSpecials,
      avgDiscount: discountedTenants.length > 0
        ? Math.round(totalDiscountImpact / discountedTenants.length)
        : 0,
      detail: totalDiscountImpact <= 0
        ? 'No significant discount drag. All tenants are at or near street rate.'
        : `${discountedTenants.length} tenants are on discounted rates, costing $${Math.round(totalDiscountImpact).toLocaleString()}/mo. ${activeSpecials} active specials running. Consider sunsetting old promotions for established tenants.`,
      severity: severity(totalDiscountImpact * 12),
    }

    /* ════════════════════════════════════════════
       TOTALS & RECOVERY PROJECTION
    ════════════════════════════════════════════ */
    const categories = {
      vacancyDrag: vacancyDetail,
      rateGap: rateGapDetail,
      marketingVoid: marketingVoidDetail,
      competitorCapture: competitorCaptureDetail,
      churnBleed: churnBleedDetail,
      discountDrag: discountDragDetail,
    }

    const totalMonthlyLoss = Object.values(categories).reduce((s, c) => s + c.monthlyLoss, 0)
    const totalAnnualLoss = totalMonthlyLoss * 12

    // Recovery projection with StowStack
    const stowstackMonthlyFee = 999 // Growth plan
    const projectedCPL = benchmarkCPL
    const recommendedSpend = Math.max(1000, Math.min(3000, Math.round(totalMonthlyLoss * 0.15)))
    const projectedLeads = Math.round(recommendedSpend / projectedCPL)
    const projectedMoveIns = Math.round(projectedLeads * benchmarkCloseRate)
    const projectedMonthlyRecovery = projectedMoveIns * avgRate
    const projectedAnnualRecovery = projectedMonthlyRecovery * 12
    const projectedROAS = (stowstackMonthlyFee + recommendedSpend) > 0
      ? Math.round((projectedMonthlyRecovery / (stowstackMonthlyFee + recommendedSpend)) * 10) / 10
      : 0
    const breakevenUnits = avgRate > 0 ? Math.round((stowstackMonthlyFee / avgRate) * 10) / 10 : 0

    // What-if recovery tiers
    const recoveryTiers = [1, 3, 5, 10, 15, 20].filter(n => n <= vacantUnits).map(n => ({
      unitsFilled: n,
      monthlyRecovery: n * avgRate,
      annualRecovery: n * avgRate * 12,
    }))

    // 12-month inaction projection
    const inactionTimeline = []
    let runningVacant = vacantUnits
    let runningLoss = totalMonthlyLoss
    for (let m = 1; m <= 12; m++) {
      // Each month without action, lose ~0.5-1 more units on average
      const additionalLoss = avgMonthlyNet < 0 ? Math.abs(avgMonthlyNet) : 0.5
      runningVacant = Math.min(totalUnits, Math.round(runningVacant + additionalLoss))
      runningLoss = runningVacant * avgRate + rateGapMonthly + competitorMonthly + delinquencyMonthly
      inactionTimeline.push({
        month: m,
        vacantUnits: runningVacant,
        monthlyLoss: Math.round(runningLoss),
        cumulativeLoss: Math.round(runningLoss * m),
      })
    }

    // With StowStack timeline
    const actionTimeline = []
    let recoveredUnits = 0
    for (let m = 1; m <= 12; m++) {
      // Ramp: month 1-2 = setup/learning, month 3+ = steady fills
      const fillsThisMonth = m <= 1 ? 0 : m <= 2 ? Math.round(projectedMoveIns * 0.5) : projectedMoveIns
      recoveredUnits = Math.min(vacantUnits, recoveredUnits + fillsThisMonth)
      const currentVacant = Math.max(0, vacantUnits - recoveredUnits)
      const currentMonthlyLoss = currentVacant * avgRate
      const stowstackCost = stowstackMonthlyFee + recommendedSpend
      const netGain = (recoveredUnits * avgRate) - stowstackCost
      actionTimeline.push({
        month: m,
        unitsFilled: recoveredUnits,
        vacantRemaining: currentVacant,
        monthlyRevenue: Math.round(recoveredUnits * avgRate),
        stowstackCost,
        netGain: Math.round(netGain),
        cumulativeNetGain: Math.round(netGain * m - stowstackCost * Math.max(0, m - recoveredUnits > 0 ? 0 : m)),
      })
    }

    return res.status(200).json({
      facilityId,
      facilityName: facilityRow.name,
      facilityLocation: facilityRow.location,
      calculatedAt: new Date().toISOString(),
      dataSource: hasPMS ? 'pms' : 'audit_estimate',

      // The big number
      totalMonthlyLoss: Math.round(totalMonthlyLoss),
      totalAnnualLoss: Math.round(totalAnnualLoss),
      overallSeverity: overallSeverity(totalAnnualLoss),

      // Facility snapshot
      snapshot: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyPct,
        avgRate: Math.round(avgRate),
        grossPotential: Math.round(grossPotential),
        actualRevenue: Math.round(actualRevenue),
      },

      // 6 loss categories
      categories,

      // Recovery projection
      recovery: {
        stowstackPlan: 'Growth',
        stowstackMonthlyFee,
        recommendedAdSpend: recommendedSpend,
        totalMonthlyCost: stowstackMonthlyFee + recommendedSpend,
        projectedLeadsPerMonth: projectedLeads,
        projectedMoveInsPerMonth: projectedMoveIns,
        projectedMonthlyRecovery: Math.round(projectedMonthlyRecovery),
        projectedAnnualRecovery: Math.round(projectedAnnualRecovery),
        projectedROAS,
        breakevenUnits,
        breakevenMessage: `You need ${breakevenUnits} move-ins per month to cover StowStack. We project ${projectedMoveIns}.`,
        timeToFirstLeads: '7 days',
        timeToFirstMoveIn: '14-21 days',
      },

      // What-if data
      recoveryTiers,

      // 12-month projections
      inactionTimeline,
      actionTimeline,

      // Market context
      market: {
        population: parseInt(demographics.population || 0),
        medianIncome: parseInt(demographics.median_income || 0),
        renterPct: Math.round(parseFloat(demographics.renter_pct || 0)),
        competitorCount: totalCompetitors,
        avgCompetitorRating: Math.round(avgCompetitorRating * 10) / 10,
        estimatedSearchVolume,
      },
    })
  } catch (err) {
    console.error('Revenue loss calculation error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
