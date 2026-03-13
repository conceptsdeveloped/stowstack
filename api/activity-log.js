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
  Activity log entry:
  {
    id: string (timestamp-based),
    type: 'lead_created' | 'status_change' | 'note_added' | 'campaign_added' | 'onboarding_step' | 'client_signed' | 'pms_uploaded',
    leadId: string,
    leadName: string,
    facilityName: string,
    detail: string (human-readable description),
    meta: object (extra data, e.g. { from: 'submitted', to: 'form_sent' }),
    timestamp: ISO string,
  }
*/

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()

  // GET /api/activity-log?limit=50&leadId=xxx — fetch recent activity
  if (req.method === 'GET') {
    if (!redis) return res.status(200).json({ activities: [] })

    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
      const leadId = url.searchParams.get('leadId')

      // Get activity entries — stored as sorted set by timestamp
      let activities

      if (leadId) {
        // Per-lead activity
        const raw = await redis.lrange(`activity:lead:${leadId}`, 0, limit - 1)
        activities = (raw || []).map(entry => typeof entry === 'string' ? JSON.parse(entry) : entry)
      } else {
        // Global activity feed — most recent first
        const raw = await redis.lrange('activity:global', 0, limit - 1)
        activities = (raw || []).map(entry => typeof entry === 'string' ? JSON.parse(entry) : entry)
      }

      return res.status(200).json({ activities })
    } catch (err) {
      console.error('Activity log read error:', err)
      return res.status(500).json({ error: 'Failed to read activity log' })
    }
  }

  // POST /api/activity-log — log an activity
  // body: { type, leadId, leadName, facilityName, detail, meta? }
  if (req.method === 'POST') {
    if (!redis) return res.status(200).json({ success: true })

    const { type, leadId, leadName, facilityName, detail, meta } = req.body || {}
    if (!type || !leadId || !detail) {
      return res.status(400).json({ error: 'Missing type, leadId, or detail' })
    }

    const validTypes = ['lead_created', 'status_change', 'note_added', 'campaign_added', 'onboarding_step', 'client_signed', 'pms_uploaded']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid activity type' })
    }

    try {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        leadId,
        leadName: leadName || '',
        facilityName: facilityName || '',
        detail: (detail || '').slice(0, 500),
        meta: meta || {},
        timestamp: new Date().toISOString(),
      }

      const serialized = JSON.stringify(entry)

      // Push to global feed (capped at 500 entries)
      await redis.lpush('activity:global', serialized)
      await redis.ltrim('activity:global', 0, 499)

      // Push to per-lead feed (capped at 100 entries)
      await redis.lpush(`activity:lead:${leadId}`, serialized)
      await redis.ltrim(`activity:lead:${leadId}`, 0, 99)

      return res.status(200).json({ success: true, activity: entry })
    } catch (err) {
      console.error('Activity log write error:', err)
      return res.status(500).json({ error: 'Failed to log activity' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
