const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

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

// TODO: Add rate limiting — Vercel KV or Upstash Redis (3 submissions per IP per hour)

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
      to: ['blake@urkovro.resend.app', 'anna@storepawpaw.com'],
      subject: `New Audit Request: ${body.facilityName} — ${body.location}`,
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
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
      <p>Hey ${firstName},</p>
      <p>Just got your audit request for <strong>${esc(body.facilityName)}</strong>. Really appreciate you reaching out. We are already pulling up your market and taking a look at things on our end.</p>
      <p>Before we can finish the full audit, we need you to fill out a quick diagnostic form. It covers everything we look at when we review a facility: occupancy, unit mix, leads, marketing, pricing, operations, and competition.</p>
      <p>A few things about the form:</p>
      <ul style="padding-left: 20px; margin: 12px 0;">
        <li style="margin-bottom: 6px;"><strong>Takes about 10 minutes.</strong> It is thorough but not complicated.</li>
        <li style="margin-bottom: 6px;"><strong>You do not need to pull any reports.</strong> Everything is based on what you already know about your facility.</li>
        <li style="margin-bottom: 6px;"><strong>The questions are actually useful.</strong> A lot of operators tell us that just filling it out helps them see where things are slipping.</li>
      </ul>
      <p style="margin: 24px 0;">
        <a href="https://shorturl.at/EWu5y" style="display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Fill Out the Diagnostic Form</a>
      </p>
      <p>Once we get your answers back, we will put together a full audit with category scores, specific findings, and a prioritized action plan for <strong>${esc(body.facilityName)}</strong>. No cost, no strings.</p>
      <p>After the audit is done, I would love to hop on a quick call to walk you through the results and talk about what is actually going to move the needle for you. <strong>What does your schedule look like this week or next for a 20 minute call?</strong></p>
      <p>Looking forward to it.</p>
      <p style="margin-top: 24px;">
        Blake Burkett<br/>
        StowStack<br/>
        <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
        <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">This is a noreply email. Hit reply all if you have any questions. Anna is CC'd on this thread and can help with scheduling, additional reports, or anything else you need.</p>
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

  try {
    const body = req.body

    // Validate
    const errors = validate(body)
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', fields: errors })
    }

    // TODO: Add database storage — Vercel Postgres or Supabase
    console.log('New audit lead:', JSON.stringify({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      facilityName: body.facilityName.trim(),
      location: body.location.trim(),
      occupancyRange: body.occupancyRange,
      totalUnits: body.totalUnits,
      biggestIssue: body.biggestIssue,
      notes: body.notes?.trim() || null,
      submittedAt: new Date().toISOString(),
    }))

    // Send emails
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY not configured')
      return res.status(200).json({ success: true })
    }

    await Promise.all([
      sendNotificationEmail(body, apiKey).catch((err) =>
        console.error('Notification email failed:', err.message)
      ),
      sendAutoReply(body, apiKey).catch((err) =>
        console.error('Auto-reply email failed:', err.message)
      ),
    ])

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Unhandled error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
