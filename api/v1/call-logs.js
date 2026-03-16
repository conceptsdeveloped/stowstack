import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope, requireOrgFacility } from '../_api-auth.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireScope(res, apiKey, 'calls:read')) return

  const { facilityId } = req.query
  const facility = await requireOrgFacility(res, facilityId, orgId)
  if (!facility) return

  const summary = req.query.summary === 'true'

  try {
    if (summary) {
      const [stats, byNumber] = await Promise.all([
        queryOne(`
          SELECT
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE cl.status = 'completed')::int AS completed_calls,
            COALESCE(AVG(cl.duration) FILTER (WHERE cl.status = 'completed'), 0)::int AS avg_duration,
            COUNT(DISTINCT cl.caller_number)::int AS unique_callers,
            COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '24 hours')::int AS calls_today,
            COUNT(*) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days')::int AS calls_this_week
          FROM call_logs cl WHERE cl.facility_id = $1
        `, [facilityId]),
        query(`
          SELECT ctn.id, ctn.label, ctn.phone_number, ctn.call_count, ctn.total_duration,
                 COUNT(cl.id) FILTER (WHERE cl.started_at > NOW() - INTERVAL '7 days')::int AS calls_7d
          FROM call_tracking_numbers ctn
          LEFT JOIN call_logs cl ON cl.tracking_number_id = ctn.id
          WHERE ctn.facility_id = $1 AND ctn.status = 'active'
          GROUP BY ctn.id ORDER BY ctn.call_count DESC
        `, [facilityId]),
      ])
      return res.status(200).json({ stats, trackingNumbers: byNumber })
    }

    // Paginated call log
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const offset = (page - 1) * limit

    const [logs, countRow] = await Promise.all([
      query(
        `SELECT cl.id, cl.caller_number, cl.caller_city, cl.caller_state,
                cl.duration, cl.status, cl.started_at, cl.ended_at,
                ctn.label AS tracking_label, ctn.phone_number AS tracking_number
         FROM call_logs cl
         JOIN call_tracking_numbers ctn ON cl.tracking_number_id = ctn.id
         WHERE cl.facility_id = $1
         ORDER BY cl.started_at DESC
         LIMIT $2 OFFSET $3`,
        [facilityId, limit, offset]
      ),
      queryOne('SELECT COUNT(*)::int AS total FROM call_logs WHERE facility_id = $1', [facilityId]),
    ])

    const total = countRow?.total || 0
    return res.status(200).json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('v1/call-logs GET failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch call logs' })
  }
}
