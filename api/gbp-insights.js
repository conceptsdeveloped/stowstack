import { query } from './_db.js'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

async function getValidToken(connection) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
  if (!connection.refresh_token) return null
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
      await query(
        `UPDATE gbp_connections SET access_token = $1, token_expires_at = $2, status = 'connected', updated_at = NOW() WHERE id = $3`,
        [data.access_token, expiresAt, connection.id]
      )
      return data.access_token
    }
  } catch (err) {
    console.error('GBP token refresh failed:', err.message)
  }
  return null
}

/** Fetch insights from the GBP Performance API and store them */
async function syncInsights(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  // Fetch last 30 days of performance data
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 30)

  const formatDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Try the newer Business Profile Performance API
  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${connection.location_id}:fetchMultiDailyMetricsTimeSeries?` +
    `dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_SEARCH&` +
    `dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_SEARCH&` +
    `dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS&` +
    `dailyRange.start_date.year=${startDate.getFullYear()}&dailyRange.start_date.month=${startDate.getMonth() + 1}&dailyRange.start_date.day=${startDate.getDate()}&` +
    `dailyRange.end_date.year=${endDate.getFullYear()}&dailyRange.end_date.month=${endDate.getMonth() + 1}&dailyRange.end_date.day=${endDate.getDate()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  let searchViews = 0, mapsViews = 0, websiteClicks = 0, directionClicks = 0, phoneCalls = 0

  if (res.ok) {
    const data = await res.json()
    const series = data.multiDailyMetricTimeSeries || []

    for (const metric of series) {
      const metricName = metric.dailyMetric
      const total = (metric.timeSeries?.datedValues || []).reduce((sum, v) => sum + (parseInt(v.value) || 0), 0)

      if (metricName?.includes('SEARCH')) searchViews += total
      else if (metricName?.includes('MAPS')) mapsViews += total
      else if (metricName === 'WEBSITE_CLICKS') websiteClicks = total
      else if (metricName === 'BUSINESS_DIRECTION_REQUESTS') directionClicks = total
      else if (metricName === 'CALL_CLICKS') phoneCalls = total
    }

    await query(
      `INSERT INTO gbp_insights (facility_id, period_start, period_end, search_views, maps_views, website_clicks, direction_clicks, phone_calls, total_searches, raw_data, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (facility_id, period_start, period_end)
       DO UPDATE SET search_views = $4, maps_views = $5, website_clicks = $6, direction_clicks = $7, phone_calls = $8, total_searches = $9, raw_data = $10, synced_at = NOW()`,
      [facilityId, formatDate(startDate), formatDate(endDate), searchViews, mapsViews, websiteClicks, directionClicks, phoneCalls, searchViews + mapsViews, JSON.stringify(data)]
    )

    return { searchViews, mapsViews, websiteClicks, directionClicks, phoneCalls }
  } else {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP Insights API error ${res.status}`)
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — return cached insights
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const insights = await query(
      `SELECT * FROM gbp_insights WHERE facility_id = $1 ORDER BY period_start DESC LIMIT 12`,
      [facilityId]
    )

    // Compute totals from latest period
    const latest = insights[0] || null
    const summary = latest ? {
      search_views: latest.search_views,
      maps_views: latest.maps_views,
      website_clicks: latest.website_clicks,
      direction_clicks: latest.direction_clicks,
      phone_calls: latest.phone_calls,
      total_impressions: latest.search_views + latest.maps_views,
      total_actions: latest.website_clicks + latest.direction_clicks + latest.phone_calls,
      period: `${latest.period_start} to ${latest.period_end}`,
    } : null

    return res.json({ insights, summary })
  }

  // POST — sync insights from GBP
  if (req.method === 'POST') {
    const { facilityId } = req.body
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const conn = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`, [facilityId])
    if (!conn.length) return res.status(400).json({ error: 'No GBP connection' })

    try {
      const result = await syncInsights(facilityId, conn[0])
      return res.json({ ok: true, ...result })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
