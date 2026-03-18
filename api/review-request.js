import { query } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // POST — Send review request to a tenant
    if (req.method === 'POST') {
      const { facilityId, tenantName, tenantEmail, tenantPhone, channel } = req.body

      if (!facilityId) return res.status(400).json({ error: 'Missing facilityId' })
      if (!tenantEmail && !tenantPhone) return res.status(400).json({ error: 'Need email or phone' })

      // Get facility info
      const facility = await query('SELECT * FROM facilities WHERE id = $1', [facilityId])
      if (facility.length === 0) return res.status(404).json({ error: 'Facility not found' })
      const fac = facility[0]

      const firstName = (tenantName || '').trim().split(' ')[0] || 'there'
      const facilityName = fac.name
      const googleMapsUrl = fac.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facilityName + ' ' + (fac.location || ''))}`
      const reviewUrl = googleMapsUrl

      // Send via email
      if ((!channel || channel === 'email') && tenantEmail) {
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: `${facilityName} <notifications@stowstack.co>`,
              to: tenantEmail.trim(),
              subject: `How's your experience at ${facilityName}?`,
              html: `
                <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;line-height:1.7;color:#1a1a1a;">
                  <p>Hey ${esc(firstName)},</p>
                  <p>Thanks for choosing <strong>${esc(facilityName)}</strong> for your storage needs. We hope everything has been going well.</p>
                  <p>If you have a minute, we would really appreciate a quick Google review. It helps other people in the area find us, and it means a lot to our team.</p>
                  <p style="margin:24px 0;">
                    <a href="${reviewUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Leave a Review</a>
                  </p>
                  <p>Takes about 30 seconds. Thank you for being a great tenant.</p>
                  <p style="margin-top:24px;color:#666;">
                    ${esc(facilityName)}<br/>
                    ${esc(fac.location || '')}
                  </p>
                </div>`,
            }),
          })
        }
      }

      // Send via SMS
      if (channel === 'sms' && tenantPhone) {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID
        const twilioToken = process.env.TWILIO_AUTH_TOKEN
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER

        if (twilioSid && twilioToken && twilioFrom) {
          const smsBody = `Hey ${firstName}! Thanks for storing with ${facilityName}. If you have 30 seconds, a quick Google review would mean a lot: ${reviewUrl}\n\nReply STOP to opt out.`

          const formData = new URLSearchParams()
          formData.append('To', tenantPhone.trim())
          formData.append('From', twilioFrom)
          formData.append('Body', smsBody)

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
            },
            body: formData.toString(),
          })
        }
      }

      // Log activity
      query(
        'INSERT INTO activity_log (type, facility_id, facility_name, lead_name, detail) VALUES ($1, $2, $3, $4, $5)',
        ['review_request', facilityId, facilityName, tenantName || '', `Review request sent to ${tenantEmail || tenantPhone} via ${channel || 'email'}`]
      ).catch(() => {})

      return res.json({ success: true, sentTo: tenantEmail || tenantPhone, channel: channel || 'email' })
    }

    // GET — List recent review requests
    if (req.method === 'GET') {
      const { facilityId } = req.query || {}
      const activities = await query(
        `SELECT * FROM activity_log WHERE type = 'review_request' ${facilityId ? 'AND facility_id = $1' : ''} ORDER BY created_at DESC LIMIT 50`,
        facilityId ? [facilityId] : []
      )
      return res.json({ success: true, data: activities })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('review-request error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
