/**
 * SMS Sender via Twilio
 *
 * POST /api/sms-send  { to, body, from?, facilityId? }
 *
 * Uses EXISTING Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).
 * Does NOT modify call-tracking.js or any existing Twilio code.
 */
import { requireAdmin } from './_auth.js'
import { queryOne } from './_db.js'

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, body, from, facilityId } = req.body
  if (!to || !body) return res.status(400).json({ error: 'to and body required' })

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return res.status(500).json({ error: 'Twilio credentials not configured' })

  try {
    // Try to use facility's Twilio number if available
    let fromNumber = from
    if (!fromNumber && facilityId) {
      const tracking = await queryOne(
        `SELECT phone_number FROM call_tracking_numbers WHERE facility_id = $1 AND status = 'active' LIMIT 1`,
        [facilityId]
      )
      if (tracking) fromNumber = tracking.phone_number
    }

    // Fall back to TWILIO_FROM_NUMBER env var
    if (!fromNumber) fromNumber = process.env.TWILIO_FROM_NUMBER
    if (!fromNumber) return res.status(500).json({ error: 'No from number available. Set TWILIO_FROM_NUMBER or provision a tracking number.' })

    // TCPA compliance: check send window (9am-9pm recipient local time)
    // For now, assume US timezone — can be enhanced later
    const hour = new Date().getUTCHours() - 5 // rough EST
    if (hour < 9 || hour >= 21) {
      return res.status(400).json({
        error: 'SMS send window violation. Cannot send SMS before 9am or after 9pm.',
        retryAfter: hour < 9 ? `${9 - hour} hours` : `${24 - hour + 9} hours`,
      })
    }

    // Ensure STOP opt-out message on first SMS
    const bodyWithOptOut = body.includes('STOP') ? body : `${body}\n\nReply STOP to opt out`

    // Send via Twilio REST API (avoid requiring twilio npm package)
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: bodyWithOptOut,
        }),
      }
    )

    const result = await twilioRes.json()

    if (result.error_code || result.status === 'failed') {
      throw new Error(result.message || `Twilio error: ${result.error_code}`)
    }

    return res.status(200).json({
      success: true,
      messageSid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
    })
  } catch (err) {
    console.error('SMS send error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
