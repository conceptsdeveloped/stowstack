import { query, queryOne } from '../_db.js'
import { SEQUENCES } from '../drip-sequences.js'

/*
  Vercel Cron: Process Abandoned Form Recovery
  Schedule: Every 30 minutes (*/30 * * * *)

  Finds partial leads with email who haven't converted,
  sends recovery emails on a timed sequence (1hr, 24hr, 72hr),
  and marks leads as exhausted after final email.
  Also sends admin alerts for hot abandoned leads (score >= 60).
*/

const RECOVERY_SEQUENCE = SEQUENCES.recovery

function logActivity({ type, facilityId, leadName, facilityName, detail, meta }) {
  query(
    `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, facilityId || null, leadName || '', facilityName || '', (detail || '').slice(0, 500), JSON.stringify(meta || {})]
  ).catch(err => console.error('Activity log error:', err))
}

async function sendRecoveryEmail(partialLead, step) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('No RESEND_API_KEY — skipping recovery email')
    return { preview: true }
  }

  // Build a return URL with pre-fill params
  let returnUrl = 'https://stowstack.co'
  if (partialLead.page_slug) {
    returnUrl = `https://stowstack.co/p/${partialLead.page_slug}`
  }

  // Add recovery attribution + pre-fill params
  const params = new URLSearchParams({
    utm_source: 'recovery_drip',
    utm_medium: 'email',
    utm_campaign: step.templateId,
    recovery_id: partialLead.id,
  })
  if (partialLead.name) params.set('prefill_name', partialLead.name)
  if (partialLead.email) params.set('prefill_email', partialLead.email)
  if (partialLead.phone) params.set('prefill_phone', partialLead.phone)

  returnUrl += `?${params.toString()}`

  // Build lead object for template
  const lead = {
    name: partialLead.name || '',
    email: partialLead.email,
    facilityName: partialLead.page_title || '',
    unitSize: partialLead.unit_size || '',
    returnUrl,
  }

  // Import template and render
  const { default: sendTemplateHandler } = await import('../send-template.js')

  // Direct Resend call with recovery template content
  const TEMPLATES = (await import('../send-template.js')).default
  // We'll call Resend directly since send-template expects facility IDs

  const templateId = step.templateId

  // Dynamically import to get the TEMPLATES object
  const templateModule = await import('../send-template.js')

  // Build email HTML by calling template functions directly
  // Recovery templates are defined in send-template.js TEMPLATES
  const subject = getRecoverySubject(templateId, lead)
  const html = getRecoveryBody(templateId, lead)

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Blake at StowStack <noreply@stowstack.co>',
      to: partialLead.email,
      reply_to: ['blake@storepawpaw.com'],
      subject,
      html,
    }),
  })

  if (!emailRes.ok) {
    const text = await emailRes.text()
    throw new Error(`Recovery email failed (${emailRes.status}): ${text}`)
  }

  return emailRes.json()
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getRecoverySubject(templateId, lead) {
  switch (templateId) {
    case 'recovery_1hr':
      return `Still looking for storage${lead.facilityName ? ` near ${lead.facilityName}` : ''}?`
    case 'recovery_24hr':
      return `Don't miss out — units are filling up${lead.facilityName ? ` at ${lead.facilityName}` : ''}`
    case 'recovery_72hr':
      return `A little something to help you decide${lead.facilityName ? ` — ${lead.facilityName}` : ''}`
    default:
      return 'Your storage unit is still available'
  }
}

function getRecoveryBody(templateId, lead) {
  const firstName = lead.name ? esc(lead.name.trim().split(' ')[0]) : 'there'
  const returnUrl = esc(lead.returnUrl || 'https://stowstack.co')

  switch (templateId) {
    case 'recovery_1hr':
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>${lead.unitSize ? `It looks like you were checking out <strong>${esc(lead.unitSize)}</strong> units. ` : ''}Good news — units are still available and we are holding your spot.</p>
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #166534; font-size: 18px;">Your unit is still available</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">Pick up right where you left off — takes less than 60 seconds.</p>
            <a href="${returnUrl}" style="display: inline-block; padding: 14px 32px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reserve Your Unit</a>
          </div>
          <p style="font-size: 13px; color: #6b7280;">Questions? Just reply to this email or call us at <a href="tel:2699298541" style="color: #16a34a;">269-929-8541</a>.</p>
        </div>`

    case 'recovery_24hr':
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>Just a heads up — we have seen a few units get reserved since yesterday, and availability is getting tighter.</p>
          <div style="margin: 24px 0; padding: 16px 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: 600; color: #92400e;">Units are going fast</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #78350f;">We can not guarantee pricing or availability beyond today. Lock in your rate now.</p>
          </div>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${returnUrl}" style="display: inline-block; padding: 14px 32px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reserve Now — Keep Your Rate</a>
          </div>
          <p style="font-size: 13px; color: #6b7280;">Need help deciding? Call us at <a href="tel:2699298541" style="color: #16a34a;">269-929-8541</a> — we will walk you through options.</p>
        </div>`

    case 'recovery_72hr':
      return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
          <p>Hey ${firstName},</p>
          <p>We know finding the right storage spot takes time. To make the decision a little easier, we have got something for you:</p>
          <div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #022c22, #0f172a); border-radius: 16px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #34d399; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Limited Time Offer</p>
            <p style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: white;">$1 First Month</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #94a3b8;">Reserve in the next 48 hours to lock this in.</p>
            <a href="${returnUrl}${returnUrl.includes('?') ? '&' : '?'}promo=COMEBACK1" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Claim Your $1 First Month</a>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This offer expires in 48 hours and is limited to new reservations only. Questions? Reply to this email or call <a href="tel:2699298541" style="color: #16a34a;">269-929-8541</a>.</p>
        </div>`

    default:
      return ''
  }
}

async function sendHotLeadAlert(partialLead) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="padding: 16px 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 600; color: #991b1b;">Hot Abandoned Lead (Score: ${partialLead.lead_score})</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${partialLead.name ? `<tr><td style="padding: 6px 12px; color: #666;">Name</td><td style="padding: 6px 12px;">${esc(partialLead.name)}</td></tr>` : ''}
        <tr><td style="padding: 6px 12px; color: #666;">Email</td><td style="padding: 6px 12px;"><a href="mailto:${esc(partialLead.email)}">${esc(partialLead.email)}</a></td></tr>
        ${partialLead.phone ? `<tr><td style="padding: 6px 12px; color: #666;">Phone</td><td style="padding: 6px 12px;">${esc(partialLead.phone)}</td></tr>` : ''}
        ${partialLead.unit_size ? `<tr><td style="padding: 6px 12px; color: #666;">Unit Size</td><td style="padding: 6px 12px;">${esc(partialLead.unit_size)}</td></tr>` : ''}
        ${partialLead.page_title ? `<tr><td style="padding: 6px 12px; color: #666;">Landing Page</td><td style="padding: 6px 12px;">${esc(partialLead.page_title)}</td></tr>` : ''}
        <tr><td style="padding: 6px 12px; color: #666;">Fields Completed</td><td style="padding: 6px 12px;">${partialLead.fields_completed}/${partialLead.total_fields}</td></tr>
        <tr><td style="padding: 6px 12px; color: #666;">Time on Page</td><td style="padding: 6px 12px;">${Math.round(partialLead.time_on_page / 60)}m ${partialLead.time_on_page % 60}s</td></tr>
        <tr><td style="padding: 6px 12px; color: #666;">Scroll Depth</td><td style="padding: 6px 12px;">${partialLead.scroll_depth}%</td></tr>
        ${partialLead.utm_source ? `<tr><td style="padding: 6px 12px; color: #666;">Source</td><td style="padding: 6px 12px;">${esc(partialLead.utm_source)} / ${esc(partialLead.utm_medium || '')}</td></tr>` : ''}
      </table>
      <p style="margin-top: 16px; font-size: 12px; color: #999;">Recovery sequence has been started automatically. This lead scored ${partialLead.lead_score}/100 — consider a personal follow-up call.</p>
    </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'StowStack <notifications@stowstack.co>',
      to: ['blake@urkovro.resend.app'],
      subject: `🔥 Hot abandoned lead: ${partialLead.email} (Score: ${partialLead.lead_score})`,
      html,
    }),
  }).catch(err => console.error('Hot lead alert failed:', err.message))
}

export default async function handler(req, res) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const results = { processed: 0, sent: 0, exhausted: 0, alerts: 0, errors: [] }

  try {
    // 1. Find partial leads ready for recovery emails
    const dueLeads = await query(`
      SELECT pl.*, lp.title AS page_title, lp.slug AS page_slug
      FROM partial_leads pl
      LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
      WHERE pl.recovery_status IN ('pending', 'active')
        AND pl.email IS NOT NULL
        AND pl.converted = FALSE
        AND pl.next_recovery_at <= NOW()
      ORDER BY pl.lead_score DESC
      LIMIT 50
    `)

    for (const lead of dueLeads) {
      try {
        results.processed++

        // Check if this email has since submitted a full form (converted elsewhere)
        const fullLead = await queryOne(
          `SELECT id FROM facilities WHERE contact_email = $1 AND created_at > $2`,
          [lead.email, lead.created_at]
        )

        if (fullLead) {
          await query(
            `UPDATE partial_leads SET converted = TRUE, converted_at = NOW(), recovery_status = 'converted' WHERE id = $1`,
            [lead.id]
          )
          continue
        }

        const stepIdx = lead.recovery_sent_count || 0
        const steps = RECOVERY_SEQUENCE.steps

        if (stepIdx >= steps.length) {
          // All recovery emails sent
          await query(
            `UPDATE partial_leads SET recovery_status = 'exhausted', updated_at = NOW() WHERE id = $1`,
            [lead.id]
          )
          results.exhausted++
          continue
        }

        const step = steps[stepIdx]

        // Send the recovery email
        try {
          await sendRecoveryEmail(lead, step)

          // Calculate next recovery time
          const nextStepIdx = stepIdx + 1
          let nextRecoveryAt = null
          if (nextStepIdx < steps.length) {
            const nextStep = steps[nextStepIdx]
            nextRecoveryAt = new Date(now.getTime() + nextStep.delayHours * 60 * 60 * 1000).toISOString()
          }

          await query(
            `UPDATE partial_leads SET
              recovery_sent_count = $1,
              recovery_status = CASE WHEN $2::timestamptz IS NULL THEN 'exhausted' ELSE 'active' END,
              next_recovery_at = $2,
              updated_at = NOW()
            WHERE id = $3`,
            [nextStepIdx, nextRecoveryAt, lead.id]
          )

          logActivity({
            type: 'recovery_sent',
            facilityId: lead.facility_id,
            leadName: lead.name || lead.email,
            facilityName: lead.page_title || '',
            detail: `Recovery email sent: "${step.label}" to ${lead.email}`,
            meta: { partialLeadId: lead.id, step: stepIdx, templateId: step.templateId },
          })

          results.sent++

          if (!nextRecoveryAt) results.exhausted++
        } catch (emailErr) {
          console.error(`Recovery email failed for ${lead.email}:`, emailErr.message)
          results.errors.push({ id: lead.id, email: lead.email, error: emailErr.message })
        }
      } catch (leadErr) {
        console.error(`Error processing partial lead ${lead.id}:`, leadErr.message)
        results.errors.push({ id: lead.id, error: leadErr.message })
      }
    }

    // 2. Send hot lead alerts for new high-score partial leads
    const hotLeads = await query(`
      SELECT pl.*, lp.title AS page_title, lp.slug AS page_slug
      FROM partial_leads pl
      LEFT JOIN landing_pages lp ON pl.landing_page_id = lp.id
      WHERE pl.lead_score >= 60
        AND pl.email IS NOT NULL
        AND pl.converted = FALSE
        AND pl.recovery_sent_count = 0
        AND pl.recovery_status = 'pending'
        AND pl.created_at >= NOW() - INTERVAL '1 hour'
    `)

    for (const hotLead of hotLeads) {
      try {
        await sendHotLeadAlert(hotLead)
        results.alerts++
      } catch (alertErr) {
        console.error(`Hot lead alert failed for ${hotLead.email}:`, alertErr.message)
      }
    }

    return res.status(200).json({ success: true, ...results })
  } catch (err) {
    console.error('Recovery cron fatal error:', err)
    return res.status(500).json({ error: 'Recovery cron failed', message: err.message })
  }
}
