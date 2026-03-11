const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
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

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 3600 // 1 hour in seconds

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  })
}

// --- Rate limiting ---

async function checkRateLimit(ip, kv) {
  const key = `rate:${ip}`
  const raw = await kv.get(key)

  if (!raw) {
    await kv.put(key, JSON.stringify({ count: 1, start: Date.now() }), {
      expirationTtl: RATE_LIMIT_WINDOW,
    })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  const data = JSON.parse(raw)
  const elapsed = (Date.now() - data.start) / 1000

  if (elapsed > RATE_LIMIT_WINDOW) {
    await kv.put(key, JSON.stringify({ count: 1, start: Date.now() }), {
      expirationTtl: RATE_LIMIT_WINDOW,
    })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  if (data.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }

  data.count++
  const ttl = Math.max(Math.ceil(RATE_LIMIT_WINDOW - elapsed), 60)
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttl })
  return { allowed: true, remaining: RATE_LIMIT_MAX - data.count }
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

// --- D1 storage ---

async function insertLead(db, id, body) {
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO leads (id, name, email, phone, facility_name, location, occupancy_range, total_units, biggest_issue, notes, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'website', ?, ?)`
    )
    .bind(
      id,
      body.name.trim(),
      body.email.trim().toLowerCase(),
      body.phone.trim(),
      body.facilityName.trim(),
      body.location.trim(),
      body.occupancyRange,
      body.totalUnits,
      body.biggestIssue,
      body.notes?.trim() || null,
      now,
      now
    )
    .run()
}

// --- Email via Resend ---

async function sendNotificationEmail(body, leadId, apiKey) {
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
      <p style="margin-top: 20px; font-size: 13px; color: #999;">Lead ID: ${leadId}</p>
      <a href="mailto:${esc(body.email)}?subject=Re: Your StowStack Facility Audit" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Reply to ${esc(body.name)}</a>
    </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'notifications@stowstack.co',
      to: 'blake@stowstack.co',
      subject: `New Audit Request: ${body.facilityName} — ${body.location}`,
      html,
    }),
  })
}

async function sendAutoReply(body, apiKey) {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
      <p>Hey ${esc(body.name)} —</p>
      <p>I got your audit request for ${esc(body.facilityName)}. I'm going to personally review your facility, look at your market, and put together a clear picture of where you're leaking revenue and what we can do about it.</p>
      <p>I'll be in touch within 24 hours to schedule a walkthrough call.</p>
      <p style="margin-top: 24px;">— Blake Burkett, StowStack</p>
    </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'blake@stowstack.co',
      to: body.email.trim().toLowerCase(),
      reply_to: 'blake@stowstack.co',
      subject: 'Your StowStack Facility Audit Request',
      html,
    }),
  })
}

function esc(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// --- Main handler ---

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    // Only POST /api/audit-form
    const url = new URL(request.url)
    if (url.pathname !== '/api/audit-form' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, 404, request)
    }

    try {
      // Rate limiting
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
      const { allowed } = await checkRateLimit(ip, env.RATE_LIMITS)
      if (!allowed) {
        return jsonResponse(
          { error: 'Too many submissions. Please try again in an hour.' },
          429,
          request
        )
      }

      // Parse body
      let body
      try {
        body = await request.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400, request)
      }

      // Validate
      const errors = validate(body)
      if (errors) {
        return jsonResponse({ error: 'Validation failed', fields: errors }, 400, request)
      }

      // Store in D1
      const leadId = crypto.randomUUID()
      await insertLead(env.DB, leadId, body)

      // Send emails after response via waitUntil
      ctx.waitUntil(
        Promise.all([
          sendNotificationEmail(body, leadId, env.RESEND_API_KEY).catch((err) =>
            console.error('Notification email failed:', err)
          ),
          sendAutoReply(body, env.RESEND_API_KEY).catch((err) =>
            console.error('Auto-reply email failed:', err)
          ),
        ])
      )

      return jsonResponse({ success: true, leadId }, 200, request)
    } catch (err) {
      console.error('Unhandled error:', err)
      return jsonResponse({ error: 'Internal server error' }, 500, request)
    }
  },
}
