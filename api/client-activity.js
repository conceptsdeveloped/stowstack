import { query } from './_db.js'

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

// Only show these activity types to clients
const CLIENT_VISIBLE_TYPES = [
  'lead_created',
  'lead_captured',
  'call_received',
  'walkin_logged',
  'report_sent',
  'onboarding_step',
  'campaign_added',
  'audit_generated',
  'audit_approved',
]

// Human-readable labels
const TYPE_LABELS = {
  lead_created: 'New lead submitted',
  lead_captured: 'Lead captured from landing page',
  call_received: 'Phone call received',
  walkin_logged: 'Walk-in attribution logged',
  report_sent: 'Performance report sent',
  onboarding_step: 'Onboarding step completed',
  campaign_added: 'Campaign data updated',
  audit_generated: 'Facility audit generated',
  audit_approved: 'Audit report sent',
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { accessCode, email, facilityId, since, limit } = req.query || {}

    // Resolve facility ID from access code + email
    let resolvedFacilityId = facilityId
    if (!resolvedFacilityId && accessCode && email) {
      const client = await query(
        `SELECT c.facility_id FROM clients c
         WHERE c.access_code = $1 AND LOWER(c.email) = LOWER($2)`,
        [accessCode, email.trim()]
      )
      if (client.length === 0) return res.status(401).json({ error: 'Unauthorized' })
      resolvedFacilityId = client[0].facility_id
    }

    if (!resolvedFacilityId) {
      return res.status(400).json({ error: 'Missing facility identifier' })
    }

    let dateFilter = ''
    const params = [resolvedFacilityId]

    if (since) {
      params.push(since)
      dateFilter = ` AND created_at > $${params.length}`
    }

    const maxRows = Math.min(parseInt(limit) || 30, 100)
    params.push(maxRows)

    // Filter to client-visible types only
    const typePlaceholders = CLIENT_VISIBLE_TYPES.map((_, i) => `$${params.length + i + 1}`).join(', ')
    params.push(...CLIENT_VISIBLE_TYPES)

    const activities = await query(
      `SELECT id, type, lead_name, facility_name, detail, created_at
       FROM activity_log
       WHERE facility_id = $1 ${dateFilter}
       AND type IN (${typePlaceholders})
       ORDER BY created_at DESC
       LIMIT $${params.length - CLIENT_VISIBLE_TYPES.length}`,
      params
    )

    // Add human-readable labels
    const data = activities.map(a => ({
      id: a.id,
      type: a.type,
      label: TYPE_LABELS[a.type] || a.type,
      detail: a.detail || '',
      leadName: a.lead_name || null,
      createdAt: a.created_at,
    }))

    return res.json({ success: true, data })
  } catch (err) {
    console.error('client-activity error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
