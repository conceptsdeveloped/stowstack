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
      from: 'StowStack <onboarding@resend.dev>',
      to: 'blake@urkovro.resend.app',
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
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
      <p>Hey ${esc(body.name)} —</p>
      <p>I got your audit request for ${esc(body.facilityName)}. I'm going to personally review your facility, look at your market, and put together a clear picture of where you're leaking revenue and what we can do about it.</p>
      <p>I'll be in touch within 24 hours to schedule a walkthrough call.</p>
      <p style="margin-top: 24px;">— Blake Burkett, StowStack</p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Blake at StowStack <onboarding@resend.dev>',
      to: body.email.trim().toLowerCase(),
      reply_to: 'blake@urkovro.resend.app',
      subject: 'Your StowStack Facility Audit Request',
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
