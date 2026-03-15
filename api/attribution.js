import { query, queryOne } from './_db.js'

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

/**
 * GET /api/attribution?facilityId=xxx&startDate=2026-01-01&endDate=2026-03-15
 *
 * Computes real attribution metrics by joining campaign_spend with consumer lead outcomes.
 * Returns per-campaign breakdown and facility totals.
 *
 * Auth: X-Admin-Key header or accessCode query param (for client portal).
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth — support both admin key and client access code
  const adminKey = process.env.ADMIN_SECRET || 'stowstack-admin-2024'
  const isAdmin = req.headers['x-admin-key'] === adminKey

  let facilityId = req.query.facilityId

  if (!isAdmin) {
    // Client auth: look up facility from access code
    const { accessCode } = req.query
    if (!accessCode) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const client = await queryOne(
      `SELECT facility_id FROM clients WHERE access_code = $1`,
      [accessCode]
    )
    if (!client) {
      return res.status(401).json({ error: 'Invalid access code' })
    }
    facilityId = client.facility_id
  }

  if (!facilityId) {
    return res.status(400).json({ error: 'facilityId is required' })
  }

  try {
    const { startDate, endDate } = req.query
    const start = startDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Per-campaign attribution: join spend with lead outcomes
    const campaigns = await query(
      `WITH spend AS (
        SELECT utm_campaign,
          SUM(spend) AS total_spend,
          SUM(impressions) AS total_impressions,
          SUM(clicks) AS total_clicks
        FROM campaign_spend
        WHERE facility_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY utm_campaign
      ),
      leads AS (
        SELECT utm_campaign,
          COUNT(*) FILTER (WHERE lead_status NOT IN ('partial', 'lost')) AS total_leads,
          COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS move_ins,
          COALESCE(SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in'), 0) AS total_revenue
        FROM partial_leads
        WHERE facility_id = $1 AND created_at::date BETWEEN $2 AND $3 AND lead_status != 'partial'
        GROUP BY utm_campaign
      )
      SELECT
        COALESCE(s.utm_campaign, l.utm_campaign) AS campaign,
        COALESCE(s.total_spend, 0) AS spend,
        COALESCE(s.total_impressions, 0) AS impressions,
        COALESCE(s.total_clicks, 0) AS clicks,
        COALESCE(l.total_leads, 0) AS leads,
        COALESCE(l.move_ins, 0) AS move_ins,
        COALESCE(l.total_revenue, 0) AS revenue,
        CASE WHEN COALESCE(l.total_leads, 0) > 0 THEN ROUND(COALESCE(s.total_spend, 0) / l.total_leads, 2) ELSE 0 END AS cpl,
        CASE WHEN COALESCE(l.move_ins, 0) > 0 THEN ROUND(COALESCE(s.total_spend, 0) / l.move_ins, 2) ELSE 0 END AS cost_per_move_in,
        CASE WHEN COALESCE(s.total_spend, 0) > 0 THEN ROUND((COALESCE(l.total_revenue, 0) * 12) / s.total_spend, 2) ELSE 0 END AS roas
      FROM spend s
      FULL OUTER JOIN leads l ON s.utm_campaign = l.utm_campaign
      ORDER BY COALESCE(s.total_spend, 0) DESC`,
      [facilityId, start, end]
    )

    // Facility totals
    const totals = campaigns.reduce((acc, c) => {
      acc.spend += parseFloat(c.spend) || 0
      acc.impressions += parseInt(c.impressions) || 0
      acc.clicks += parseInt(c.clicks) || 0
      acc.leads += parseInt(c.leads) || 0
      acc.move_ins += parseInt(c.move_ins) || 0
      acc.revenue += parseFloat(c.revenue) || 0
      return acc
    }, { spend: 0, impressions: 0, clicks: 0, leads: 0, move_ins: 0, revenue: 0 })

    totals.cpl = totals.leads > 0 ? Math.round((totals.spend / totals.leads) * 100) / 100 : 0
    totals.cost_per_move_in = totals.move_ins > 0 ? Math.round((totals.spend / totals.move_ins) * 100) / 100 : 0
    totals.roas = totals.spend > 0 ? Math.round(((totals.revenue * 12) / totals.spend) * 100) / 100 : 0

    // Monthly trend (for chart)
    const monthlyTrend = await query(
      `WITH monthly_spend AS (
        SELECT DATE_TRUNC('month', date)::date AS month, SUM(spend) AS spend
        FROM campaign_spend
        WHERE facility_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY DATE_TRUNC('month', date)
      ),
      monthly_leads AS (
        SELECT DATE_TRUNC('month', created_at)::date AS month,
          COUNT(*) FILTER (WHERE lead_status NOT IN ('partial', 'lost')) AS leads,
          COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS move_ins,
          COALESCE(SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in'), 0) AS revenue
        FROM partial_leads
        WHERE facility_id = $1 AND created_at::date BETWEEN $2 AND $3 AND lead_status != 'partial'
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT
        TO_CHAR(COALESCE(s.month, l.month), 'YYYY-MM') AS month,
        COALESCE(s.spend, 0) AS spend,
        COALESCE(l.leads, 0) AS leads,
        COALESCE(l.move_ins, 0) AS move_ins,
        COALESCE(l.revenue, 0) AS revenue,
        CASE WHEN COALESCE(l.leads, 0) > 0 THEN ROUND(COALESCE(s.spend, 0) / l.leads, 2) ELSE 0 END AS cpl,
        CASE WHEN COALESCE(s.spend, 0) > 0 THEN ROUND((COALESCE(l.revenue, 0) * 12) / s.spend, 2) ELSE 0 END AS roas
      FROM monthly_spend s
      FULL OUTER JOIN monthly_leads l ON s.month = l.month
      ORDER BY COALESCE(s.month, l.month)`,
      [facilityId, start, end]
    )

    return res.status(200).json({
      campaigns,
      totals,
      monthlyTrend,
      dateRange: { start, end },
      hasData: campaigns.length > 0,
    })
  } catch (err) {
    console.error('Attribution GET error:', err)
    return res.status(500).json({ error: 'Failed to compute attribution' })
  }
}
