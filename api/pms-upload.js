import { Redis } from '@upstash/redis'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { facilityName, email, reportType, reportData, fileName } = req.body || {}

  if (!facilityName || !email || !reportData) {
    return res.status(400).json({ error: 'Missing required fields: facilityName, email, reportData' })
  }

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const record = {
      facilityName,
      email,
      reportType: reportType || 'unknown',
      fileName: fileName || 'report.csv',
      reportData, // parsed CSV data
      uploadedAt: new Date().toISOString(),
    }

    await redis.set(`pms:${id}`, JSON.stringify(record), { ex: 7776000 }) // 90-day TTL

    // Try to find and update matching lead
    const leadKeys = await redis.keys('lead:*')
    if (leadKeys.length) {
      const pipeline = redis.pipeline()
      leadKeys.forEach(k => pipeline.get(k))
      const results = await pipeline.exec()

      for (let i = 0; i < results.length; i++) {
        const lead = typeof results[i] === 'string' ? JSON.parse(results[i]) : results[i]
        if (lead?.email?.toLowerCase() === email.toLowerCase()) {
          lead.pmsUploaded = true
          lead.pmsReportId = id
          lead.updatedAt = new Date().toISOString()
          await redis.set(leadKeys[i], JSON.stringify(lead))
          break
        }
      }
    }

    // Send notification email via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: 'StowStack <notifications@stowstack.co>',
          to: ['blake@urkovro.resend.app', 'anna@storepawpaw.com'],
          subject: `PMS Report Uploaded: ${facilityName}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>New PMS Report Upload</h2>
            <p><strong>Facility:</strong> ${facilityName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Report Type:</strong> ${reportType || 'Not specified'}</p>
            <p><strong>File:</strong> ${fileName || 'report.csv'}</p>
            <p style="color: #666; font-size: 13px;">Uploaded: ${new Date().toISOString()}</p>
          </div>`,
        }),
      }).catch(err => console.error('PMS notification email failed:', err.message))
    }

    return res.status(200).json({ id, success: true })
  } catch (err) {
    console.error('PMS upload error:', err)
    return res.status(500).json({ error: 'Failed to save PMS report' })
  }
}
