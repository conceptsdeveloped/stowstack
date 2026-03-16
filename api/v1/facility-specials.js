import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope, requireOrgFacility } from '../_api-auth.js'
import { dispatchWebhook } from '../_webhook.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  const { facilityId } = req.query
  const facility = await requireOrgFacility(res, facilityId, orgId)
  if (!facility) return

  // ── GET: list specials ──
  if (req.method === 'GET') {
    if (!requireScope(res, apiKey, 'units:read')) return

    try {
      const specials = await query(
        `SELECT id, name, description, applies_to, discount_type, discount_value,
                min_lease_months, start_date, end_date, active, created_at
         FROM facility_pms_specials WHERE facility_id = $1
         ORDER BY active DESC, created_at DESC`,
        [facilityId]
      )
      return res.status(200).json({ specials })
    } catch (err) {
      console.error('v1/facility-specials GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch specials' })
    }
  }

  // ── POST: create or update a special ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'units:write')) return

    const { id, name, description, appliesTo, discountType, discountValue, minLeaseMonths, startDate, endDate, active } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })

    try {
      let special
      const isUpdate = !!id

      if (isUpdate) {
        special = await queryOne(
          `UPDATE facility_pms_specials SET
            name = $2, description = $3, applies_to = $4, discount_type = $5,
            discount_value = $6, min_lease_months = $7, start_date = $8, end_date = $9, active = $10
           WHERE id = $1 AND facility_id = $11
           RETURNING *`,
          [id, name, description || null, appliesTo || [], discountType || 'fixed',
           discountValue || null, minLeaseMonths || 1, startDate || null, endDate || null,
           active !== false, facilityId]
        )
        if (!special) return res.status(404).json({ error: 'Special not found' })
      } else {
        special = await queryOne(
          `INSERT INTO facility_pms_specials (facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [facilityId, name, description || null, appliesTo || [], discountType || 'fixed',
           discountValue || null, minLeaseMonths || 1, startDate || null, endDate || null,
           active !== false]
        )
      }

      const event = isUpdate ? 'special.updated' : 'special.created'
      dispatchWebhook(orgId, event, { facilityId, special }).catch(() => {})

      return res.status(200).json({ special })
    } catch (err) {
      console.error('v1/facility-specials POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to save special' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
