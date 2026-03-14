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

/*
  Drip Sequence Definitions

  Each sequence has an id, name, and ordered steps.
  Steps reference template IDs from send-template.js and specify a delay in days
  from the enrollment date.
*/

export const SEQUENCES = {
  post_audit: {
    id: 'post_audit',
    name: 'Post-Audit Follow-up',
    description: 'Automated nurture sequence after audit form submission',
    steps: [
      { delayDays: 2, templateId: 'follow_up', label: 'Warm follow-up' },
      { delayDays: 5, templateId: 'value_add', label: 'Personalized tip' },
      { delayDays: 10, templateId: 'check_in', label: 'Check-in' },
      { delayDays: 21, templateId: 'last_chance', label: 'Final touch' },
    ],
  },
}

// Statuses that should auto-cancel a drip sequence
const CANCEL_STATUSES = ['call_scheduled', 'client_signed', 'lost']

/**
 * Enroll a lead in a drip sequence. Exported for use by audit-form.js and cron.
 */
export async function enrollLead(redis, leadId, sequenceId = 'post_audit') {
  const sequence = SEQUENCES[sequenceId]
  if (!sequence) throw new Error(`Unknown sequence: ${sequenceId}`)

  const now = new Date()
  const firstStep = sequence.steps[0]
  const nextSendAt = new Date(now.getTime() + firstStep.delayDays * 24 * 60 * 60 * 1000)

  const drip = {
    sequenceId,
    leadId,
    currentStep: 0,
    status: 'active',
    enrolledAt: now.toISOString(),
    nextSendAt: nextSendAt.toISOString(),
    history: [],
  }

  await redis.set(`drip:${leadId}`, JSON.stringify(drip))
  return drip
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ success: true, preview: true, message: 'No data store configured' })
  }

  // GET — list all drip sequences + active drips for all leads
  if (req.method === 'GET') {
    try {
      // Return sequence definitions
      const sequences = Object.values(SEQUENCES).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        steps: s.steps,
      }))

      // Scan for all active drips
      const drips = []
      let cursor = 0
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: 'drip:*', count: 100 })
        cursor = Number(nextCursor)
        for (const key of keys) {
          const raw = await redis.get(key)
          if (raw) {
            const drip = typeof raw === 'string' ? JSON.parse(raw) : raw
            // Fetch lead name/facility for display
            const leadRaw = await redis.get(`lead:${drip.leadId}`)
            const lead = leadRaw ? (typeof leadRaw === 'string' ? JSON.parse(leadRaw) : leadRaw) : null
            drips.push({
              ...drip,
              leadName: lead?.name || 'Unknown',
              leadEmail: lead?.email || '',
              facilityName: lead?.facilityName || 'Unknown',
              leadStatus: lead?.status || '',
            })
          }
        }
      } while (cursor !== 0)

      return res.status(200).json({ sequences, drips })
    } catch (err) {
      console.error('Drip sequences GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch drip data' })
    }
  }

  // POST — manually enroll a lead in a sequence
  if (req.method === 'POST') {
    const { leadId, sequenceId = 'post_audit' } = req.body || {}
    if (!leadId) return res.status(400).json({ error: 'Missing leadId' })

    try {
      // Check if lead exists
      const leadRaw = await redis.get(`lead:${leadId}`)
      if (!leadRaw) return res.status(404).json({ error: 'Lead not found' })

      // Check if already enrolled
      const existing = await redis.get(`drip:${leadId}`)
      if (existing) {
        const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing
        if (parsed.status === 'active' || parsed.status === 'paused') {
          return res.status(400).json({ error: 'Lead already has an active drip sequence' })
        }
      }

      const drip = await enrollLead(redis, leadId, sequenceId)
      return res.status(200).json({ success: true, drip })
    } catch (err) {
      console.error('Drip enroll error:', err)
      return res.status(500).json({ error: 'Failed to enroll lead' })
    }
  }

  // PATCH — pause or resume a drip
  if (req.method === 'PATCH') {
    const { leadId, action } = req.body || {}
    if (!leadId || !['pause', 'resume'].includes(action)) {
      return res.status(400).json({ error: 'Missing leadId or invalid action (pause/resume)' })
    }

    try {
      const raw = await redis.get(`drip:${leadId}`)
      if (!raw) return res.status(404).json({ error: 'No drip sequence found for this lead' })
      const drip = typeof raw === 'string' ? JSON.parse(raw) : raw

      if (action === 'pause' && drip.status !== 'active') {
        return res.status(400).json({ error: 'Can only pause active sequences' })
      }
      if (action === 'resume' && drip.status !== 'paused') {
        return res.status(400).json({ error: 'Can only resume paused sequences' })
      }

      if (action === 'pause') {
        drip.status = 'paused'
        drip.pausedAt = new Date().toISOString()
      } else {
        // Resume: recalculate nextSendAt based on remaining delay
        const sequence = SEQUENCES[drip.sequenceId]
        if (sequence && drip.currentStep < sequence.steps.length) {
          const step = sequence.steps[drip.currentStep]
          const now = new Date()
          // Give at least 1 day from resume
          const nextSendAt = new Date(now.getTime() + Math.max(1, step.delayDays - drip.currentStep) * 24 * 60 * 60 * 1000)
          drip.nextSendAt = nextSendAt.toISOString()
        }
        drip.status = 'active'
        delete drip.pausedAt
      }

      await redis.set(`drip:${leadId}`, JSON.stringify(drip))
      return res.status(200).json({ success: true, drip })
    } catch (err) {
      console.error('Drip patch error:', err)
      return res.status(500).json({ error: 'Failed to update drip' })
    }
  }

  // DELETE — cancel a drip sequence
  if (req.method === 'DELETE') {
    const { leadId } = req.body || {}
    if (!leadId) return res.status(400).json({ error: 'Missing leadId' })

    try {
      const raw = await redis.get(`drip:${leadId}`)
      if (!raw) return res.status(404).json({ error: 'No drip sequence found' })
      const drip = typeof raw === 'string' ? JSON.parse(raw) : raw

      drip.status = 'cancelled'
      drip.cancelledAt = new Date().toISOString()
      await redis.set(`drip:${leadId}`, JSON.stringify(drip))

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Drip cancel error:', err)
      return res.status(500).json({ error: 'Failed to cancel drip' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
