/**
 * Nurture Sequences API — CRUD + Enrollment Management
 *
 * GET    /api/nurture-sequences?facilityId=X
 * POST   /api/nurture-sequences  { action: 'create_sequence' | 'enroll' | 'create_from_template' }
 * PATCH  /api/nurture-sequences  { enrollmentId, action: 'pause' | 'resume' | 'skip' | 'convert' | 'unsubscribe' }
 * DELETE /api/nurture-sequences?id=X&type=sequence|enrollment
 *
 * NEW tables only — does NOT touch drip_sequences or existing endpoints.
 */
import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

/* ══════════════════════════════════════════
   PRE-BUILT SEQUENCE TEMPLATES
   Used for one-click setup — operators select a template,
   we create a nurture_sequence with pre-filled steps.
══════════════════════════════════════════ */
export const SEQUENCE_TEMPLATES = {
  landing_page_abandon: {
    name: 'Landing Page Visitor Recovery',
    trigger_type: 'landing_page_abandon',
    steps: [
      { step_number: 1, delay_minutes: 60, channel: 'sms', subject: null, body: 'Hey {first_name}, still looking for storage near {facility_location}? That {unit_size} at {facility_name} is still available at ${unit_rate}/mo. Reserve it here: {reserve_link}', send_window: { start: '09:00', end: '20:00' } },
      { step_number: 2, delay_minutes: 1440, channel: 'email', subject: 'Your {unit_size} unit is still waiting at {facility_name}', body: 'Hi {first_name},\n\nYou were looking at a {unit_size} unit at {facility_name}. Good news — it\'s still available.\n\n\u2022 Rate: ${unit_rate}/month\n\u2022 Location: {facility_location}\n\nReserve it now: {reserve_link}\n\nQuestions? Call us at {facility_phone}.\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 3, delay_minutes: 4320, channel: 'sms', subject: null, body: 'Heads up {first_name} \u2014 people are viewing storage near {facility_location} today. Your {unit_size} unit is still open. Lock it in: {reserve_link}', send_window: { start: '10:00', end: '19:00' } },
      { step_number: 4, delay_minutes: 10080, channel: 'email', subject: 'Last chance: {unit_size} at {facility_name}', body: 'Hi {first_name},\n\nWe\'re running a limited-time offer at {facility_name}: first month at 50% off when you reserve this week.\n\n{unit_size} unit: ${unit_rate}/mo (first month just ${half_rate})\n\nReserve: {reserve_link}\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 5, delay_minutes: 20160, channel: 'email', subject: 'We saved a spot for you, {first_name}', body: 'Hi {first_name},\n\nA couple weeks ago you were looking for storage near {facility_location}. If you still need space, we\'ve got you covered.\n\nReserve your unit: {reserve_link}\n\nIf your plans changed, no worries \u2014 we won\'t bother you again.\n\n\u2014 {facility_name} Team', send_window: null },
    ],
  },
  reservation_abandon: {
    name: 'Incomplete Reservation Recovery',
    trigger_type: 'reservation_abandon',
    steps: [
      { step_number: 1, delay_minutes: 30, channel: 'sms', subject: null, body: 'Hey {first_name}, looks like you didn\'t finish reserving your {unit_size} at {facility_name}. Need help? Reply here or call {facility_phone}: {reserve_link}', send_window: { start: '08:00', end: '21:00' } },
      { step_number: 2, delay_minutes: 240, channel: 'email', subject: 'Finish your reservation at {facility_name}', body: 'Hi {first_name},\n\nYou started reserving a {unit_size} unit at {facility_name} but didn\'t finish.\n\n\u2022 Unit: {unit_size}\n\u2022 Rate: ${unit_rate}/month\n\nPick up where you left off: {reserve_link}\n\nCall us at {facility_phone} if you need help.\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 3, delay_minutes: 1440, channel: 'sms', subject: null, body: '{first_name}, your {unit_size} reservation at {facility_name} expires today. Finish here before someone else grabs it: {reserve_link}', send_window: { start: '10:00', end: '18:00' } },
    ],
  },
  post_move_in: {
    name: 'New Tenant Lifecycle',
    trigger_type: 'post_move_in',
    steps: [
      { step_number: 1, delay_minutes: 120, channel: 'sms', subject: null, body: 'Welcome to {facility_name}, {first_name}! Your gate code is {gate_code}. Office hours: {office_hours}. Questions anytime: {facility_phone}', send_window: { start: '08:00', end: '20:00' } },
      { step_number: 2, delay_minutes: 10080, channel: 'email', subject: 'How\'s everything going, {first_name}?', body: 'Hi {first_name},\n\nYou\'ve been with us at {facility_name} for a week. How\'s everything going?\n\nIf you need anything \u2014 different unit size, packing supplies, access questions \u2014 just reply or call {facility_phone}.\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 3, delay_minutes: 43200, channel: 'sms', subject: null, body: 'Hey {first_name}! You\'ve been at {facility_name} for 30 days. If we\'re doing a good job, would you mind leaving us a quick Google review? It really helps: {review_link}', send_window: { start: '10:00', end: '18:00' } },
      { step_number: 4, delay_minutes: 86400, channel: 'email', subject: 'Upgrade opportunity at {facility_name}', body: 'Hi {first_name},\n\nYou\'ve been with us for 60 days \u2014 thanks for being a great tenant.\n\nDid you know we offer:\n\u2022 Tenant protection plans starting at $12/mo\n\u2022 Climate-controlled upgrades\n\u2022 Larger unit options\n\nInterested? Reply or call {facility_phone}.\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 5, delay_minutes: 129600, channel: 'email', subject: 'Your 90-day check-in at {facility_name}', body: 'Hi {first_name},\n\n3 months already! Quick check-in:\n\n\u2705 Right unit size?\n\u2705 On autopay yet?\n\u2705 Want to lock in your current rate?\n\nReply or call {facility_phone}.\n\n\u2014 {facility_name} Team', send_window: null },
    ],
  },
  win_back: {
    name: 'Move-Out Win-Back',
    trigger_type: 'win_back',
    steps: [
      { step_number: 1, delay_minutes: 1440, channel: 'email', subject: 'We\'ll miss you at {facility_name}, {first_name}', body: 'Hi {first_name},\n\nWe\'re sorry to see you go. If you have 30 seconds, we\'d love to know how we did:\n\n{feedback_link}\n\nIf you ever need storage again, you\'ll always have a spot.\n\n\u2014 {facility_name} Team', send_window: null },
      { step_number: 2, delay_minutes: 43200, channel: 'sms', subject: null, body: 'Hey {first_name}, it\'s {facility_name}. Need storage again? Come back and get 25% off your first month. Code: {promo_code}. Reserve: {reserve_link}', send_window: { start: '10:00', end: '18:00' } },
      { step_number: 3, delay_minutes: 129600, channel: 'email', subject: 'Your neighbors are still storing with us, {first_name}', body: 'Hi {first_name},\n\nIt\'s been 3 months since you moved out of {facility_name}. If your storage needs have changed, we\'d love to have you back.\n\nReturning tenant special: 25% off your first month + waived admin fee.\n\nReserve: {reserve_link}\n\n\u2014 {facility_name} Team', send_window: null },
    ],
  },
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  try {
    /* ── GET: List sequences + enrollments ── */
    if (req.method === 'GET') {
      const { facilityId } = req.query
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      const [sequences, enrollments, messages] = await Promise.all([
        query(`SELECT * FROM nurture_sequences WHERE facility_id = $1 ORDER BY created_at DESC`, [facilityId]),
        query(`SELECT * FROM nurture_enrollments WHERE facility_id = $1 ORDER BY enrolled_at DESC LIMIT 200`, [facilityId]),
        query(`
          SELECT nm.* FROM nurture_messages nm
          JOIN nurture_enrollments ne ON ne.id = nm.enrollment_id
          WHERE ne.facility_id = $1
          ORDER BY nm.created_at DESC LIMIT 500
        `, [facilityId]),
      ])

      // Compute stats
      const stats = {
        totalSequences: sequences.length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        converted: enrollments.filter(e => e.status === 'converted').length,
        totalMessages: messages.length,
        smsSent: messages.filter(m => m.channel === 'sms' && m.status !== 'pending').length,
        emailSent: messages.filter(m => m.channel === 'email' && m.status !== 'pending').length,
        deliveryRate: messages.length > 0
          ? Math.round(messages.filter(m => ['sent', 'delivered', 'opened', 'clicked'].includes(m.status)).length / messages.filter(m => m.status !== 'pending').length * 100)
          : 0,
      }

      return res.status(200).json({
        templates: Object.entries(SEQUENCE_TEMPLATES).map(([key, t]) => ({
          key, name: t.name, trigger_type: t.trigger_type, stepCount: t.steps.length,
        })),
        sequences,
        enrollments,
        recentMessages: messages.slice(0, 50),
        stats,
      })
    }

    /* ── POST: Create sequence or enroll lead ── */
    if (req.method === 'POST') {
      const { action } = req.body

      // Create sequence from template
      if (action === 'create_from_template') {
        const { facilityId, templateKey } = req.body
        const template = SEQUENCE_TEMPLATES[templateKey]
        if (!template) return res.status(400).json({ error: `Unknown template: ${templateKey}` })

        const rows = await query(`
          INSERT INTO nurture_sequences (facility_id, name, trigger_type, steps, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING *
        `, [facilityId, template.name, template.trigger_type, JSON.stringify(template.steps)])

        return res.status(201).json({ sequence: rows[0] })
      }

      // Create custom sequence
      if (action === 'create_sequence') {
        const { facilityId, name, triggerType, steps } = req.body
        if (!facilityId || !name || !triggerType) {
          return res.status(400).json({ error: 'facilityId, name, triggerType required' })
        }

        const rows = await query(`
          INSERT INTO nurture_sequences (facility_id, name, trigger_type, steps, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING *
        `, [facilityId, name, triggerType, JSON.stringify(steps || [])])

        return res.status(201).json({ sequence: rows[0] })
      }

      // Enroll a lead/tenant
      if (action === 'enroll') {
        const {
          sequenceId, facilityId,
          contactName, contactEmail, contactPhone,
          leadId, tenantId, metadata,
        } = req.body

        if (!sequenceId || !facilityId) {
          return res.status(400).json({ error: 'sequenceId and facilityId required' })
        }
        if (!contactEmail && !contactPhone) {
          return res.status(400).json({ error: 'At least contactEmail or contactPhone required' })
        }

        // Get sequence to calc first send time
        const seq = await queryOne(`SELECT * FROM nurture_sequences WHERE id = $1`, [sequenceId])
        if (!seq) return res.status(404).json({ error: 'Sequence not found' })

        const steps = typeof seq.steps === 'string' ? JSON.parse(seq.steps) : seq.steps
        const firstStep = steps[0]
        const nextSendAt = firstStep
          ? new Date(Date.now() + (firstStep.delay_minutes || 60) * 60 * 1000).toISOString()
          : null

        const rows = await query(`
          INSERT INTO nurture_enrollments (
            sequence_id, facility_id, lead_id, tenant_id,
            contact_name, contact_email, contact_phone,
            current_step, status, next_send_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'active', $8, $9)
          RETURNING *
        `, [
          sequenceId, facilityId,
          leadId || null, tenantId || null,
          contactName || null, contactEmail || null, contactPhone || null,
          nextSendAt,
          JSON.stringify(metadata || {}),
        ])

        return res.status(201).json({ enrollment: rows[0] })
      }

      return res.status(400).json({ error: 'Invalid action. Use: create_from_template, create_sequence, enroll' })
    }

    /* ── PATCH: Update enrollment status ── */
    if (req.method === 'PATCH') {
      const { enrollmentId, action: patchAction } = req.body
      if (!enrollmentId || !patchAction) return res.status(400).json({ error: 'enrollmentId and action required' })

      if (patchAction === 'pause') {
        await query(`UPDATE nurture_enrollments SET status = 'paused', next_send_at = NULL WHERE id = $1`, [enrollmentId])
      } else if (patchAction === 'resume') {
        // Recalculate next_send_at from current step
        const enrollment = await queryOne(`SELECT * FROM nurture_enrollments WHERE id = $1`, [enrollmentId])
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' })

        const seq = await queryOne(`SELECT * FROM nurture_sequences WHERE id = $1`, [enrollment.sequence_id])
        const steps = typeof seq.steps === 'string' ? JSON.parse(seq.steps) : seq.steps
        const currentStep = steps[enrollment.current_step]
        const nextSendAt = currentStep
          ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // resume in 5 min
          : null

        await query(`UPDATE nurture_enrollments SET status = 'active', next_send_at = $2 WHERE id = $1`, [enrollmentId, nextSendAt])
      } else if (patchAction === 'skip') {
        const enrollment = await queryOne(`SELECT * FROM nurture_enrollments WHERE id = $1`, [enrollmentId])
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' })

        const seq = await queryOne(`SELECT * FROM nurture_sequences WHERE id = $1`, [enrollment.sequence_id])
        const steps = typeof seq.steps === 'string' ? JSON.parse(seq.steps) : seq.steps
        const nextStepIdx = enrollment.current_step + 1

        if (nextStepIdx >= steps.length) {
          await query(`UPDATE nurture_enrollments SET status = 'completed', completed_at = NOW(), current_step = $2, next_send_at = NULL WHERE id = $1`, [enrollmentId, nextStepIdx])
        } else {
          const nextStep = steps[nextStepIdx]
          const nextSendAt = new Date(Date.now() + (nextStep.delay_minutes || 60) * 60 * 1000).toISOString()
          await query(`UPDATE nurture_enrollments SET current_step = $2, next_send_at = $3 WHERE id = $1`, [enrollmentId, nextStepIdx, nextSendAt])
        }
      } else if (patchAction === 'convert') {
        await query(`UPDATE nurture_enrollments SET status = 'converted', exit_reason = 'manual_convert', completed_at = NOW(), next_send_at = NULL WHERE id = $1`, [enrollmentId])
      } else if (patchAction === 'unsubscribe') {
        await query(`UPDATE nurture_enrollments SET status = 'unsubscribed', exit_reason = 'manual_unsubscribe', completed_at = NOW(), next_send_at = NULL WHERE id = $1`, [enrollmentId])
      } else if (patchAction === 'update_sequence') {
        const { sequenceId, name, steps, status: seqStatus } = req.body
        const sets = []
        const params = []
        let idx = 1
        if (name) { sets.push(`name = $${idx++}`); params.push(name) }
        if (steps) { sets.push(`steps = $${idx++}`); params.push(JSON.stringify(steps)) }
        if (seqStatus) { sets.push(`status = $${idx++}`); params.push(seqStatus) }
        sets.push(`updated_at = NOW()`)
        params.push(sequenceId || enrollmentId)
        await query(`UPDATE nurture_sequences SET ${sets.join(', ')} WHERE id = $${idx}`, params)
      }

      return res.status(200).json({ success: true })
    }

    /* ── DELETE: Remove sequence or enrollment ── */
    if (req.method === 'DELETE') {
      const { id, type } = req.query
      if (!id) return res.status(400).json({ error: 'id required' })

      if (type === 'enrollment') {
        await query(`DELETE FROM nurture_enrollments WHERE id = $1`, [id])
      } else {
        // Delete sequence and cascade enrollments
        await query(`DELETE FROM nurture_sequences WHERE id = $1`, [id])
      }

      return res.status(200).json({ deleted: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Nurture sequences error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
