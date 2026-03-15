import { query } from '../_db.js'
import { SEQUENCES } from '../drip-sequences.js'

/*
  Vercel Cron: Process Drip Sequences
  Schedule: Every hour (0 * * * *)

  Queries drip_sequences with status='active' and next_send_at <= NOW(),
  sends due emails, and advances sequences.
  Auto-cancels sequences when lead status changes to call_scheduled/client_signed/lost.
*/

const CANCEL_STATUSES = ['call_scheduled', 'client_signed', 'lost']

function logActivity({ type, facilityId, leadName, facilityName, detail, meta }) {
  query(
    `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, facilityId, leadName || '', facilityName || '', (detail || '').slice(0, 500), JSON.stringify(meta || {})]
  ).catch(err => console.error('Activity log error:', err))
}

async function sendTemplateEmail(templateId, lead) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const adminKey = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

  const res = await fetch(`${baseUrl}/api/send-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify({ templateId, leadId: lead.id }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`send-template failed (${res.status}): ${text}`)
  }

  return res.json()
}

export default async function handler(req, res) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const results = { processed: 0, sent: 0, cancelled: 0, completed: 0, errors: [] }

  try {
    // Get all active drip sequences with their facility data
    const drips = await query(
      `SELECT ds.*, f.contact_name, f.contact_email, f.name AS facility_name,
              f.pipeline_status, f.biggest_issue, f.occupancy_range, f.total_units
       FROM drip_sequences ds
       JOIN facilities f ON ds.facility_id = f.id
       WHERE ds.status = 'active'`
    )

    for (const drip of drips) {
      try {
        results.processed++

        // Check if lead status should cancel the sequence
        if (CANCEL_STATUSES.includes(drip.pipeline_status)) {
          await query(
            `UPDATE drip_sequences SET status = 'cancelled', cancelled_at = NOW(),
             cancel_reason = $1 WHERE id = $2`,
            [`lead_status_${drip.pipeline_status}`, drip.id]
          )
          logActivity({
            type: 'drip_cancelled',
            facilityId: drip.facility_id,
            leadName: drip.contact_name || '',
            facilityName: drip.facility_name || '',
            detail: `Drip sequence auto-cancelled: lead status changed to ${drip.pipeline_status}`,
            meta: { sequenceId: drip.sequence_id },
          })
          results.cancelled++
          continue
        }

        // Check if it's time to send
        const nextSendAt = new Date(drip.next_send_at)
        if (nextSendAt > now) continue

        const sequence = SEQUENCES[drip.sequence_id]
        if (!sequence) continue

        const step = sequence.steps[drip.current_step]
        if (!step) {
          await query(
            `UPDATE drip_sequences SET status = 'completed', completed_at = NOW() WHERE id = $1`,
            [drip.id]
          )
          results.completed++
          continue
        }

        // Build lead object for send-template
        const lead = {
          id: drip.facility_id,
          name: drip.contact_name,
          email: drip.contact_email,
          facilityName: drip.facility_name,
          biggestIssue: drip.biggest_issue,
          occupancyRange: drip.occupancy_range,
          totalUnits: drip.total_units,
        }

        try {
          await sendTemplateEmail(step.templateId, lead)

          const history = [...(drip.history || []), {
            step: drip.current_step,
            templateId: step.templateId,
            sentAt: now.toISOString(),
          }]

          const nextStep = drip.current_step + 1

          if (nextStep >= sequence.steps.length) {
            await query(
              `UPDATE drip_sequences SET status = 'completed', completed_at = NOW(),
               current_step = $1, history = $2 WHERE id = $3`,
              [nextStep, JSON.stringify(history), drip.id]
            )
            results.completed++
          } else {
            const nextStepDef = sequence.steps[nextStep]
            const enrolledAt = new Date(drip.enrolled_at)
            const newNextSendAt = new Date(enrolledAt.getTime() + nextStepDef.delayDays * 24 * 60 * 60 * 1000)

            await query(
              `UPDATE drip_sequences SET current_step = $1, next_send_at = $2, history = $3 WHERE id = $4`,
              [nextStep, newNextSendAt.toISOString(), JSON.stringify(history), drip.id]
            )
          }

          logActivity({
            type: 'drip_sent',
            facilityId: drip.facility_id,
            leadName: drip.contact_name || '',
            facilityName: drip.facility_name || '',
            detail: `Drip email sent: "${step.label}" (${step.templateId})`,
            meta: { sequenceId: drip.sequence_id, step: drip.current_step, templateId: step.templateId },
          })

          results.sent++
        } catch (emailErr) {
          console.error(`Failed to send drip email for facility ${drip.facility_id}:`, emailErr.message)
          results.errors.push({ facilityId: drip.facility_id, error: emailErr.message })
        }
      } catch (dripErr) {
        console.error(`Error processing drip ${drip.id}:`, dripErr.message)
        results.errors.push({ id: drip.id, error: dripErr.message })
      }
    }

    return res.status(200).json({ success: true, ...results })
  } catch (err) {
    console.error('Drip cron fatal error:', err)
    return res.status(500).json({ error: 'Cron processing failed', message: err.message })
  }
}
