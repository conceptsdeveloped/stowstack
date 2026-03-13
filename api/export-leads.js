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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const redis = getRedis()
  if (!redis) {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=stowstack-leads.csv')
    return res.end('Name,Email,Phone,Facility,Location,Occupancy,Units,Issue,Status,Created,Updated,Follow-Up,Notes Count\n')
  }

  try {
    const keys = await redis.keys('lead:*')
    if (!keys.length) {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=stowstack-leads.csv')
      return res.end('Name,Email,Phone,Facility,Location,Occupancy,Units,Issue,Status,Created,Updated,Follow-Up,Notes Count\n')
    }

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

    const headers = ['Name', 'Email', 'Phone', 'Facility', 'Location', 'Occupancy', 'Units', 'Issue', 'Status', 'Created', 'Updated', 'Follow-Up', 'Notes Count']
    const rows = leads.map(l => [
      escapeCsv(l.name),
      escapeCsv(l.email),
      escapeCsv(l.phone),
      escapeCsv(l.facilityName),
      escapeCsv(l.location),
      escapeCsv(l.occupancyRange),
      escapeCsv(l.totalUnits),
      escapeCsv(l.biggestIssue),
      escapeCsv(l.status),
      escapeCsv(l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''),
      escapeCsv(l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : ''),
      escapeCsv(l.followUpDate || ''),
      escapeCsv(l.notes ? l.notes.length : 0),
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')

    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=stowstack-leads-${date}.csv`)
    return res.end(csv)
  } catch (err) {
    console.error('Export leads error:', err)
    return res.status(500).json({ error: 'Failed to export leads' })
  }
}
