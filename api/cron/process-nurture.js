/**
 * Nurture Sequence Processor — Cron Job
 *
 * Processes pending nurture messages: sends SMS via Twilio or email via Resend.
 * Resolves merge tags against facility/lead data before sending.
 *
 * Schedule: Every 5 minutes (Vercel cron: */5 * * * *)
 * Auth: Bearer {CRON_SECRET}
 *
 * Does NOT touch drip_sequences, process-drips, or process-recovery.
 */
import { query, queryOne } from '../_db.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'

export default async function handler(req, res) {
  // Auth
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (!auth || auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    // Fetch all active enrollments that are due
    const dueEnrollments = await query(`
      SELECT ne.*, ns.steps as seq_steps, ns.name as seq_name, ns.trigger_type
      FROM nurture_enrollments ne
      JOIN nurture_sequences ns ON ns.id = ne.sequence_id
      WHERE ne.status = 'active'
        AND ne.next_send_at <= NOW()
        AND ns.status = 'active'
      ORDER BY ne.next_send_at ASC
      LIMIT 50
    `)

    let sent = 0, failed = 0, completed = 0, skipped = 0

    for (const enrollment of dueEnrollments) {
      try {
        const steps = typeof enrollment.seq_steps === 'string'
          ? JSON.parse(enrollment.seq_steps) : enrollment.seq_steps
        const currentStepIdx = enrollment.current_step
        const step = steps[currentStepIdx]

        if (!step) {
          // No more steps — complete
          await query(`UPDATE nurture_enrollments SET status = 'completed', completed_at = NOW(), next_send_at = NULL WHERE id = $1`, [enrollment.id])
          completed++
          continue
        }

        // Check send window for SMS
        if (step.channel === 'sms' && step.send_window) {
          const now = new Date()
          const hour = now.getHours() // server local time (approximate)
          const startHour = parseInt(step.send_window.start?.split(':')[0] || '9')
          const endHour = parseInt(step.send_window.end?.split(':')[0] || '21')
          if (hour < startHour || hour >= endHour) {
            skipped++
            continue // Will retry on next cron run
          }
        }

        // Get facility data for merge tags
        const facility = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [enrollment.facility_id])
        const metadata = typeof enrollment.metadata === 'string'
          ? JSON.parse(enrollment.metadata) : (enrollment.metadata || {})

        // Resolve merge tags
        const resolvedBody = resolveMergeTags(step.body, {
          ...metadata,
          first_name: enrollment.contact_name?.split(' ')[0] || 'there',
          contact_name: enrollment.contact_name || '',
          facility_name: facility?.name || '',
          facility_location: facility?.location || '',
          facility_phone: facility?.google_phone || facility?.contact_phone || '',
          reserve_link: metadata.reserve_link || `${SITE_URL}/reserve`,
          review_link: metadata.review_link || facility?.google_maps_url || '',
          feedback_link: metadata.feedback_link || `${SITE_URL}/feedback`,
        })

        const resolvedSubject = step.subject
          ? resolveMergeTags(step.subject, {
              ...metadata,
              first_name: enrollment.contact_name?.split(' ')[0] || 'there',
              facility_name: facility?.name || '',
              unit_size: metadata.unit_size || 'storage',
            })
          : null

        const toAddress = step.channel === 'sms' ? enrollment.contact_phone : enrollment.contact_email

        if (!toAddress) {
          // Missing contact info for this channel — skip step
          await logMessage(enrollment.id, currentStepIdx, step.channel, 'unknown', resolvedSubject, resolvedBody, 'failed', null, 'No contact info for this channel')
          failed++
          advanceStep(enrollment.id, steps, currentStepIdx)
          continue
        }

        // Send the message
        let externalId = null
        if (step.channel === 'sms') {
          const smsResult = await sendSMS(toAddress, resolvedBody, enrollment.facility_id)
          externalId = smsResult.messageSid
        } else {
          const emailResult = await sendEmail(toAddress, resolvedSubject || `Message from ${facility?.name || 'StowStack'}`, resolvedBody, facility?.name)
          externalId = emailResult.id
        }

        // Log the message
        await logMessage(enrollment.id, currentStepIdx, step.channel, toAddress, resolvedSubject, resolvedBody, 'sent', externalId, null)
        sent++

        // Advance to next step
        await advanceStep(enrollment.id, steps, currentStepIdx)

      } catch (err) {
        console.error(`Nurture send error for enrollment ${enrollment.id}:`, err.message)
        await logMessage(enrollment.id, enrollment.current_step, 'unknown', '', null, '', 'failed', null, err.message).catch(() => {})
        failed++
      }
    }

    return res.status(200).json({
      processed: dueEnrollments.length,
      sent, failed, completed, skipped,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Nurture cron error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

/* ── Merge tag resolver ── */
function resolveMergeTags(template, data) {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : match
  })
}

/* ── Advance enrollment to next step ── */
async function advanceStep(enrollmentId, steps, currentStepIdx) {
  const nextIdx = currentStepIdx + 1
  if (nextIdx >= steps.length) {
    await query(`UPDATE nurture_enrollments SET status = 'completed', completed_at = NOW(), current_step = $2, next_send_at = NULL WHERE id = $1`, [enrollmentId, nextIdx])
  } else {
    const nextStep = steps[nextIdx]
    const delayMs = (nextStep.delay_minutes || 60) * 60 * 1000
    const nextSendAt = new Date(Date.now() + delayMs).toISOString()
    await query(`UPDATE nurture_enrollments SET current_step = $2, next_send_at = $3 WHERE id = $1`, [enrollmentId, nextIdx, nextSendAt])
  }
}

/* ── Message logger ── */
async function logMessage(enrollmentId, stepNumber, channel, toAddress, subject, body, status, externalId, errorMessage) {
  await query(`
    INSERT INTO nurture_messages (enrollment_id, step_number, channel, to_address, subject, body, status, external_id, sent_at, error_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [enrollmentId, stepNumber, channel, toAddress, subject, body, status, externalId, status === 'sent' ? new Date().toISOString() : null, errorMessage])
}

/* ── SMS sender (uses Twilio REST API directly) ── */
async function sendSMS(to, body, facilityId) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio not configured')

  // Get from number
  let fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!fromNumber && facilityId) {
    const tracking = await queryOne(
      `SELECT phone_number FROM call_tracking_numbers WHERE facility_id = $1 AND status = 'active' LIMIT 1`,
      [facilityId]
    )
    if (tracking) fromNumber = tracking.phone_number
  }
  if (!fromNumber) throw new Error('No SMS from number configured')

  const bodyWithOptOut = body.includes('STOP') ? body : `${body}\n\nReply STOP to opt out`

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: bodyWithOptOut }),
    }
  )
  const result = await twilioRes.json()
  if (result.error_code) throw new Error(`Twilio: ${result.message}`)
  return result
}

/* ── Email sender (uses Resend) ── */
async function sendEmail(to, subject, body, facilityName) {
  const result = await resend.emails.send({
    from: `${facilityName || 'StowStack'} <notifications@stowstack.co>`,
    to: [to],
    subject,
    text: body,
  })
  if (result.error) throw new Error(`Resend: ${result.error.message}`)
  return result.data
}
