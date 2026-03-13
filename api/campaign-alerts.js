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
  Campaign Health Alert Engine

  Scans campaign data for each signed client and generates alerts:
  - CPL spike: current CPL > 150% of client average
  - ROAS drop: current ROAS < 2.0x or dropped 30%+ from prior month
  - Spend pacing: current spend significantly under/over expected
  - Lead drought: zero leads in latest period
  - Budget efficiency: high spend but low move-ins
  - Stale campaign: no new data in 30+ days
  - Performance milestone: hit a positive threshold worth celebrating

  Alert severity: 'critical' | 'warning' | 'info'
*/

function generateAlerts(client, campaigns) {
  const alerts = []
  const now = new Date()

  if (!campaigns || campaigns.length === 0) {
    // Check if client signed but no campaigns yet
    const signedAt = new Date(client.signedAt)
    const daysSinceSigned = Math.round((now - signedAt) / (1000 * 60 * 60 * 24))
    if (daysSinceSigned > 14) {
      alerts.push({
        type: 'no_campaigns',
        severity: 'warning',
        title: 'No campaigns launched',
        detail: `${client.facilityName} signed ${daysSinceSigned} days ago but has no campaign data yet.`,
        metric: daysSinceSigned,
      })
    }
    return alerts
  }

  const latest = campaigns[campaigns.length - 1]
  const previous = campaigns.length >= 2 ? campaigns[campaigns.length - 2] : null

  // Compute averages across all months
  const avgCpl = campaigns.reduce((s, c) => s + c.cpl, 0) / campaigns.length
  const avgRoas = campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length
  const avgLeads = campaigns.reduce((s, c) => s + c.leads, 0) / campaigns.length
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalMoveIns = campaigns.reduce((s, c) => s + c.moveIns, 0)

  // 1. CPL Spike
  if (latest.cpl > avgCpl * 1.5 && latest.cpl > 15) {
    alerts.push({
      type: 'cpl_spike',
      severity: latest.cpl > avgCpl * 2 ? 'critical' : 'warning',
      title: 'CPL spike detected',
      detail: `Current CPL ($${latest.cpl.toFixed(2)}) is ${Math.round((latest.cpl / avgCpl - 1) * 100)}% above average ($${avgCpl.toFixed(2)}).`,
      metric: latest.cpl,
      threshold: avgCpl * 1.5,
    })
  }

  // 2. ROAS Drop
  if (latest.roas < 2.0) {
    alerts.push({
      type: 'roas_low',
      severity: latest.roas < 1.0 ? 'critical' : 'warning',
      title: 'ROAS below target',
      detail: `Current ROAS (${latest.roas}x) is below the 2.0x minimum target.`,
      metric: latest.roas,
      threshold: 2.0,
    })
  }
  if (previous && previous.roas > 0 && latest.roas < previous.roas * 0.7) {
    alerts.push({
      type: 'roas_drop',
      severity: 'warning',
      title: 'ROAS dropped significantly',
      detail: `ROAS fell from ${previous.roas}x to ${latest.roas}x (${Math.round((1 - latest.roas / previous.roas) * 100)}% drop).`,
      metric: latest.roas,
      threshold: previous.roas * 0.7,
    })
  }

  // 3. Lead Drought
  if (latest.leads === 0 && latest.spend > 0) {
    alerts.push({
      type: 'lead_drought',
      severity: 'critical',
      title: 'Zero leads this period',
      detail: `$${latest.spend.toLocaleString()} was spent but generated zero leads. Check targeting and creative.`,
      metric: 0,
      threshold: 1,
    })
  } else if (latest.leads < avgLeads * 0.5 && avgLeads > 2) {
    alerts.push({
      type: 'low_leads',
      severity: 'warning',
      title: 'Lead volume down',
      detail: `Only ${latest.leads} leads this period vs. ${Math.round(avgLeads)} average. Volume is ${Math.round((1 - latest.leads / avgLeads) * 100)}% below normal.`,
      metric: latest.leads,
      threshold: Math.round(avgLeads * 0.5),
    })
  }

  // 4. Budget Efficiency — high spend, low move-ins
  if (latest.spend > 2000 && latest.moveIns === 0 && latest.leads > 0) {
    alerts.push({
      type: 'no_moveins',
      severity: 'warning',
      title: 'No move-ins despite spend',
      detail: `$${latest.spend.toLocaleString()} spent with ${latest.leads} leads but zero move-ins. Review lead quality and follow-up.`,
      metric: 0,
      threshold: 1,
    })
  }

  // 5. Spend Pacing (if previous month to compare)
  if (previous && previous.spend > 0) {
    const spendChange = (latest.spend - previous.spend) / previous.spend
    if (spendChange > 0.5) {
      alerts.push({
        type: 'spend_spike',
        severity: 'info',
        title: 'Spend increased significantly',
        detail: `Spend went from $${previous.spend.toLocaleString()} to $${latest.spend.toLocaleString()} (+${Math.round(spendChange * 100)}%).`,
        metric: latest.spend,
        threshold: previous.spend * 1.5,
      })
    } else if (spendChange < -0.4 && latest.spend > 0) {
      alerts.push({
        type: 'spend_drop',
        severity: 'warning',
        title: 'Spend dropped significantly',
        detail: `Spend fell from $${previous.spend.toLocaleString()} to $${latest.spend.toLocaleString()} (-${Math.round(Math.abs(spendChange) * 100)}%). Check campaign delivery.`,
        metric: latest.spend,
        threshold: previous.spend * 0.6,
      })
    }
  }

  // 6. Positive Milestones
  if (latest.roas >= 5.0) {
    alerts.push({
      type: 'roas_excellent',
      severity: 'info',
      title: 'Exceptional ROAS',
      detail: `${latest.roas}x ROAS this period — outstanding performance.`,
      metric: latest.roas,
    })
  }
  if (totalMoveIns >= 10 && totalMoveIns % 10 === totalMoveIns) {
    // First time hitting 10+ move-ins
    alerts.push({
      type: 'movein_milestone',
      severity: 'info',
      title: `${totalMoveIns}+ total move-ins`,
      detail: `${client.facilityName} has generated ${totalMoveIns} move-ins across ${campaigns.length} months.`,
      metric: totalMoveIns,
    })
  }
  if (latest.cpl < avgCpl * 0.7 && campaigns.length >= 3) {
    alerts.push({
      type: 'cpl_improved',
      severity: 'info',
      title: 'CPL significantly improved',
      detail: `Current CPL ($${latest.cpl.toFixed(2)}) is ${Math.round((1 - latest.cpl / avgCpl) * 100)}% below average ($${avgCpl.toFixed(2)}).`,
      metric: latest.cpl,
    })
  }

  return alerts
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
    return res.status(200).json({ alerts: [], clientAlerts: {} })
  }

  try {
    // Get all client records
    const clientKeys = await redis.keys('client:*')
    if (!clientKeys.length) {
      return res.status(200).json({ alerts: [], clientAlerts: {} })
    }

    const pipeline = redis.pipeline()
    clientKeys.forEach(k => pipeline.get(k))
    const clientResults = await pipeline.exec()

    const allAlerts = []
    const clientAlerts = {}

    for (let i = 0; i < clientKeys.length; i++) {
      const raw = clientResults[i]
      if (!raw) continue
      const client = typeof raw === 'string' ? JSON.parse(raw) : raw
      const code = clientKeys[i].replace('client:', '')

      const campaigns = client.campaigns || []
      const alerts = generateAlerts(client, campaigns)

      if (alerts.length > 0) {
        clientAlerts[code] = {
          facilityName: client.facilityName,
          email: client.email,
          alerts,
        }
        alerts.forEach(a => {
          allAlerts.push({
            ...a,
            accessCode: code,
            facilityName: client.facilityName,
          })
        })
      }
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    allAlerts.sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9))

    return res.status(200).json({
      alerts: allAlerts,
      clientAlerts,
      summary: {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        warning: allAlerts.filter(a => a.severity === 'warning').length,
        info: allAlerts.filter(a => a.severity === 'info').length,
      },
    })
  } catch (err) {
    console.error('Campaign alerts error:', err)
    return res.status(500).json({ error: 'Failed to generate alerts' })
  }
}
