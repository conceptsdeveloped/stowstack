import { query, queryOne } from './_db.js'

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
    // Save PMS report
    const rows = await query(
      `INSERT INTO pms_reports (facility_name, email, report_type, file_name, report_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [facilityName, email, reportType || 'unknown', fileName || 'report.csv', JSON.stringify(reportData)]
    )
    const reportId = rows[0].id

    // Match to facility by email and update
    const facility = await queryOne(
      `SELECT id FROM facilities WHERE contact_email = $1 LIMIT 1`,
      [email.toLowerCase()]
    )
    if (facility) {
      await query(
        `UPDATE facilities SET pms_uploaded = true, updated_at = NOW() WHERE id = $1`,
        [facility.id]
      )
      await query(
        `UPDATE pms_reports SET facility_id = $1 WHERE id = $2`,
        [facility.id, reportId]
      )
    }

    // Send notification email
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

    return res.status(200).json({ id: reportId, success: true })
  } catch (err) {
    console.error('PMS upload error:', err)
    return res.status(500).json({ error: 'Failed to save PMS report' })
  }
}
