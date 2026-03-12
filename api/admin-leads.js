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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function getRedis() {
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

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()

  // GET — list all leads
  if (req.method === 'GET') {
    try {
      // Get all lead keys
      const keys = await redis.keys('lead:*')
      if (!keys.length) return res.status(200).json({ leads: [] })

      const pipeline = redis.pipeline()
      keys.forEach(k => pipeline.get(k))
      const results = await pipeline.exec()

      const leads = results
        .map((raw, i) => {
          const record = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (!record) return null
          return { id: keys[i].replace('lead:', ''), ...record }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      // Also get audit counts
      const auditKeys = await redis.keys('audit:*')

      return res.status(200).json({ leads, auditCount: auditKeys.length })
    } catch (err) {
      console.error('Admin leads list error:', err)
      return res.status(500).json({ error: 'Failed to list leads' })
    }
  }

  // POST — create a new lead (called from audit-form.js submission)
  if (req.method === 'POST') {
    const { lead } = req.body || {}
    if (!lead?.email) return res.status(400).json({ error: 'Missing lead data' })

    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const record = {
        ...lead,
        status: 'submitted', // submitted | form_sent | form_completed | audit_generated | call_scheduled | client_signed | lost
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      }

      await redis.set(`lead:${id}`, JSON.stringify(record))
      return res.status(200).json({ id })
    } catch (err) {
      console.error('Admin lead create error:', err)
      return res.status(500).json({ error: 'Failed to create lead' })
    }
  }

  // PATCH — update lead status or add notes
  if (req.method === 'PATCH') {
    const { id, status, note, pmsUploaded } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing lead ID' })

    try {
      const raw = await redis.get(`lead:${id}`)
      if (!raw) return res.status(404).json({ error: 'Lead not found' })

      const record = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (status) record.status = status
      if (note) record.notes = [...(record.notes || []), { text: note, at: new Date().toISOString() }]
      if (pmsUploaded !== undefined) record.pmsUploaded = pmsUploaded
      record.updatedAt = new Date().toISOString()

      await redis.set(`lead:${id}`, JSON.stringify(record))
      return res.status(200).json({ success: true, record })
    } catch (err) {
      console.error('Admin lead update error:', err)
      return res.status(500).json({ error: 'Failed to update lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
