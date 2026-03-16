import { requireAdmin } from './_auth.js'
import { sendPushToAll } from './_push.js'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!requireAdmin(req, res)) return

  const { title, body, url, tag, userType, userId } = req.body || {}

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' })
  }

  try {
    await sendPushToAll({ title, body, url, tag }, { userType, userId })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[push-send] Error:', err.message)
    return res.status(500).json({ error: 'Failed to send push notification' })
  }
}
