import { query } from './_db.js'

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

const PIPELINE_ORDER = ['submitted', 'form_sent', 'form_completed', 'audit_generated', 'call_scheduled', 'client_signed']

function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)))
}

const EMPTY_RESPONSE = {
  totalLeads: 0,
  funnel: {},
  conversionRate: 0,
  avgDaysToSign: 0,
  avgDaysInPipeline: 0,
  weeklyVelocity: [],
  stageDistribution: {},
  lostRate: 0,
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const facilities = await query(
      `SELECT id, pipeline_status, created_at, updated_at FROM facilities`
    )

    if (!facilities.length) return res.status(200).json(EMPTY_RESPONSE)

    const leads = facilities.map(f => ({
      id: f.id,
      status: f.pipeline_status || 'submitted',
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }))

    // Stage distribution
    const stageDistribution = {}
    leads.forEach(l => {
      stageDistribution[l.status] = (stageDistribution[l.status] || 0) + 1
    })

    // Funnel
    const funnel = {}
    PIPELINE_ORDER.forEach(stage => {
      const stageIdx = PIPELINE_ORDER.indexOf(stage)
      funnel[stage] = leads.filter(l => {
        const leadIdx = PIPELINE_ORDER.indexOf(l.status)
        return leadIdx >= stageIdx || l.status === stage
      }).length
    })

    const signed = leads.filter(l => l.status === 'client_signed').length
    const lost = leads.filter(l => l.status === 'lost').length
    const conversionRate = leads.length > 0 ? Math.round((signed / leads.length) * 100) : 0
    const lostRate = leads.length > 0 ? Math.round((lost / leads.length) * 100) : 0

    const signedLeads = leads.filter(l => l.status === 'client_signed')
    const avgDaysToSign = signedLeads.length > 0
      ? Math.round(signedLeads.reduce((sum, l) => sum + daysBetween(l.createdAt, l.updatedAt), 0) / signedLeads.length)
      : 0

    const activeLeads = leads.filter(l => !['lost', 'client_signed'].includes(l.status))
    const now = new Date().toISOString()
    const avgDaysInPipeline = activeLeads.length > 0
      ? Math.round(activeLeads.reduce((sum, l) => sum + daysBetween(l.createdAt, now), 0) / activeLeads.length)
      : 0

    const weeklyVelocity = []
    const nowMs = Date.now()
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(nowMs - (w + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(nowMs - w * 7 * 24 * 60 * 60 * 1000)
      const count = leads.filter(l => {
        const d = new Date(l.createdAt)
        return d >= weekStart && d < weekEnd
      }).length
      const label = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeklyVelocity.push({ week: label, leads: count })
    }

    return res.status(200).json({
      totalLeads: leads.length,
      funnel,
      conversionRate,
      avgDaysToSign,
      avgDaysInPipeline,
      weeklyVelocity,
      stageDistribution,
      lostRate,
    })
  } catch (err) {
    console.error('Lead analytics error:', err)
    return res.status(500).json({ error: 'Failed to compute analytics' })
  }
}
