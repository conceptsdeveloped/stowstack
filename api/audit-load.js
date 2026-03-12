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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'Missing slug parameter' })

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })

    const raw = await redis.get(`audit:${slug}`)
    if (!raw) {
      return res.status(404).json({ error: 'Audit not found or has expired' })
    }

    const record = typeof raw === 'string' ? JSON.parse(raw) : raw

    // Increment view count (fire and forget)
    record.views = (record.views || 0) + 1
    redis.set(`audit:${slug}`, JSON.stringify(record), { keepttl: true }).catch(() => {})

    return res.status(200).json({
      audit: record.audit,
      facilityName: record.facilityName,
      createdAt: record.createdAt,
      views: record.views,
    })
  } catch (err) {
    console.error('Audit load error:', err)
    return res.status(500).json({ error: 'Failed to load audit' })
  }
}
