import { query } from './_db.js'
import { isAdmin } from './_auth.js'

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

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // GET — List alerts
    if (req.method === 'GET') {
      const { clientId, accessCode, email, severity, acknowledged, limit } = req.query || {}

      let whereClause = 'WHERE 1=1'
      const params = []

      // Client auth
      if (accessCode && email) {
        const client = await query(
          'SELECT id FROM clients WHERE access_code = $1 AND LOWER(email) = LOWER($2)',
          [accessCode, email.trim()]
        )
        if (client.length === 0) return res.status(401).json({ error: 'Unauthorized' })
        params.push(client[0].id)
        whereClause += ` AND client_id = $${params.length}`
      } else if (clientId) {
        if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
        params.push(clientId)
        whereClause += ` AND client_id = $${params.length}`
      } else if (!isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (severity) {
        params.push(severity)
        whereClause += ` AND severity = $${params.length}`
      }

      if (acknowledged !== undefined) {
        params.push(acknowledged === 'true')
        whereClause += ` AND acknowledged = $${params.length}`
      }

      const maxRows = Math.min(parseInt(limit) || 50, 200)
      params.push(maxRows)

      const alerts = await query(
        `SELECT ah.*, c.facility_name, f.name AS fac_name
         FROM alert_history ah
         LEFT JOIN clients c ON ah.client_id = c.id
         LEFT JOIN facilities f ON ah.facility_id = f.id
         ${whereClause}
         ORDER BY ah.created_at DESC
         LIMIT $${params.length}`,
        params
      )

      // Summary counts
      const summary = await query(
        `SELECT severity, COUNT(*)::int AS count
         FROM alert_history ${whereClause.replace(/LIMIT.*/, '')}
         GROUP BY severity`,
        params.slice(0, -1) // remove the LIMIT param
      )

      const unacknowledged = await query(
        `SELECT COUNT(*)::int AS count
         FROM alert_history ${whereClause.replace(/LIMIT.*/, '')} AND acknowledged = false`,
        params.slice(0, -1)
      )

      return res.json({
        success: true,
        data: alerts,
        summary: Object.fromEntries(summary.map(s => [s.severity, s.count])),
        unacknowledged: unacknowledged[0]?.count || 0,
      })
    }

    // PATCH — Acknowledge an alert (admin only)
    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

      const { id, acknowledgedBy } = req.body
      if (!id) return res.status(400).json({ error: 'Missing alert id' })

      await query(
        `UPDATE alert_history SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2`,
        [acknowledgedBy || 'admin', id]
      )

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('alert-history error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
