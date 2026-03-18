import { query } from './_db.js'
import { rateLimit, rateLimitResponse } from './_ratelimit.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

const NOTIFICATION_RECIPIENTS = (process.env.AUDIT_NOTIFICATION_EMAILS || 'blake@urkovro.resend.app,anna@storepawpaw.com').split(',').map(e => e.trim())

const VALID_OCCUPANCY = ['below-60', '60-75', '75-85', '85-95', 'above-95']
const VALID_UNITS = ['under-100', '100-300', '300-500', '500+']
const VALID_ISSUES = [
  'standard-units',
  'climate-controlled',
  'drive-up',
  'vehicle-rv-boat',
  'lease-up',
  'low-occupancy',
  'other',
]

// --- CORS ---

function getCorsHeaders(req) {
  const origin = req.headers['origin'] || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

// --- Validation ---

function validate(body) {
  const errors = {}

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.name = 'Name is required'
  } else if (body.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or less'
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.email = 'Invalid email format'
  }

  if (!body.phone || typeof body.phone !== 'string' || !body.phone.trim()) {
    errors.phone = 'Phone is required'
  } else if (body.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Phone must be at least 10 digits'
  }

  if (!body.facilityName || typeof body.facilityName !== 'string' || !body.facilityName.trim()) {
    errors.facilityName = 'Facility name is required'
  }

  if (!body.location || typeof body.location !== 'string' || !body.location.trim()) {
    errors.location = 'Location is required'
  }

  if (!body.occupancyRange || !VALID_OCCUPANCY.includes(body.occupancyRange)) {
    errors.occupancyRange = 'Valid occupancy range is required'
  }

  if (!body.totalUnits || !VALID_UNITS.includes(body.totalUnits)) {
    errors.totalUnits = 'Valid total units selection is required'
  }

  if (!body.biggestIssue || !VALID_ISSUES.includes(body.biggestIssue)) {
    errors.biggestIssue = 'Valid vacancy issue is required'
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be a string'
    } else if (body.notes.length > 1000) {
      errors.notes = 'Notes must be 1000 characters or less'
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

// --- HTML escaping ---

function esc(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// --- Email via Resend ---

async function sendNotificationEmail(body, apiKey) {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 20px; color: #1a1a1a;">New Audit Request</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666; width: 140px;">Name</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.name)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Email</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;"><a href="mailto:${esc(body.email)}">${esc(body.email)}</a></td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Phone</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.phone)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Facility</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.facilityName)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Location</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.location)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Occupancy</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.occupancyRange)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Total Units</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.totalUnits)}</td></tr>
        <tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Biggest Issue</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.biggestIssue)}</td></tr>
        ${body.notes ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; color: #666;">Notes</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5;">${esc(body.notes)}</td></tr>` : ''}
      </table>
      <p style="margin-top: 20px; font-size: 13px; color: #999;">Submitted: ${new Date().toISOString()}</p>
      <a href="mailto:${esc(body.email)}?subject=Re: Your StowStack Facility Audit" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Reply to ${esc(body.name)}</a>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'StowStack <notifications@stowstack.co>',
      to: NOTIFICATION_RECIPIENTS,
      subject: `New Audit Request: ${body.facilityName.replace(/[\r\n]/g, '')} — ${body.location.replace(/[\r\n]/g, '')}`,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend notification failed (${res.status}): ${text}`)
  }
}

async function sendAutoReply(body, apiKey) {
  const firstName = esc(body.name.trim().split(' ')[0])
  const QUESTIONNAIRE_URL = 'https://shorturl.at/EWu5y'
  const SCHEDULING_URL = 'https://cal.com/stowstack'
  const STARBUCKS_URL = 'https://starbucks.cashstar.com/recipient-experience/redemption/CCgeQPsM0VsChJeJeZayIDwFK/dbb51cbb4fc44392a7b2bff0a2158bb0/?continue=true'
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
      <p>Hey ${firstName},</p>
      <p>Just got your audit request for <strong>${esc(body.facilityName)}</strong>. Really appreciate you reaching out — we are already pulling up your market and taking a look at things on our end.</p>
      <p>We need two things from you to get your audit built and reviewed:</p>

      <div style="background: #f8faf8; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 4px; font-weight: 700; color: #16a34a; font-size: 14px;">STEP 1</p>
        <p style="margin: 0 0 8px; font-weight: 600;">Fill out the facility questionnaire (5 min)</p>
        <p style="margin: 0 0 12px; color: #4a4a4a; font-size: 14px;">This covers unit mix, occupancy, leads, marketing, pricing, operations, and competition. You do not need to pull any reports — everything is based on what you already know. A lot of operators tell us just filling it out helps them see where things are slipping.</p>
        <a href="${QUESTIONNAIRE_URL}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Fill Out the Questionnaire &rarr;</a>
      </div>

      <div style="background: #f5f7ff; border-left: 4px solid #4f46e5; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 4px; font-weight: 700; color: #4f46e5; font-size: 14px;">STEP 2</p>
        <p style="margin: 0 0 8px; font-weight: 600;">Schedule your audit review call (20 min)</p>
        <p style="margin: 0 0 12px; color: #4a4a4a; font-size: 14px;">Once you have submitted the questionnaire, pick a time and we will walk through your full audit live — category scores, specific findings, and a prioritized action plan for <strong>${esc(body.facilityName)}</strong>. No cost, no strings.</p>
        <a href="${SCHEDULING_URL}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Pick a Time &rarr;</a>
      </div>

      <div style="background: #fdf8f1; border-left: 4px solid #d97706; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 4px; font-size: 22px;">&#9749;</p>
        <p style="margin: 0 0 8px; font-weight: 600;">Coffee is on us</p>
        <p style="margin: 0 0 12px; color: #4a4a4a; font-size: 14px;">Come caffeinated for the call — here is a $5 Starbucks gift card on us.</p>
        <a href="${STARBUCKS_URL}" style="display: inline-block; padding: 12px 24px; background: #d97706; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Get Your Coffee &rarr;</a>
      </div>

      <p>I have CC'd <strong>Anna</strong> on this email. If you have any questions about the questionnaire, need help pulling facility data, or want to coordinate scheduling before the call — just hit reply all and she will take care of it.</p>
      <p>Looking forward to digging into your numbers.</p>
      <p style="margin-top: 24px;">
        Blake Burkett<br/>
        StowStack<br/>
        <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
        <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">This is a noreply address. Hit reply all if you have any questions — Anna and Blake are both on the thread.</p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Blake at StowStack <noreply@stowstack.co>',
      to: body.email.trim().toLowerCase(),
      cc: 'anna@storepawpaw.com',
      reply_to: ['blake@storepawpaw.com', 'anna@storepawpaw.com'],
      subject: `We're working on your ${esc(body.facilityName)} audit`,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend auto-reply failed (${res.status}): ${text}`)
  }
}

// --- Handler ---

export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value))

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 3 submissions per IP per hour
  try {
    const { allowed, resetAt } = await rateLimit(req, { key: 'audit-form', limit: 3, windowSeconds: 3600 })
    if (!allowed) {
      return rateLimitResponse(res, resetAt)
    }
  } catch (rlErr) {
    console.error('Rate limit check failed:', rlErr.message)
    // Fail-open: allow the request if rate limiting itself errors
  }

  try {
    const body = req.body

    // Validate
    const errors = validate(body)
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', fields: errors })
    }

    const leadData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      facilityName: body.facilityName.trim(),
      location: body.location.trim(),
      occupancyRange: body.occupancyRange,
      totalUnits: body.totalUnits,
      biggestIssue: body.biggestIssue,
      notes: body.notes?.trim() || null,
    }

    // Save to Postgres (single source of truth)
    let facilityId = null
    try {
      const rows = await query(
        `INSERT INTO facilities
          (name, location, contact_name, contact_email, contact_phone,
           occupancy_range, total_units, biggest_issue, notes, status,
           pipeline_status, form_notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'intake', 'submitted', $10, NOW())
         RETURNING id`,
        [
          leadData.facilityName,
          leadData.location,
          leadData.name,
          leadData.email,
          leadData.phone,
          leadData.occupancyRange,
          leadData.totalUnits,
          leadData.biggestIssue,
          leadData.notes,
          leadData.notes,
        ]
      )
      facilityId = rows[0].id
    } catch (dbErr) {
      console.error('Failed to save facility to Postgres:', dbErr.message)
      return res.status(500).json({ error: 'Failed to save lead' })
    }

    // Log activity
    query(
      `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail)
       VALUES ('lead_created', $1, $2, $3, $4)`,
      [facilityId, leadData.name, leadData.facilityName, `New lead from ${leadData.facilityName}`]
    ).catch(err => console.error('Activity log error:', err.message))

    // Enroll in drip sequence
    try {
      const now = new Date()
      const nextSendAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days
      await query(
        `INSERT INTO drip_sequences (facility_id, sequence_id, current_step, status, enrolled_at, next_send_at, history)
         VALUES ($1, 'post_audit', 0, 'active', $2, $3, '[]')
         ON CONFLICT (facility_id) DO NOTHING`,
        [facilityId, now.toISOString(), nextSendAt.toISOString()]
      )
    } catch (dripErr) {
      console.error('Failed to enroll lead in drip:', dripErr.message)
    }

    // Send emails
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY not configured')
      return res.status(200).json({ success: true, facilityId })
    }

    await Promise.all([
      sendNotificationEmail(body, apiKey).catch((err) =>
        console.error('Notification email failed:', err.message)
      ),
      sendAutoReply(body, apiKey).catch((err) =>
        console.error('Auto-reply email failed:', err.message)
      ),
    ])

    return res.status(200).json({ success: true, facilityId })
  } catch (err) {
    console.error('Unhandled error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
