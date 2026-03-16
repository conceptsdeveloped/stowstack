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
    if (!requireScope(res, apiKey, 'facilities:read')) return

    try {
      if (id) {
        const facility = await queryOne(
          `SELECT id, name, location, contact_name, contact_email, contact_phone,
                  status, occupancy_range, total_units, created_at, updated_at
           FROM facilities WHERE id = $1 AND organization_id = $2`,
          [id, orgId]
        )
        if (!facility) return res.status(404).json({ error: 'Facility not found' })
        return res.status(200).json({ facility })
      }

      // List with pagination
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25))
      const offset = (page - 1) * limit
      const status = req.query.status

      let where = 'WHERE organization_id = $1'
      const params = [orgId]
      let paramIdx = 2

      if (status) {
        where += ` AND status = $${paramIdx++}`
        params.push(status)
      }

      const [facilities, countRow] = await Promise.all([
        query(
          `SELECT id, name, location, contact_name, contact_email, contact_phone,
                  status, occupancy_range, total_units, created_at, updated_at
           FROM facilities ${where}
           ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
          [...params, limit, offset]
        ),
        queryOne(`SELECT COUNT(*)::int AS total FROM facilities ${where}`, params),
      ])

      const total = countRow?.total || 0
      return res.status(200).json({
        facilities,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    } catch (err) {
      console.error('v1/facilities GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch facilities' })
    }
  }

  // ── POST: create facility ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'facilities:write')) return

    const { name, location, contactName, contactEmail, contactPhone, totalUnits, occupancyRange } = req.body || {}
    if (!name || !location) {
      return res.status(400).json({ error: 'name and location are required' })
    }

    try {
      const facility = await queryOne(
        `INSERT INTO facilities (name, location, contact_name, contact_email, contact_phone, total_units, occupancy_range, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, location, contact_name, contact_email, contact_phone, status, occupancy_range, total_units, created_at`,
        [name, location, contactName || null, contactEmail || null, contactPhone || null, totalUnits || null, occupancyRange || null, orgId]
      )

      dispatchWebhook(orgId, 'facility.updated', { action: 'created', facility }).catch(() => {})

      return res.status(200).json({ facility })
    } catch (err) {
      console.error('v1/facilities POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to create facility' })
    }
  }

  // ── PATCH: update facility ──
  if (req.method === 'PATCH') {
    if (!requireScope(res, apiKey, 'facilities:write')) return
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    // Only allow updating safe fields
    const allowed = ['name', 'location', 'contact_name', 'contact_email', 'contact_phone', 'total_units', 'occupancy_range']
    const bodyMap = {
      name: 'name', location: 'location',
      contactName: 'contact_name', contactEmail: 'contact_email', contactPhone: 'contact_phone',
      totalUnits: 'total_units', occupancyRange: 'occupancy_range',
    }

    const sets = []
    const params = []
    let paramIdx = 1

    for (const [bodyKey, dbCol] of Object.entries(bodyMap)) {
      if (req.body?.[bodyKey] !== undefined) {
        sets.push(`${dbCol} = $${paramIdx++}`)
        params.push(req.body[bodyKey])
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' })

    sets.push(`updated_at = NOW()`)
    params.push(id, orgId)

    try {
      const facility = await queryOne(
        `UPDATE facilities SET ${sets.join(', ')}
         WHERE id = $${paramIdx++} AND organization_id = $${paramIdx}
         RETURNING id, name, location, contact_name, contact_email, contact_phone, status, occupancy_range, total_units, created_at, updated_at`,
        params
      )
      if (!facility) return res.status(404).json({ error: 'Facility not found' })

      dispatchWebhook(orgId, 'facility.updated', { action: 'updated', facility }).catch(() => {})

      return res.status(200).json({ facility })
    } catch (err) {
      console.error('v1/facilities PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update facility' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
