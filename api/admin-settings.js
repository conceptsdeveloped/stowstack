import { Redis } from '@upstash/redis'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

const DEFAULTS = {
  companyName: 'StowStack',
  companyEmail: 'anna@storepawpaw.com',
  companyPhone: '',
  notifyNewLeads: true,
  notifyOverdue: true,
  notifyMessages: true,
  notifyAlerts: true,
  emailSignature: '',
  defaultFollowUpDays: 3,
  theme: 'light',
}

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

function validateSettings(updates) {
  const errors = []
  const valid = {}

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in DEFAULTS)) continue // ignore unknown fields

    switch (key) {
      case 'companyName':
      case 'companyEmail':
      case 'companyPhone':
      case 'emailSignature':
        if (typeof value !== 'string') {
          errors.push(`${key} must be a string`)
        } else {
          valid[key] = value
        }
        break

      case 'notifyNewLeads':
      case 'notifyOverdue':
      case 'notifyMessages':
      case 'notifyAlerts':
        if (typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`)
        } else {
          valid[key] = value
        }
        break

      case 'defaultFollowUpDays':
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
          errors.push(`${key} must be a positive integer`)
        } else {
          valid[key] = value
        }
        break

      case 'theme':
        if (value !== 'light' && value !== 'dark') {
          errors.push(`${key} must be 'light' or 'dark'`)
        } else {
          valid[key] = value
        }
        break
    }
  }

  return { valid, errors }
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
  if (!redis) {
    // No Redis configured (local dev) — return defaults
    if (req.method === 'GET') return res.status(200).json({ settings: { ...DEFAULTS } })
    return res.status(200).json({ success: true, settings: { ...DEFAULTS } })
  }

  // GET — return current settings merged with defaults
  if (req.method === 'GET') {
    try {
      const raw = await redis.get('admin:settings')
      const stored = raw
        ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
        : {}
      const settings = { ...DEFAULTS, ...stored }
      return res.status(200).json({ settings })
    } catch (err) {
      console.error('Admin settings GET error:', err)
      return res.status(500).json({ error: 'Failed to load settings' })
    }
  }

  // PATCH — partial update
  if (req.method === 'PATCH') {
    const updates = req.body || {}
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    const { valid, errors } = validateSettings(updates)
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors })
    }
    if (!Object.keys(valid).length) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    try {
      const raw = await redis.get('admin:settings')
      const stored = raw
        ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
        : {}
      const merged = { ...DEFAULTS, ...stored, ...valid }
      await redis.set('admin:settings', JSON.stringify(merged))
      return res.status(200).json({ success: true, settings: merged })
    } catch (err) {
      console.error('Admin settings PATCH error:', err)
      return res.status(500).json({ error: 'Failed to save settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
