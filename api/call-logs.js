import { query } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

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

function checkAuth(req) {
  return isAdmin(req)
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { facilityId, summary } = req.query
  if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

  // Summary mode — aggregate stats
  if (summary === 'true') {
    const stats = await query(
      `SELECT
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE cl.status = 'completed') as completed_calls,
         COALESCE(AVG(cl.duration) FILTER (WHERE cl.status = 'completed'), 0) as avg_duration,
         COUNT(DISTINCT cl.caller_number) as unique_callers,
         COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '24 hours') as calls_today,
         COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days') as calls_this_week
       FROM call_logs cl
       WHERE cl.facility_id = $1`,
      [facilityId]
    )

    const byNumber = await query(
      `SELECT ctn.label, ctn.phone_number, ctn.call_count, ctn.total_duration,
              COUNT(cl.id) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days') as calls_7d
       FROM call_tracking_numbers ctn
       LEFT JOIN call_logs cl ON cl.tracking_number_id = ctn.id
       WHERE ctn.facility_id = $1 AND ctn.status = 'active'
       GROUP BY ctn.id
       ORDER BY ctn.call_count DESC`,
      [facilityId]
    )

    return res.json({ stats: stats[0], byNumber })
  }

  // Detail mode — paginated call logs
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = (page - 1) * limit

  const logs = await query(
    `SELECT cl.*, ctn.label as tracking_label, ctn.phone_number as tracking_number
     FROM call_logs cl
     JOIN call_tracking_numbers ctn ON cl.tracking_number_id = ctn.id
     WHERE cl.facility_id = $1
     ORDER BY cl.started_at DESC
     LIMIT $2 OFFSET $3`,
    [facilityId, limit, offset]
  )

  const countResult = await query(
    'SELECT COUNT(*) as total FROM call_logs WHERE facility_id = $1',
    [facilityId]
  )

  return res.json({
    logs,
    total: parseInt(countResult[0].total),
    page,
    pages: Math.ceil(parseInt(countResult[0].total) / limit),
  })
}
