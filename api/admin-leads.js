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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sendWelcomeEmail(record, accessCode) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const firstName = esc(record.name.trim().split(' ')[0])
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.7; color: #1a1a1a;">
      <p>Hey ${firstName},</p>
      <p>Welcome aboard! We're thrilled to have <strong>${esc(record.facilityName)}</strong> as a StowStack client.</p>
      <p>Your client portal is ready. This is where you'll be able to see your campaign performance, leads, move-ins, and ROI in real time once your campaigns go live.</p>
      <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
        <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Your Login Details</p>
        <p style="margin: 0; font-size: 14px; color: #374151;">Email: <strong>${esc(record.email)}</strong></p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #374151;">Access Code: <strong style="font-family: monospace; letter-spacing: 2px; font-size: 16px;">${esc(accessCode)}</strong></p>
      </div>
      <p style="margin: 24px 0;">
        <a href="https://stowstack.co/portal" style="display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Open Your Dashboard</a>
      </p>
      <p>We're getting your campaigns built right now. You'll start seeing performance data in your portal as soon as the first ads go live.</p>
      <p>If you have any questions in the meantime, just reply to this email.</p>
      <p style="margin-top: 24px;">
        Blake Burkett<br/>
        StowStack<br/>
        <a href="tel:2699298541" style="color: #16a34a; text-decoration: none;">269-929-8541</a><br/>
        <a href="mailto:blake@storepawpaw.com" style="color: #16a34a; text-decoration: none;">blake@storepawpaw.com</a>
      </p>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Blake at StowStack <noreply@stowstack.co>',
        to: record.email,
        cc: 'anna@storepawpaw.com',
        reply_to: ['blake@storepawpaw.com', 'anna@storepawpaw.com'],
        subject: `Welcome to StowStack — Your ${esc(record.facilityName)} dashboard is ready`,
        html,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Welcome email failed:', res.status, text)
    }
  } catch (err) {
    console.error('Welcome email error:', err.message)
  }
}

function logActivity(redis, { type, leadId, leadName, facilityName, detail, meta }) {
  if (!redis) return
  const entry = JSON.stringify({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type, leadId, leadName, facilityName,
    detail: (detail || '').slice(0, 500),
    meta: meta || {},
    timestamp: new Date().toISOString(),
  })
  // Fire and forget — don't block the response
  Promise.all([
    redis.lpush('activity:global', entry).then(() => redis.ltrim('activity:global', 0, 499)),
    redis.lpush(`activity:lead:${leadId}`, entry).then(() => redis.ltrim(`activity:lead:${leadId}`, 0, 99)),
  ]).catch(err => console.error('Activity log error:', err))
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const redis = getRedis()
  if (!redis) {
    // No Redis configured (local dev) — return empty data
    if (req.method === 'GET') return res.status(200).json({ leads: [], auditCount: 0 })
    return res.status(200).json({ success: true })
  }

  // GET — list all leads
  if (req.method === 'GET') {
    try {
      // Get all lead keys
      const keys = await redis.keys('lead:*')
      if (!keys.length) return res.status(200).json({ leads: [] })

      const pipeline = redis.pipeline()
      keys.forEach(k => pipeline.get(k))
      const results = await pipeline.exec()

      const leads = results
        .map((raw, i) => {
          const record = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (!record) return null
          return { id: keys[i].replace('lead:', ''), ...record }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      // Also get audit counts
      const auditKeys = await redis.keys('audit:*')

      return res.status(200).json({ leads, auditCount: auditKeys.length })
    } catch (err) {
      console.error('Admin leads list error:', err)
      return res.status(500).json({ error: 'Failed to list leads' })
    }
  }

  // POST — create a new lead (called from audit-form.js submission)
  if (req.method === 'POST') {
    const { lead } = req.body || {}
    if (!lead?.email) return res.status(400).json({ error: 'Missing lead data' })

    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const record = {
        ...lead,
        status: 'submitted', // submitted | form_sent | form_completed | audit_generated | call_scheduled | client_signed | lost
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      }

      await redis.set(`lead:${id}`, JSON.stringify(record))

      // Log activity
      logActivity(redis, {
        type: 'lead_created',
        leadId: id,
        leadName: lead.name || '',
        facilityName: lead.facilityName || '',
        detail: `New lead from ${lead.facilityName || 'unknown facility'}`,
      })

      return res.status(200).json({ id })
    } catch (err) {
      console.error('Admin lead create error:', err)
      return res.status(500).json({ error: 'Failed to create lead' })
    }
  }

  // PATCH — update lead status or add notes
  if (req.method === 'PATCH') {
    const { id, status, note, pmsUploaded } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing lead ID' })

    try {
      const raw = await redis.get(`lead:${id}`)
      if (!raw) return res.status(404).json({ error: 'Lead not found' })

      const record = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (status) record.status = status
      if (note) record.notes = [...(record.notes || []), { text: note, at: new Date().toISOString() }]
      if (pmsUploaded !== undefined) record.pmsUploaded = pmsUploaded
      record.updatedAt = new Date().toISOString()

      // When a lead becomes a signed client, provision portal access + send welcome email
      if (status === 'client_signed' && !record.accessCode) {
        const code = Math.random().toString(36).slice(2, 10).toUpperCase()
        record.accessCode = code
        // Store client portal record keyed by access code
        await redis.set(`client:${code}`, JSON.stringify({
          email: record.email,
          name: record.name,
          facilityName: record.facilityName,
          location: record.location,
          occupancyRange: record.occupancyRange,
          totalUnits: record.totalUnits,
          signedAt: new Date().toISOString(),
          accessCode: code,
          campaigns: [],
        }))
        // Fire-and-forget welcome email with portal credentials
        sendWelcomeEmail(record, code)
      }

      await redis.set(`lead:${id}`, JSON.stringify(record))

      // Log activities
      if (status) {
        const actType = status === 'client_signed' ? 'client_signed' : 'status_change'
        logActivity(redis, {
          type: actType,
          leadId: id,
          leadName: record.name || '',
          facilityName: record.facilityName || '',
          detail: status === 'client_signed'
            ? `${record.facilityName} signed as client`
            : `Status changed to "${status}"`,
          meta: { to: status },
        })
      }
      if (note) {
        logActivity(redis, {
          type: 'note_added',
          leadId: id,
          leadName: record.name || '',
          facilityName: record.facilityName || '',
          detail: `Note added: "${note.slice(0, 100)}"`,
        })
      }
      if (pmsUploaded) {
        logActivity(redis, {
          type: 'pms_uploaded',
          leadId: id,
          leadName: record.name || '',
          facilityName: record.facilityName || '',
          detail: `PMS report uploaded for ${record.facilityName}`,
        })
      }

      return res.status(200).json({ success: true, record })
    } catch (err) {
      console.error('Admin lead update error:', err)
      return res.status(500).json({ error: 'Failed to update lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
