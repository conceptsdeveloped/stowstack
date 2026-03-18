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

// Self-storage seasonal indices (industry average)
// 1.0 = average, >1.0 = above average demand
const SEASONAL_INDEX = {
  1: 0.85,  // Jan — slow
  2: 0.88,  // Feb — slow
  3: 0.95,  // Mar — picking up
  4: 1.05,  // Apr — spring moves
  5: 1.15,  // May — peak start
  6: 1.20,  // Jun — peak
  7: 1.18,  // Jul — peak
  8: 1.12,  // Aug — college
  9: 1.02,  // Sep — tapering
  10: 0.92, // Oct — slowing
  11: 0.85, // Nov — slow
  12: 0.83, // Dec — slowest
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { facilityId } = req.query || {}
    if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })

    // Get facility info
    const facility = await query('SELECT * FROM facilities WHERE id = $1', [facilityId])
    if (facility.length === 0) return res.status(404).json({ error: 'Facility not found' })
    const fac = facility[0]

    // Get campaign data for move-in velocity
    const campaigns = await query(
      `SELECT cc.* FROM client_campaigns cc
       JOIN clients c ON cc.client_id = c.id
       WHERE c.facility_id = $1
       ORDER BY cc.month ASC`,
      [facilityId]
    )

    // Get PMS snapshots for historical occupancy
    const snapshots = await query(
      `SELECT * FROM facility_pms_snapshots
       WHERE facility_id = $1
       ORDER BY snapshot_date ASC`,
      [facilityId]
    ).catch(() => [])

    // Estimate current occupancy
    const OCCUPANCY_MID = {
      'below-60': 50, '60-75': 67.5, '75-85': 80, '85-95': 90, 'above-95': 97,
    }
    const UNIT_COUNTS = {
      'under-100': 75, '100-300': 200, '300-500': 400, '500+': 650,
    }

    const currentOccupancy = snapshots.length > 0
      ? Number(snapshots[snapshots.length - 1].occupancy_pct || 80)
      : OCCUPANCY_MID[fac.occupancy_range] || 80

    const totalUnits = snapshots.length > 0
      ? Number(snapshots[snapshots.length - 1].total_units || UNIT_COUNTS[fac.total_units] || 200)
      : UNIT_COUNTS[fac.total_units] || 200

    // Calculate average monthly move-in velocity
    const avgMoveInsPerMonth = campaigns.length > 0
      ? campaigns.reduce((s, c) => s + Number(c.move_ins || 0), 0) / campaigns.length
      : 0

    // Estimate natural churn rate (industry average: 5-8% per month)
    const monthlyChurnRate = 0.06

    // Generate 12-month forecast
    const now = new Date()
    const forecast = []
    let occupiedUnits = Math.round(totalUnits * (currentOccupancy / 100))

    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      const month = forecastDate.getMonth() + 1
      const seasonalFactor = SEASONAL_INDEX[month] || 1.0

      // Move-ins adjusted for seasonality
      const projectedMoveIns = Math.round(avgMoveInsPerMonth * seasonalFactor)

      // Move-outs (churn)
      const projectedMoveOuts = Math.round(occupiedUnits * monthlyChurnRate * (2 - seasonalFactor))

      // Net change
      const netChange = projectedMoveIns - projectedMoveOuts
      occupiedUnits = Math.max(0, Math.min(totalUnits, occupiedUnits + netChange))

      const occupancyPct = Math.round((occupiedUnits / totalUnits) * 100)
      const vacantUnits = totalUnits - occupiedUnits
      const revenueLoss = vacantUnits * 110

      forecast.push({
        month: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthNum: month,
        occupancyPct,
        occupiedUnits,
        vacantUnits,
        projectedMoveIns,
        projectedMoveOuts,
        netChange,
        revenueLoss,
        seasonalFactor,
      })
    }

    // Compute scenarios
    const withAdsOccupancy = forecast[forecast.length - 1]?.occupancyPct || currentOccupancy
    const withoutAdsForecast = []
    let noAdsOccupied = Math.round(totalUnits * (currentOccupancy / 100))
    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      const month = forecastDate.getMonth() + 1
      const seasonalFactor = SEASONAL_INDEX[month] || 1.0

      // Without ads: only organic move-ins (est. 30% of ad-driven rate)
      const organicMoveIns = Math.round(avgMoveInsPerMonth * 0.3 * seasonalFactor)
      const churnOut = Math.round(noAdsOccupied * monthlyChurnRate * (2 - seasonalFactor))

      noAdsOccupied = Math.max(0, Math.min(totalUnits, noAdsOccupied + organicMoveIns - churnOut))

      withoutAdsForecast.push({
        month: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        occupancyPct: Math.round((noAdsOccupied / totalUnits) * 100),
      })
    }

    const withoutAdsOccupancy = withoutAdsForecast[withoutAdsForecast.length - 1]?.occupancyPct || currentOccupancy

    return res.json({
      success: true,
      facilityName: fac.name,
      currentOccupancy,
      totalUnits,
      avgMoveInsPerMonth: Math.round(avgMoveInsPerMonth * 10) / 10,
      monthlyChurnRate: Math.round(monthlyChurnRate * 1000) / 10,
      forecast,
      withoutAdsForecast,
      summary: {
        currentOccupancy,
        projectedOccupancy12mo: withAdsOccupancy,
        withoutAdsOccupancy12mo: withoutAdsOccupancy,
        occupancyDelta: withAdsOccupancy - withoutAdsOccupancy,
        projectedVacantIn12mo: totalUnits - Math.round(totalUnits * withAdsOccupancy / 100),
        peakMonth: forecast.reduce((max, f) => f.occupancyPct > max.occupancyPct ? f : max, forecast[0])?.month,
        troughMonth: forecast.reduce((min, f) => f.occupancyPct < min.occupancyPct ? f : min, forecast[0])?.month,
      },
    })
  } catch (err) {
    console.error('occupancy-forecast error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
