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

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  // GET /api/activity-log?limit=50&leadId=xxx
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
      const leadId = url.searchParams.get('leadId')

      let activities
      if (leadId) {
        activities = await query(
          `SELECT id, type, facility_id AS "leadId", lead_name AS "leadName",
                  facility_name AS "facilityName", detail, meta, created_at AS "timestamp"
           FROM activity_log WHERE facility_id = $1
           ORDER BY created_at DESC LIMIT $2`,
          [leadId, limit]
        )
      } else {
        activities = await query(
          `SELECT id, type, facility_id AS "leadId", lead_name AS "leadName",
                  facility_name AS "facilityName", detail, meta, created_at AS "timestamp"
           FROM activity_log ORDER BY created_at DESC LIMIT $1`,
          [limit]
        )
      }

      return res.status(200).json({ activities })
    } catch (err) {
      console.error('Activity log read error:', err)
      return res.status(500).json({ error: 'Failed to read activity log' })
    }
  }

  // POST /api/activity-log
  if (req.method === 'POST') {
    const { type, leadId, leadName, facilityName, detail, meta } = req.body || {}
    if (!type || !leadId || !detail) {
      return res.status(400).json({ error: 'Missing type, leadId, or detail' })
    }

    const validTypes = ['lead_created', 'status_change', 'note_added', 'campaign_added', 'onboarding_step', 'client_signed', 'pms_uploaded', 'drip_sent', 'drip_cancelled']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid activity type' })
    }

    try {
      const rows = await query(
        `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, type, facility_id AS "leadId", lead_name AS "leadName",
                   facility_name AS "facilityName", detail, meta, created_at AS "timestamp"`,
        [type, leadId, leadName || '', facilityName || '', (detail || '').slice(0, 500), JSON.stringify(meta || {})]
      )

      return res.status(200).json({ success: true, activity: rows[0] })
    } catch (err) {
      console.error('Activity log write error:', err)
      return res.status(500).json({ error: 'Failed to log activity' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
