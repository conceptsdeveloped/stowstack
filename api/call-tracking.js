import { query } from './_db.js'
import twilio from 'twilio'
import { requireAdmin, isAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return twilio(sid, token)
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // Public GET — return tracking phone for a landing page (no auth needed)
  if (req.method === 'GET' && req.query.landingPageId && !req.query.facilityId) {
    const rows = await query(
      `SELECT phone_number FROM call_tracking_numbers WHERE landing_page_id = $1 AND status = 'active' LIMIT 1`,
      [req.query.landingPageId]
    )
    return res.json({ trackingPhone: rows[0]?.phone_number || null })
  }

  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list tracking numbers for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const numbers = await query(
      `SELECT ctn.*, lp.title as landing_page_title, ul.label as utm_label
       FROM call_tracking_numbers ctn
       LEFT JOIN landing_pages lp ON ctn.landing_page_id = lp.id
       LEFT JOIN utm_links ul ON ctn.utm_link_id = ul.id
       WHERE ctn.facility_id = $1 AND ctn.status != 'released'
       ORDER BY ctn.created_at DESC`,
      [facilityId]
    )
    return res.json({ numbers })
  }

  // POST — provision a new Twilio number
  if (req.method === 'POST') {
    const { facilityId, label, forwardTo, areaCode, landingPageId, utmLinkId } = req.body
    if (!facilityId || !label || !forwardTo) {
      return res.status(400).json({ error: 'facilityId, label, and forwardTo required' })
    }

    try {
      const client = getTwilioClient()
      const webhookBase = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://stowstack.co'

      // Search for available local numbers
      const searchParams = { limit: 1, voiceEnabled: true }
      if (areaCode) searchParams.areaCode = areaCode

      const available = await client.availablePhoneNumbers('US').local.list(searchParams)
      if (!available.length) {
        return res.status(404).json({ error: 'No numbers available for that area code' })
      }

      // Purchase the number and configure webhook
      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        voiceUrl: `${webhookBase}/api/call-webhook`,
        voiceMethod: 'POST',
        statusCallback: `${webhookBase}/api/call-webhook?event=status`,
        statusCallbackMethod: 'POST',
        friendlyName: `StowStack: ${label}`,
      })

      // Save to database
      const rows = await query(
        `INSERT INTO call_tracking_numbers (facility_id, landing_page_id, utm_link_id, label, twilio_sid, phone_number, forward_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [facilityId, landingPageId || null, utmLinkId || null, label, purchased.sid, purchased.phoneNumber, forwardTo]
      )

      return res.status(201).json({ number: rows[0] })
    } catch (err) {
      console.error('Failed to provision number:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // DELETE — release a tracking number
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })

    const rows = await query('SELECT twilio_sid FROM call_tracking_numbers WHERE id = $1', [id])
    if (!rows.length) return res.status(404).json({ error: 'Number not found' })

    try {
      const client = getTwilioClient()
      await client.incomingPhoneNumbers(rows[0].twilio_sid).remove()
    } catch (err) {
      console.error('Failed to release Twilio number:', err.message)
    }

    await query(`UPDATE call_tracking_numbers SET status = 'released' WHERE id = $1`, [id])
    return res.json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
