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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // GET — List reports for a client
    if (req.method === 'GET') {
      const { clientId, accessCode, email, limit } = req.query || {}

      let resolvedClientId = clientId

      // Client auth: access code + email
      if (!resolvedClientId && accessCode && email) {
        const client = await query(
          'SELECT id FROM clients WHERE access_code = $1 AND LOWER(email) = LOWER($2)',
          [accessCode, email.trim()]
        )
        if (client.length > 0) resolvedClientId = client[0].id
      }

      // Admin auth for clientId lookup
      if (clientId && !isAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!resolvedClientId) {
        return res.status(400).json({ error: 'Missing client identifier' })
      }

      const reports = await query(
        `SELECT id, report_type, period_start, period_end, report_data, sent_at, opened_at, status, created_at
         FROM client_reports WHERE client_id = $1
         ORDER BY period_start DESC
         LIMIT $2`,
        [resolvedClientId, parseInt(limit) || 12]
      )

      return res.json({ success: true, data: reports })
    }

    // POST — Manually trigger report for a client (admin only)
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

      const { clientId } = req.body
      if (!clientId) return res.status(400).json({ error: 'Missing clientId' })

      // Trigger the cron for this specific client by calling the cron endpoint internally
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      const cronSecret = process.env.CRON_SECRET || ''

      const cronRes = await fetch(`${baseUrl}/api/cron/send-client-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
      })

      const cronData = await cronRes.json()
      return res.json({ success: true, result: cronData })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('client-reports error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
