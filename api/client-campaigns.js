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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // Admin-only endpoint
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ campaigns: [] })
  }

  // GET /api/client-campaigns?code=XXXX — get campaigns for a client
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    if (!code) return res.status(400).json({ error: 'Missing access code' })

    try {
      const raw = await redis.get(`client:${code}`)
      if (!raw) return res.status(404).json({ error: 'Client not found' })
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw
      return res.status(200).json({ campaigns: record.campaigns || [] })
    } catch (err) {
      console.error('Get campaigns error:', err)
      return res.status(500).json({ error: 'Failed to get campaigns' })
    }
  }

  // POST /api/client-campaigns — add a campaign month
  // body: { code, campaign: { month, spend, leads, cpl, moveIns, costPerMoveIn, roas, occupancyDelta } }
  if (req.method === 'POST') {
    const { code, campaign } = req.body || {}
    if (!code || !campaign) return res.status(400).json({ error: 'Missing code or campaign data' })

    if (!campaign.month || campaign.spend == null || campaign.leads == null) {
      return res.status(400).json({ error: 'Campaign requires month, spend, and leads' })
    }

    try {
      const raw = await redis.get(`client:${code}`)
      if (!raw) return res.status(404).json({ error: 'Client not found' })
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw

      // Calculate derived metrics if not provided
      const c = {
        month: campaign.month,
        spend: Number(campaign.spend),
        leads: Number(campaign.leads),
        cpl: campaign.cpl != null ? Number(campaign.cpl) : (Number(campaign.leads) > 0 ? Number(campaign.spend) / Number(campaign.leads) : 0),
        moveIns: Number(campaign.moveIns || 0),
        costPerMoveIn: campaign.costPerMoveIn != null ? Number(campaign.costPerMoveIn) : (Number(campaign.moveIns) > 0 ? Number(campaign.spend) / Number(campaign.moveIns) : 0),
        roas: Number(campaign.roas || 0),
        occupancyDelta: Number(campaign.occupancyDelta || 0),
      }

      // Replace existing month or append
      const campaigns = record.campaigns || []
      const existingIdx = campaigns.findIndex(e => e.month === c.month)
      if (existingIdx >= 0) {
        campaigns[existingIdx] = c
      } else {
        campaigns.push(c)
      }

      record.campaigns = campaigns
      await redis.set(`client:${code}`, JSON.stringify(record))
      return res.status(200).json({ success: true, campaigns })
    } catch (err) {
      console.error('Add campaign error:', err)
      return res.status(500).json({ error: 'Failed to add campaign' })
    }
  }

  // DELETE /api/client-campaigns — remove a campaign month
  // body: { code, month }
  if (req.method === 'DELETE') {
    const { code, month } = req.body || {}
    if (!code || !month) return res.status(400).json({ error: 'Missing code or month' })

    try {
      const raw = await redis.get(`client:${code}`)
      if (!raw) return res.status(404).json({ error: 'Client not found' })
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw

      record.campaigns = (record.campaigns || []).filter(c => c.month !== month)
      await redis.set(`client:${code}`, JSON.stringify(record))
      return res.status(200).json({ success: true, campaigns: record.campaigns })
    } catch (err) {
      console.error('Delete campaign error:', err)
      return res.status(500).json({ error: 'Failed to delete campaign' })
    }
  }

  // PATCH /api/client-campaigns — update client settings (e.g. monthlyGoal)
  // body: { code, monthlyGoal }
  if (req.method === 'PATCH') {
    const { code, monthlyGoal } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Missing code' })

    try {
      const raw = await redis.get(`client:${code}`)
      if (!raw) return res.status(404).json({ error: 'Client not found' })
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw

      if (monthlyGoal !== undefined) {
        record.monthlyGoal = Math.max(0, Math.min(999, Number(monthlyGoal) || 0))
      }

      await redis.set(`client:${code}`, JSON.stringify(record))
      return res.status(200).json({ success: true, monthlyGoal: record.monthlyGoal })
    } catch (err) {
      console.error('Update client settings error:', err)
      return res.status(500).json({ error: 'Failed to update settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
