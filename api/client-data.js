import { Redis } from '@upstash/redis'

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // POST /api/client-data — authenticate client by email + access code
  if (req.method === 'POST') {
    const { email, accessCode } = req.body || {}
    if (!email || !accessCode) {
      return res.status(400).json({ error: 'Email and access code required' })
    }

    const redis = getRedis()
    if (!redis) {
      return res.status(200).json({ error: 'No data store configured' })
    }

    try {
      // Look up client record by access code
      const clientData = await redis.get(`client:${accessCode}`)
      if (!clientData) {
        return res.status(401).json({ error: 'Invalid access code' })
      }

      const record = typeof clientData === 'string' ? JSON.parse(clientData) : clientData
      if (record.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      return res.status(200).json({ client: record })
    } catch (err) {
      console.error('Client auth error:', err)
      return res.status(500).json({ error: 'Internal error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
