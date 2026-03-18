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
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authErr = requireAdmin(req)
  if (authErr) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { landingPageId, startDate, endDate } = req.query || {}
    if (!landingPageId) return res.status(400).json({ error: 'Missing landingPageId' })

    // Get aggregated stats
    const stats = await query(
      `SELECT * FROM page_interaction_stats
       WHERE landing_page_id = $1
       ${startDate ? 'AND period_date >= $2' : ''}
       ${endDate ? `AND period_date <= $${startDate ? 3 : 2}` : ''}
       ORDER BY period_date DESC
       LIMIT 90`,
      [landingPageId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])].filter(Boolean)
    )

    // Get real-time data for today (from raw interactions)
    const today = new Date().toISOString().slice(0, 10)
    const todayRaw = await query(
      `SELECT
         COUNT(DISTINCT session_id)::int AS sessions,
         AVG(CASE WHEN scroll_depth IS NOT NULL THEN scroll_depth END)::int AS avg_scroll,
         AVG(CASE WHEN time_on_page > 0 THEN time_on_page END)::int AS avg_time,
         COUNT(*) FILTER (WHERE event_type = 'click')::int AS total_clicks
       FROM page_interactions
       WHERE landing_page_id = $1 AND created_at >= $2`,
      [landingPageId, today]
    )

    // Get click heatmap data (last 7 days)
    const clicks = await query(
      `SELECT x_pct, y_pct, COUNT(*)::int AS count
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'click'
       AND x_pct IS NOT NULL AND y_pct IS NOT NULL
       AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY ROUND(x_pct / 5) * 5, ROUND(y_pct / 5) * 5, x_pct, y_pct
       ORDER BY count DESC
       LIMIT 200`,
      [landingPageId]
    )

    // Get CTA performance
    const ctaClicks = await query(
      `SELECT element_id, element_text, COUNT(*)::int AS clicks
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'click'
       AND element_id IS NOT NULL
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY element_id, element_text
       ORDER BY clicks DESC
       LIMIT 20`,
      [landingPageId]
    )

    // Get section view distribution
    const sectionViews = await query(
      `SELECT section_index, COUNT(DISTINCT session_id)::int AS unique_views
       FROM page_interactions
       WHERE landing_page_id = $1 AND event_type = 'section_view'
       AND section_index IS NOT NULL
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY section_index
       ORDER BY section_index`,
      [landingPageId]
    )

    return res.json({
      success: true,
      dailyStats: stats,
      today: todayRaw[0] || { sessions: 0, avg_scroll: 0, avg_time: 0, total_clicks: 0 },
      clickHeatmap: clicks,
      ctaPerformance: ctaClicks,
      sectionViews,
    })
  } catch (err) {
    console.error('page-interaction-stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
