import { query, queryOne } from './_db.js'

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

/*
  Drip Sequence Definitions
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
  recovery: {
    id: 'recovery',
    name: 'Abandoned Form Recovery',
    description: 'Automated recovery sequence for partial/abandoned landing page leads',
    steps: [
      { delayHours: 1, templateId: 'recovery_1hr', label: 'Quick recovery (1hr)' },
      { delayHours: 24, templateId: 'recovery_24hr', label: 'Urgency nudge (24hr)' },
      { delayHours: 72, templateId: 'recovery_72hr', label: 'Discount offer (72hr)' },
    ],
  },
}

/**
 * Enroll a facility in a drip sequence via Postgres.
 */
export async function enrollLead(facilityId, sequenceId = 'post_audit') {
  const sequence = SEQUENCES[sequenceId]
  if (!sequence) throw new Error(`Unknown sequence: ${sequenceId}`)

  const now = new Date()
  const firstStep = sequence.steps[0]
  const nextSendAt = new Date(now.getTime() + firstStep.delayDays * 24 * 60 * 60 * 1000)

  const rows = await query(
    `INSERT INTO drip_sequences (facility_id, sequence_id, current_step, status, enrolled_at, next_send_at, history)
     VALUES ($1, $2, 0, 'active', $3, $4, '[]')
     ON CONFLICT (facility_id) DO NOTHING
     RETURNING *`,
    [facilityId, sequenceId, now.toISOString(), nextSendAt.toISOString()]
  )

  return rows[0] || null
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list all drip sequences
  if (req.method === 'GET') {
    try {
      const sequences = Object.values(SEQUENCES).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        steps: s.steps,
      }))

      const drips = await query(
        `SELECT ds.*, f.contact_name, f.contact_email, f.name AS facility_name, f.pipeline_status
         FROM drip_sequences ds
         JOIN facilities f ON ds.facility_id = f.id
         ORDER BY ds.enrolled_at DESC`
      )

      const formattedDrips = drips.map(d => ({
        sequenceId: d.sequence_id,
        leadId: d.facility_id,
        currentStep: d.current_step,
        status: d.status,
        enrolledAt: d.enrolled_at,
        nextSendAt: d.next_send_at,
        pausedAt: d.paused_at,
        completedAt: d.completed_at,
        cancelledAt: d.cancelled_at,
        cancelReason: d.cancel_reason,
        history: d.history || [],
        leadName: d.contact_name || 'Unknown',
        leadEmail: d.contact_email || '',
        facilityName: d.facility_name || 'Unknown',
        leadStatus: d.pipeline_status || '',
      }))

      return res.status(200).json({ sequences, drips: formattedDrips })
    } catch (err) {
      console.error('Drip sequences GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch drip data' })
    }
  }

  // POST — manually enroll a lead
  if (req.method === 'POST') {
    const { leadId, sequenceId = 'post_audit' } = req.body || {}
    if (!leadId) return res.status(400).json({ error: 'Missing leadId' })

    try {
      const facility = await queryOne(`SELECT id FROM facilities WHERE id = $1`, [leadId])
      if (!facility) return res.status(404).json({ error: 'Lead not found' })

      const existing = await queryOne(
        `SELECT * FROM drip_sequences WHERE facility_id = $1`, [leadId]
      )
      if (existing && (existing.status === 'active' || existing.status === 'paused')) {
        return res.status(400).json({ error: 'Lead already has an active drip sequence' })
      }

      // Delete old completed/cancelled record so we can re-enroll
      if (existing) {
        await query(`DELETE FROM drip_sequences WHERE facility_id = $1`, [leadId])
      }

      const drip = await enrollLead(leadId, sequenceId)
      return res.status(200).json({ success: true, drip })
    } catch (err) {
      console.error('Drip enroll error:', err)
      return res.status(500).json({ error: 'Failed to enroll lead' })
    }
  }

  // PATCH — pause or resume
  if (req.method === 'PATCH') {
    const { leadId, action } = req.body || {}
    if (!leadId || !['pause', 'resume'].includes(action)) {
      return res.status(400).json({ error: 'Missing leadId or invalid action (pause/resume)' })
    }

    try {
      const drip = await queryOne(`SELECT * FROM drip_sequences WHERE facility_id = $1`, [leadId])
      if (!drip) return res.status(404).json({ error: 'No drip sequence found for this lead' })

      if (action === 'pause' && drip.status !== 'active') {
        return res.status(400).json({ error: 'Can only pause active sequences' })
      }
      if (action === 'resume' && drip.status !== 'paused') {
        return res.status(400).json({ error: 'Can only resume paused sequences' })
      }

      if (action === 'pause') {
        await query(
          `UPDATE drip_sequences SET status = 'paused', paused_at = NOW() WHERE facility_id = $1`,
          [leadId]
        )
      } else {
        const sequence = SEQUENCES[drip.sequence_id]
        let nextSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // default 1 day
        if (sequence && drip.current_step < sequence.steps.length) {
          const step = sequence.steps[drip.current_step]
          nextSendAt = new Date(Date.now() + Math.max(1, step.delayDays - drip.current_step) * 24 * 60 * 60 * 1000)
        }
        await query(
          `UPDATE drip_sequences SET status = 'active', paused_at = NULL, next_send_at = $1 WHERE facility_id = $2`,
          [nextSendAt.toISOString(), leadId]
        )
      }

      const updated = await queryOne(`SELECT * FROM drip_sequences WHERE facility_id = $1`, [leadId])
      return res.status(200).json({ success: true, drip: updated })
    } catch (err) {
      console.error('Drip patch error:', err)
      return res.status(500).json({ error: 'Failed to update drip' })
    }
  }

  // DELETE — cancel
  if (req.method === 'DELETE') {
    const { leadId } = req.body || {}
    if (!leadId) return res.status(400).json({ error: 'Missing leadId' })

    try {
      const drip = await queryOne(`SELECT * FROM drip_sequences WHERE facility_id = $1`, [leadId])
      if (!drip) return res.status(404).json({ error: 'No drip sequence found' })

      await query(
        `UPDATE drip_sequences SET status = 'cancelled', cancelled_at = NOW() WHERE facility_id = $1`,
        [leadId]
      )

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Drip cancel error:', err)
      return res.status(500).json({ error: 'Failed to cancel drip' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
