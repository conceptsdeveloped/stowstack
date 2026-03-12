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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function generateSlug(facilityName) {
  const base = (facilityName || 'facility')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${base}-${rand}`
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { audit } = req.body || {}
  if (!audit || !audit.overall_score) {
    return res.status(400).json({ error: 'Invalid audit data' })
  }

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })

    const facilityName = audit.facility_summary?.name || 'facility'
    const slug = generateSlug(facilityName)

    const record = {
      audit,
      createdAt: new Date().toISOString(),
      facilityName,
      views: 0,
    }

    // Store with 90-day TTL (7,776,000 seconds)
    await redis.set(`audit:${slug}`, JSON.stringify(record), { ex: 7776000 })

    const baseUrl = origin.includes('localhost')
      ? origin
      : 'https://stowstack.co'

    return res.status(200).json({
      slug,
      url: `${baseUrl}/audit/${slug}`,
    })
  } catch (err) {
    console.error('Audit save error:', err)
    return res.status(500).json({ error: 'Failed to save audit' })
  }
}
