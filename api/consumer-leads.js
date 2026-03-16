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
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

const VALID_STATUSES = ['new', 'contacted', 'toured', 'reserved', 'moved_in', 'lost']

/**
 * GET /api/consumer-leads?facilityId=xxx&status=new&days=30&summary=true
 * PATCH /api/consumer-leads { leadId, status, monthlyRevenue, moveInDate, notes }
 *
 * Admin-only endpoints for managing consumer lead outcomes.
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // Auth check
  if (!requireAdmin(req, res)) return

  // GET — list consumer leads or summary stats
  if (req.method === 'GET') {
    try {
      const { facilityId, status, days, limit: rawLimit, summary } = req.query || {}

      // Summary mode: aggregate stats
      if (summary === 'true') {
        const facilityFilter = facilityId ? 'AND facility_id = $1' : ''
        const params = facilityId ? [facilityId] : []

        const stats = await queryOne(`
          SELECT
            COUNT(*) FILTER (WHERE lead_status = 'new') AS new_count,
            COUNT(*) FILTER (WHERE lead_status = 'contacted') AS contacted_count,
            COUNT(*) FILTER (WHERE lead_status = 'toured') AS toured_count,
            COUNT(*) FILTER (WHERE lead_status = 'reserved') AS reserved_count,
            COUNT(*) FILTER (WHERE lead_status = 'moved_in') AS moved_in_count,
            COUNT(*) FILTER (WHERE lead_status = 'lost') AS lost_count,
            COUNT(*) AS total,
            SUM(monthly_revenue) FILTER (WHERE lead_status = 'moved_in') AS total_revenue,
            ROUND(AVG(EXTRACT(EPOCH FROM (status_updated_at - created_at)) / 86400)::NUMERIC, 1)
              FILTER (WHERE lead_status = 'moved_in') AS avg_days_to_move_in
          FROM partial_leads
          WHERE lead_status != 'partial' ${facilityFilter}
        `, params)

        return res.status(200).json({ stats })
      }

      // List mode
      let sql = `
        SELECT pl.id, pl.email, pl.phone, pl.name, pl.unit_size,
               pl.lead_status, pl.monthly_revenue, pl.move_in_date, pl.lead_notes,
               pl.utm_source, pl.utm_medium, pl.utm_campaign, pl.utm_content,
               pl.fbclid, pl.gclid, pl.lead_score, pl.scroll_depth, pl.time_on_page,
               pl.facility_id, pl.landing_page_id,
               pl.created_at, pl.converted_at, pl.status_updated_at,
               lp.title AS page_title, lp.slug AS page_slug
        FROM partial_leads pl
        LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
        WHERE pl.lead_status != 'partial'
      `
      const params = []
      let paramIdx = 1

      if (facilityId) {
        sql += ` AND pl.facility_id = $${paramIdx++}`
        params.push(facilityId)
      }

      if (status && VALID_STATUSES.includes(status)) {
        sql += ` AND pl.lead_status = $${paramIdx++}`
        params.push(status)
      }

      if (days) {
        sql += ` AND pl.created_at >= NOW() - INTERVAL '1 day' * $${paramIdx++}`
        params.push(parseInt(days) || 30)
      }

      sql += ` ORDER BY pl.created_at DESC`
      sql += ` LIMIT $${paramIdx++}`
      params.push(parseInt(rawLimit) || 100)

      const leads = await query(sql, params)

      return res.status(200).json({ leads })
    } catch (err) {
      console.error('Consumer leads GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch consumer leads' })
    }
  }

  // PATCH — update lead status and/or revenue
  if (req.method === 'PATCH') {
    try {
      const { leadId, status, monthlyRevenue, moveInDate, notes } = req.body || {}

      if (!leadId) {
        return res.status(400).json({ error: 'leadId is required' })
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
      }

      // Build dynamic update
      const sets = []
      const params = [leadId]
      let paramIdx = 2

      if (status) {
        sets.push(`lead_status = $${paramIdx++}`)
        params.push(status)
        sets.push('status_updated_at = NOW()')
      }

      if (monthlyRevenue !== undefined) {
        sets.push(`monthly_revenue = $${paramIdx++}`)
        params.push(monthlyRevenue)
      }

      if (moveInDate !== undefined) {
        sets.push(`move_in_date = $${paramIdx++}`)
        params.push(moveInDate || null)
      }

      if (notes !== undefined) {
        sets.push(`lead_notes = $${paramIdx++}`)
        params.push(notes)
      }

      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      sets.push('updated_at = NOW()')

      const result = await queryOne(
        `UPDATE partial_leads SET ${sets.join(', ')} WHERE id = $1 RETURNING id, lead_status, email, name, facility_id, monthly_revenue`,
        params
      )

      if (!result) {
        return res.status(404).json({ error: 'Lead not found' })
      }

      // Log status change
      if (status) {
        await query(
          `INSERT INTO activity_log (type, facility_id, lead_name, detail, meta)
           VALUES ('consumer_lead_status_change', $1, $2, $3, $4)`,
          [
            result.facility_id,
            result.name || result.email || 'Unknown',
            `Consumer lead status changed to ${status}${monthlyRevenue ? ` ($${monthlyRevenue}/mo)` : ''}`,
            JSON.stringify({ lead_id: result.id, new_status: status, monthly_revenue: monthlyRevenue }),
          ]
        ).catch(() => {})
      }

      return res.status(200).json({ success: true, lead: result })
    } catch (err) {
      console.error('Consumer leads PATCH error:', err)
      return res.status(500).json({ error: 'Failed to update consumer lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
