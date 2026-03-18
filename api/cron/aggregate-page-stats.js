import { query } from '../_db.js'

/*
  Vercel Cron: Aggregate Page Interaction Stats
  Schedule: Daily at 4am (0 4 * * *)

  Aggregates raw page_interactions from yesterday into page_interaction_stats.
  Prunes raw interactions older than 30 days.
*/

export default async function handler(req, res) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = { aggregated: 0, pruned: 0, errors: [] }

  try {
    // Yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().slice(0, 10)

    // Get distinct landing pages with interactions yesterday
    const pages = await query(
      `SELECT DISTINCT landing_page_id FROM page_interactions
       WHERE created_at >= $1 AND created_at < $1::date + INTERVAL '1 day'`,
      [dateStr]
    )

    for (const page of pages) {
      try {
        const lpId = page.landing_page_id

        // Compute aggregates
        const stats = await query(
          `SELECT
             COUNT(DISTINCT session_id)::int AS total_sessions,
             COALESCE(AVG(CASE WHEN scroll_depth IS NOT NULL THEN scroll_depth END), 0)::int AS avg_scroll_depth,
             COALESCE(AVG(CASE WHEN time_on_page > 0 THEN time_on_page END), 0)::int AS avg_time_on_page
           FROM page_interactions
           WHERE landing_page_id = $1
           AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'`,
          [lpId, dateStr]
        )

        // Click zones (clustered)
        const clicks = await query(
          `SELECT
             ROUND(x_pct / 5) * 5 AS x,
             ROUND(y_pct / 5) * 5 AS y,
             COUNT(*)::int AS count
           FROM page_interactions
           WHERE landing_page_id = $1 AND event_type = 'click'
           AND x_pct IS NOT NULL AND y_pct IS NOT NULL
           AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'
           GROUP BY ROUND(x_pct / 5) * 5, ROUND(y_pct / 5) * 5
           ORDER BY count DESC
           LIMIT 100`,
          [lpId, dateStr]
        )

        // Section views
        const sections = await query(
          `SELECT section_index, COUNT(DISTINCT session_id)::int AS views
           FROM page_interactions
           WHERE landing_page_id = $1 AND event_type = 'section_view'
           AND section_index IS NOT NULL
           AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'
           GROUP BY section_index`,
          [lpId, dateStr]
        )

        // CTA clicks
        const ctas = await query(
          `SELECT element_id, COUNT(*)::int AS clicks
           FROM page_interactions
           WHERE landing_page_id = $1 AND event_type = 'click'
           AND element_id IS NOT NULL
           AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'
           GROUP BY element_id
           ORDER BY clicks DESC
           LIMIT 20`,
          [lpId, dateStr]
        )

        // Bounce rate (sessions with only page_load event)
        const bounceData = await query(
          `SELECT
             COUNT(DISTINCT session_id)::int AS total,
             COUNT(DISTINCT session_id) FILTER (
               WHERE session_id IN (
                 SELECT session_id FROM page_interactions
                 WHERE landing_page_id = $1
                 AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'
                 GROUP BY session_id HAVING COUNT(*) = 1
               )
             )::int AS bounced
           FROM page_interactions
           WHERE landing_page_id = $1
           AND created_at >= $2 AND created_at < $2::date + INTERVAL '1 day'`,
          [lpId, dateStr]
        )

        const totalSessions = stats[0]?.total_sessions || 0
        const bounceRate = bounceData[0]?.total > 0
          ? Math.round((bounceData[0].bounced / bounceData[0].total) * 10000) / 100
          : 0

        // Upsert aggregated stats
        await query(
          `INSERT INTO page_interaction_stats
           (landing_page_id, period_date, total_sessions, avg_scroll_depth, avg_time_on_page, click_zones, section_views, cta_clicks, bounce_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (landing_page_id, period_date) DO UPDATE SET
             total_sessions = EXCLUDED.total_sessions,
             avg_scroll_depth = EXCLUDED.avg_scroll_depth,
             avg_time_on_page = EXCLUDED.avg_time_on_page,
             click_zones = EXCLUDED.click_zones,
             section_views = EXCLUDED.section_views,
             cta_clicks = EXCLUDED.cta_clicks,
             bounce_rate = EXCLUDED.bounce_rate`,
          [
            lpId,
            dateStr,
            totalSessions,
            stats[0]?.avg_scroll_depth || 0,
            stats[0]?.avg_time_on_page || 0,
            JSON.stringify(clicks.map(c => ({ x: c.x, y: c.y, count: c.count }))),
            JSON.stringify(Object.fromEntries(sections.map(s => [s.section_index, s.views]))),
            JSON.stringify(Object.fromEntries(ctas.map(c => [c.element_id, c.clicks]))),
            bounceRate,
          ]
        )

        results.aggregated++
      } catch (err) {
        results.errors.push(`${page.landing_page_id}: ${err.message}`)
      }
    }

    // Prune raw interactions older than 30 days
    const pruned = await query(
      `DELETE FROM page_interactions WHERE created_at < NOW() - INTERVAL '30 days' RETURNING id`
    )
    results.pruned = pruned.length

    return res.json({ success: true, ...results })
  } catch (err) {
    console.error('aggregate-page-stats error:', err)
    return res.status(500).json({ error: err.message, ...results })
  }
}
