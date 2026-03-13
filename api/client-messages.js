import { Redis } from '@upstash/redis'

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

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

/*
  Client-Admin Message Thread

  Redis key: messages:{accessCode} (list, capped at 200)
  Message shape: { id, from: 'client'|'admin', text, timestamp }

  Auth:
  - Admin: X-Admin-Key header
  - Client: email + accessCode verified against client record
*/

async function verifyClient(redis, code, email) {
  if (!code || !email) return false
  const raw = await redis.get(`client:${code}`)
  if (!raw) return false
  const client = typeof raw === 'string' ? JSON.parse(raw) : raw
  return client.email && client.email.toLowerCase() === email.toLowerCase()
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  const redis = getRedis()
  const isAdmin = req.headers['x-admin-key'] === ADMIN_KEY

  // GET — fetch messages
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    const email = url.searchParams.get('email')

    if (!code) return res.status(400).json({ error: 'Missing access code' })

    // Auth: admin key or client email verification
    if (!isAdmin) {
      if (!redis) return res.status(200).json({ messages: [] })
      const valid = await verifyClient(redis, code, email)
      if (!valid) return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!redis) return res.status(200).json({ messages: [] })

    try {
      const raw = await redis.lrange(`messages:${code}`, 0, 199)
      const messages = (raw || []).map(entry => typeof entry === 'string' ? JSON.parse(entry) : entry)
      // Messages are stored newest-first, reverse for chronological display
      messages.reverse()
      return res.status(200).json({ messages })
    } catch (err) {
      console.error('Messages read error:', err)
      return res.status(500).json({ error: 'Failed to read messages' })
    }
  }

  // POST — send a message
  if (req.method === 'POST') {
    const { code, email, text, from } = req.body || {}
    if (!code || !text || !from) {
      return res.status(400).json({ error: 'Missing code, text, or from' })
    }
    if (!['client', 'admin'].includes(from)) {
      return res.status(400).json({ error: 'from must be "client" or "admin"' })
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' })
    }

    // Auth
    if (from === 'admin' && !isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (from === 'client') {
      if (!redis) return res.status(200).json({ success: true })
      const valid = await verifyClient(redis, code, email)
      if (!valid) return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!redis) return res.status(200).json({ success: true })

    try {
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from,
        text: text.slice(0, 2000),
        timestamp: new Date().toISOString(),
      }

      await redis.lpush(`messages:${code}`, JSON.stringify(message))
      await redis.ltrim(`messages:${code}`, 0, 199)

      return res.status(200).json({ success: true, message })
    } catch (err) {
      console.error('Message send error:', err)
      return res.status(500).json({ error: 'Failed to send message' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
