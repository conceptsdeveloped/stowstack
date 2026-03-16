import { query } from './_db.js'
import { requireAdmin } from './_auth.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req) {
  const origin = req.headers['origin'] || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!requireAdmin(req, res)) return

  // POST — subscribe
  if (req.method === 'POST') {
    const { subscription, userType = 'admin', userId } = req.body || {}

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' })
    }

    try {
      await query(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_type, user_id, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (endpoint) DO UPDATE SET
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           active = true,
           user_type = EXCLUDED.user_type,
           user_id = EXCLUDED.user_id,
           user_agent = EXCLUDED.user_agent`,
        [
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth,
          userType,
          userId || null,
          req.headers['user-agent'] || null,
        ]
      )
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[push-subscribe] DB error:', err.message)
      return res.status(500).json({ error: 'Failed to save subscription' })
    }
  }

  // DELETE — unsubscribe
  if (req.method === 'DELETE') {
    const { endpoint } = req.body || {}
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' })
    }

    try {
      await query(
        'UPDATE push_subscriptions SET active = false WHERE endpoint = $1',
        [endpoint]
      )
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[push-subscribe] DB error:', err.message)
      return res.status(500).json({ error: 'Failed to unsubscribe' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
