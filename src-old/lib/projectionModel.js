/**
 * Revenue decay projection model
 * Calculates 3 scenarios over 18 months based on audit data:
 *   1. Do Nothing — current trajectory continues
 *   2. Quick Wins — low-effort fixes only
 *   3. Full StowStack Plan — all recommendations implemented
 */

const MONTHS = 18
const AVG_UNIT_REVENUE = 120 // industry avg $/unit/month

// Parse occupancy range string to midpoint percentage
function parseOccupancy(str) {
  if (!str) return 75
  const match = str.match(/(\d+)[–-](\d+)/)
  if (match) return (parseInt(match[1]) + parseInt(match[2])) / 2
  const single = str.match(/(\d+)/)
  if (single) return parseInt(single[1])
  return 75
}

// Parse unit count range to midpoint
function parseUnitCount(str) {
  if (!str) return 300
  const match = str.match(/(\d[\d,]*)[–-](\d[\d,]*)/)
  if (match) return (parseInt(match[1].replace(/,/g, '')) + parseInt(match[2].replace(/,/g, ''))) / 2
  if (/1,?000/i.test(str)) return 1000
  const single = str.match(/(\d[\d,]*)/)
  if (single) return parseInt(single[1].replace(/,/g, ''))
  return 300
}

// Parse dollar strings to number
function parseDollar(str) {
  if (!str) return 0
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0
}

// Determine monthly occupancy trend from form responses
function getMonthlyDecayRate(audit) {
  const occ = audit.categories?.occupancy_momentum
  let rate = -0.5 // default: slight decline

  // Check move-in/move-out ratio from facility summary data
  // or from the analysis evidence
  if (occ?.severity === 'critical') rate = -1.5
  else if (occ?.severity === 'warning') rate = -0.8

  // Cross-reference with trend data if available in raw data
  const rawData = audit._rawCsvData || {}
  const vs6m = rawData.occupancyVs6Months || ''
  if (/significantly worse/i.test(vs6m)) rate = -2.0
  else if (/slightly worse/i.test(vs6m)) rate = -1.0
  else if (/about the same/i.test(vs6m)) rate = -0.3
  else if (/slightly better/i.test(vs6m)) rate = 0.2
  else if (/significantly better/i.test(vs6m)) rate = 0.5

  return rate
}

export function calculateProjections(audit) {
  const summary = audit.facility_summary || {}
  const revenue = audit.revenue_impact || {}

  const currentOccupancy = parseOccupancy(summary.occupancy_range)
  const totalUnits = parseUnitCount(summary.unit_count_range)
  const currentMonthlyRevenue = parseDollar(revenue.current_estimated_monthly_revenue) ||
    Math.round(currentOccupancy / 100 * totalUnits * AVG_UNIT_REVENUE)
  const potentialMonthlyRevenue = parseDollar(revenue.potential_monthly_revenue_with_fixes) ||
    Math.round(0.92 * totalUnits * AVG_UNIT_REVENUE)

  const monthlyDecayRate = getMonthlyDecayRate(audit)
  const targetOccupancy = 92 // industry benchmark

  // Count quick wins from action plan
  const actions = audit.priority_action_plan || []
  const quickWins = actions.filter(a => a.effort === 'low' || (a.effort === 'medium' && a.impact === 'high'))
  const quickWinImpactPct = Math.min(quickWins.length * 8, 40) // each quick win recovers ~8% of the gap, max 40%

  const doNothing = []
  const quickWinsScenario = []
  const fullPlan = []

  for (let m = 0; m <= MONTHS; m++) {
    // --- Do Nothing ---
    const dnOccupancy = Math.max(
      40, // floor at 40% — even bad facilities don't go to zero
      currentOccupancy + (monthlyDecayRate * m)
    )
    const dnRevenue = Math.round(dnOccupancy / 100 * totalUnits * AVG_UNIT_REVENUE)

    // --- Quick Wins ---
    let qwOccupancy
    if (m <= 2) {
      // First 2 months: decay slows by 50%
      qwOccupancy = currentOccupancy + (monthlyDecayRate * 0.5 * m)
    } else if (m <= 5) {
      // Months 3-5: stabilize
      qwOccupancy = currentOccupancy + (monthlyDecayRate * 0.5 * 2) + (0.3 * (m - 2))
    } else {
      // Months 6+: slow growth from quick wins
      const baseAfterStabilize = currentOccupancy + (monthlyDecayRate * 0.5 * 2) + (0.3 * 3)
      const gap = targetOccupancy - baseAfterStabilize
      const recoveryTarget = baseAfterStabilize + (gap * quickWinImpactPct / 100)
      const growthPerMonth = (recoveryTarget - baseAfterStabilize) / 12
      qwOccupancy = Math.min(recoveryTarget, baseAfterStabilize + growthPerMonth * (m - 5))
    }
    qwOccupancy = Math.max(40, Math.min(95, qwOccupancy))
    const qwRevenue = Math.round(qwOccupancy / 100 * totalUnits * AVG_UNIT_REVENUE)

    // --- Full Plan ---
    let fpOccupancy
    if (m <= 1) {
      // Implementation lag: slight continued decline
      fpOccupancy = currentOccupancy + (monthlyDecayRate * 0.3 * m)
    } else if (m <= 3) {
      // Months 2-3: stabilize and start turning
      const base = currentOccupancy + (monthlyDecayRate * 0.3 * 1)
      fpOccupancy = base + (1.0 * (m - 1))
    } else {
      // Months 4+: strong growth toward target
      const base = currentOccupancy + (monthlyDecayRate * 0.3) + (1.0 * 2)
      const remainingGap = targetOccupancy - base
      const monthsToTarget = 10
      const growthPerMonth = remainingGap / monthsToTarget
      fpOccupancy = Math.min(targetOccupancy, base + growthPerMonth * (m - 3))
    }
    fpOccupancy = Math.max(40, Math.min(96, fpOccupancy))
    // Full plan also includes ECRI uplift (5% rate improvement over time)
    const ecriMultiplier = 1 + Math.min(m * 0.004, 0.05) // up to 5% rate increase over time
    const fpRevenue = Math.round(fpOccupancy / 100 * totalUnits * AVG_UNIT_REVENUE * ecriMultiplier)

    doNothing.push({ month: m, occupancy: Math.round(dnOccupancy * 10) / 10, revenue: dnRevenue })
    quickWinsScenario.push({ month: m, occupancy: Math.round(qwOccupancy * 10) / 10, revenue: qwRevenue })
    fullPlan.push({ month: m, occupancy: Math.round(fpOccupancy * 10) / 10, revenue: fpRevenue })
  }

  // Calculate cumulative totals
  const cumulativeDoNothing = doNothing.reduce((sum, d) => sum + d.revenue, 0)
  const cumulativeQuickWins = quickWinsScenario.reduce((sum, d) => sum + d.revenue, 0)
  const cumulativeFullPlan = fullPlan.reduce((sum, d) => sum + d.revenue, 0)

  // 12-month totals
  const doNothing12 = doNothing.slice(0, 13).reduce((sum, d) => sum + d.revenue, 0)
  const quickWins12 = quickWinsScenario.slice(0, 13).reduce((sum, d) => sum + d.revenue, 0)
  const fullPlan12 = fullPlan.slice(0, 13).reduce((sum, d) => sum + d.revenue, 0)

  return {
    scenarios: { doNothing, quickWins: quickWinsScenario, fullPlan },
    summary: {
      currentMonthlyRevenue,
      potentialMonthlyRevenue,
      month12: {
        doNothing: doNothing12,
        quickWins: quickWins12,
        fullPlan: fullPlan12,
      },
      month18: {
        doNothing: cumulativeDoNothing,
        quickWins: cumulativeQuickWins,
        fullPlan: cumulativeFullPlan,
      },
      revenueLostDoingNothing12: fullPlan12 - doNothing12,
      revenueLostDoingNothing18: cumulativeFullPlan - cumulativeDoNothing,
      quickWinCount: quickWins.length,
    },
    meta: { currentOccupancy, totalUnits, monthlyDecayRate, targetOccupancy },
  }
}
