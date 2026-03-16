import crypto from 'crypto'
import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope } from '../_api-auth.js'
import { dispatchWebhook } from '../_webhook.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  const { id } = req.query

  // ── GET ──
  if (req.method === 'GET') {
    if (!requireScope(res, apiKey, 'leads:read')) return

    try {
      if (id) {
        const lead = await queryOne(
          `SELECT pl.id, pl.facility_id, pl.name, pl.email, pl.phone, pl.unit_size,
                  pl.lead_status, pl.utm_source, pl.utm_medium, pl.utm_campaign,
                  pl.move_in_date, pl.created_at, pl.converted_at, pl.lead_notes
           FROM partial_leads pl
           JOIN facilities f ON f.id = pl.facility_id
           WHERE pl.id = $1 AND f.organization_id = $2`,
          [id, orgId]
        )
        if (!lead) return res.status(404).json({ error: 'Lead not found' })
        return res.status(200).json({ lead })
      }

      // List with filters + pagination
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25))
      const offset = (page - 1) * limit

      let where = 'WHERE f.organization_id = $1'
      const params = [orgId]
      let paramIdx = 2

      if (req.query.facilityId) {
        where += ` AND pl.facility_id = $${paramIdx++}`
        params.push(req.query.facilityId)
      }
      if (req.query.status) {
        where += ` AND pl.lead_status = $${paramIdx++}`
        params.push(req.query.status)
      }
      if (req.query.since) {
        where += ` AND pl.created_at >= $${paramIdx++}`
        params.push(req.query.since)
      }

      const selectCols = `pl.id, pl.facility_id, pl.name, pl.email, pl.phone, pl.unit_size,
                          pl.lead_status, pl.utm_source, pl.utm_medium, pl.utm_campaign,
                          pl.move_in_date, pl.created_at, pl.converted_at`

      const [leads, countRow] = await Promise.all([
        query(
          `SELECT ${selectCols}
           FROM partial_leads pl
           JOIN facilities f ON f.id = pl.facility_id
           ${where}
           ORDER BY pl.created_at DESC
           LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
          [...params, limit, offset]
        ),
        queryOne(
          `SELECT COUNT(*)::int AS total
           FROM partial_leads pl
           JOIN facilities f ON f.id = pl.facility_id
           ${where}`,
          params
        ),
      ])

      const total = countRow?.total || 0
      return res.status(200).json({
        leads,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    } catch (err) {
      console.error('v1/leads GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch leads' })
    }
  }

  // ── POST: create a lead ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'leads:write')) return

    const { facilityId, name, email, phone, unitSize, leadStatus, utmSource, utmMedium, utmCampaign } = req.body || {}
    if (!facilityId) return res.status(400).json({ error: 'facilityId is required' })
    if (!name && !email && !phone) return res.status(400).json({ error: 'At least one of name, email, or phone is required' })

    // Verify facility belongs to org
    const facility = await queryOne(
      'SELECT id, organization_id FROM facilities WHERE id = $1',
      [facilityId]
    )
    if (!facility || facility.organization_id !== orgId) {
      return res.status(404).json({ error: 'Facility not found' })
    }

    const sessionId = `api-${crypto.randomUUID()}`

    try {
      const lead = await queryOne(
        `INSERT INTO partial_leads (facility_id, session_id, name, email, phone, unit_size,
                                    lead_status, utm_source, utm_medium, utm_campaign)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, facility_id, name, email, phone, unit_size, lead_status,
                   utm_source, utm_medium, utm_campaign, created_at`,
        [facilityId, sessionId, name || null, email || null, phone || null, unitSize || null,
         leadStatus || 'new', utmSource || 'api', utmMedium || null, utmCampaign || null]
      )

      dispatchWebhook(orgId, 'lead.created', { lead }).catch(() => {})

      return res.status(200).json({ lead })
    } catch (err) {
      console.error('v1/leads POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to create lead' })
    }
  }

  // ── PATCH: update lead ──
  if (req.method === 'PATCH') {
    if (!requireScope(res, apiKey, 'leads:write')) return
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    const fieldMap = {
      leadStatus: 'lead_status',
      moveInDate: 'move_in_date',
      notes: 'lead_notes',
      name: 'name',
      email: 'email',
      phone: 'phone',
      unitSize: 'unit_size',
    }

    const sets = []
    const params = []
    let paramIdx = 1

    for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
      if (req.body?.[bodyKey] !== undefined) {
        sets.push(`${dbCol} = $${paramIdx++}`)
        params.push(req.body[bodyKey])
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' })

    if (req.body?.leadStatus) {
      sets.push('status_updated_at = NOW()')
    }

    params.push(id, orgId)

    try {
      const lead = await queryOne(
        `UPDATE partial_leads SET ${sets.join(', ')}
         FROM facilities f
         WHERE partial_leads.id = $${paramIdx++}
           AND partial_leads.facility_id = f.id
           AND f.organization_id = $${paramIdx}
         RETURNING partial_leads.id, partial_leads.facility_id, partial_leads.name,
                   partial_leads.email, partial_leads.phone, partial_leads.unit_size,
                   partial_leads.lead_status, partial_leads.move_in_date,
                   partial_leads.created_at, partial_leads.lead_notes`,
        params
      )
      if (!lead) return res.status(404).json({ error: 'Lead not found' })

      dispatchWebhook(orgId, 'lead.updated', { lead }).catch(() => {})

      return res.status(200).json({ lead })
    } catch (err) {
      console.error('v1/leads PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
