import { query, queryOne } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Map a Postgres facility row to the lead shape the frontend expects
function facilityToLead(row, notes) {
  return {
    id: row.id,
    name: row.contact_name || '',
    email: row.contact_email || '',
    phone: row.contact_phone || '',
    facilityName: row.name || '',
    location: row.location || '',
    occupancyRange: row.occupancy_range || '',
    totalUnits: row.total_units || '',
    biggestIssue: row.biggest_issue || '',
    formNotes: row.form_notes || null,
    status: row.pipeline_status || 'submitted',
    pmsUploaded: row.pms_uploaded || false,
    followUpDate: row.follow_up_date || null,
    accessCode: row.access_code || null,
    notes: notes || [],
    createdAt: row.created_at?.toISOString?.() || row.created_at || '',
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || '',
  }
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

function logActivity({ type, facilityId, leadName, facilityName, detail, meta }) {
  query(
    `INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, facilityId, leadName || '', facilityName || '', (detail || '').slice(0, 500), JSON.stringify(meta || {})]
  ).catch(err => console.error('Activity log error:', err))
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET — list all leads
  if (req.method === 'GET') {
    try {
      const facilities = await query(
        `SELECT * FROM facilities ORDER BY created_at DESC`
      )

      // Batch-fetch notes for all facilities
      const noteRows = await query(
        `SELECT facility_id, text, created_at FROM lead_notes ORDER BY created_at ASC`
      )
      const notesByFacility = {}
      for (const n of noteRows) {
        if (!notesByFacility[n.facility_id]) notesByFacility[n.facility_id] = []
        notesByFacility[n.facility_id].push({ text: n.text, at: n.created_at?.toISOString?.() || n.created_at })
      }

      const leads = facilities.map(f => facilityToLead(f, notesByFacility[f.id] || []))

      // Count shared audits
      const auditCountRows = await query(`SELECT COUNT(*) as count FROM shared_audits`)
      const auditCount = parseInt(auditCountRows[0]?.count || 0)

      return res.status(200).json({ leads, auditCount })
    } catch (err) {
      console.error('Admin leads list error:', err)
      return res.status(500).json({ error: 'Failed to list leads' })
    }
  }

  // POST — create a new lead
  if (req.method === 'POST') {
    const { lead } = req.body || {}
    if (!lead?.email) return res.status(400).json({ error: 'Missing lead data' })

    try {
      const rows = await query(
        `INSERT INTO facilities
          (name, location, contact_name, contact_email, contact_phone,
           occupancy_range, total_units, biggest_issue, notes, status,
           pipeline_status, form_notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'intake', 'submitted', $10, NOW())
         RETURNING id`,
        [
          lead.facilityName || '',
          lead.location || '',
          lead.name || '',
          lead.email,
          lead.phone || '',
          lead.occupancyRange || '',
          lead.totalUnits || '',
          lead.biggestIssue || '',
          lead.notes || null,
          lead.notes || null,
        ]
      )

      const id = rows[0].id

      logActivity({
        type: 'lead_created',
        facilityId: id,
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
    const { id, status, note, pmsUploaded, followUpDate } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing lead ID' })

    try {
      const facility = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [id])
      if (!facility) return res.status(404).json({ error: 'Lead not found' })

      // Build dynamic UPDATE
      const updates = []
      const values = []
      let paramIdx = 1

      if (status) {
        updates.push(`pipeline_status = $${paramIdx++}`)
        values.push(status)
      }
      if (pmsUploaded !== undefined) {
        updates.push(`pms_uploaded = $${paramIdx++}`)
        values.push(pmsUploaded)
      }
      if (followUpDate !== undefined) {
        updates.push(`follow_up_date = $${paramIdx++}`)
        values.push(followUpDate || null)
      }
      updates.push(`updated_at = NOW()`)

      if (updates.length > 1) { // more than just updated_at
        values.push(id)
        await query(
          `UPDATE facilities SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
          values
        )
      }

      // Add note
      if (note) {
        await query(
          `INSERT INTO lead_notes (facility_id, text) VALUES ($1, $2)`,
          [id, note]
        )
      }

      // When a lead becomes a signed client, provision portal access
      if (status === 'client_signed' && !facility.access_code) {
        const code = Math.random().toString(36).slice(2, 10).toUpperCase()

        // Set access code on facility
        await query(`UPDATE facilities SET access_code = $1 WHERE id = $2`, [code, id])

        // Create client record
        await query(
          `INSERT INTO clients (facility_id, email, name, facility_name, location, occupancy_range, total_units, access_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            facility.contact_email,
            facility.contact_name,
            facility.name,
            facility.location,
            facility.occupancy_range,
            facility.total_units,
            code,
          ]
        )

        // Create empty onboarding record
        await query(
          `INSERT INTO client_onboarding (client_id, access_code, steps)
           SELECT id, access_code, '{}'::jsonb FROM clients WHERE access_code = $1
           ON CONFLICT (client_id) DO NOTHING`,
          [code]
        )

        // Fire-and-forget welcome email
        const leadForEmail = facilityToLead({ ...facility, access_code: code }, [])
        sendWelcomeEmail(leadForEmail, code)
      }

      // Log activities
      const leadName = facility.contact_name || ''
      const facilityName = facility.name || ''

      if (status) {
        logActivity({
          type: status === 'client_signed' ? 'client_signed' : 'status_change',
          facilityId: id,
          leadName,
          facilityName,
          detail: status === 'client_signed'
            ? `${facilityName} signed as client`
            : `Status changed to "${status}"`,
          meta: { to: status },
        })
      }
      if (note) {
        logActivity({
          type: 'note_added',
          facilityId: id,
          leadName,
          facilityName,
          detail: `Note added: "${note.slice(0, 100)}"`,
        })
      }
      if (pmsUploaded) {
        logActivity({
          type: 'pms_uploaded',
          facilityId: id,
          leadName,
          facilityName,
          detail: `PMS report uploaded for ${facilityName}`,
        })
      }

      // Fetch updated record with notes
      const updated = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [id])
      const notes = await query(
        `SELECT text, created_at FROM lead_notes WHERE facility_id = $1 ORDER BY created_at ASC`,
        [id]
      )
      const record = facilityToLead(updated, notes.map(n => ({ text: n.text, at: n.created_at?.toISOString?.() || n.created_at })))

      return res.status(200).json({ success: true, record })
    } catch (err) {
      console.error('Admin lead update error:', err)
      return res.status(500).json({ error: 'Failed to update lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
