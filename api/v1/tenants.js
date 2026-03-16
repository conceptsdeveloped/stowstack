import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope, requireOrgFacility } from '../_api-auth.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  const { id, facilityId } = req.query

  // ── GET: list or get single tenant ──
  if (req.method === 'GET') {
    if (!requireScope(res, apiKey, 'tenants:read')) return

    try {
      // Single tenant by ID
      if (id) {
        const tenant = await queryOne(
          `SELECT t.id, t.facility_id, t.external_id, t.name, t.email, t.phone,
                  t.unit_number, t.unit_size, t.unit_type, t.monthly_rate,
                  t.move_in_date, t.lease_end_date, t.autopay_enabled, t.has_insurance,
                  t.balance, t.status, t.days_delinquent, t.last_payment_date,
                  t.moved_out_date, t.move_out_reason, t.created_at, t.updated_at
           FROM tenants t
           JOIN facilities f ON f.id = t.facility_id
           WHERE t.id = $1 AND f.organization_id = $2`,
          [id, orgId]
        )
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

        const payments = await query(
          `SELECT id, amount, payment_date, due_date, method, status, days_late, created_at
           FROM tenant_payments WHERE tenant_id = $1 ORDER BY payment_date DESC LIMIT 20`,
          [id]
        )

        return res.status(200).json({ tenant, payments })
      }

      // List tenants for a facility
      if (!facilityId) return res.status(400).json({ error: 'facilityId or id is required' })

      const facility = await requireOrgFacility(res, facilityId, orgId)
      if (!facility) return

      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
      const offset = (page - 1) * limit

      let where = 'WHERE t.facility_id = $1'
      const params = [facilityId]
      let paramIdx = 2

      if (req.query.status) {
        where += ` AND t.status = $${paramIdx++}`
        params.push(req.query.status)
      }

      const [tenants, countRow] = await Promise.all([
        query(
          `SELECT t.id, t.external_id, t.name, t.email, t.phone,
                  t.unit_number, t.unit_size, t.unit_type, t.monthly_rate,
                  t.move_in_date, t.autopay_enabled, t.has_insurance,
                  t.balance, t.status, t.days_delinquent, t.last_payment_date,
                  t.created_at, t.updated_at
           FROM tenants t ${where}
           ORDER BY t.name ASC
           LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
          [...params, limit, offset]
        ),
        queryOne(`SELECT COUNT(*)::int AS total FROM tenants t ${where}`, params),
      ])

      const total = countRow?.total || 0
      return res.status(200).json({ tenants, total, page, totalPages: Math.ceil(total / limit) })
    } catch (err) {
      console.error('v1/tenants GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch tenants' })
    }
  }

  // ── POST: bulk import/upsert tenants ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'tenants:write')) return

    const { facilityId: bodyFacilityId, tenants: tenantList } = req.body || {}
    const fId = bodyFacilityId || facilityId
    if (!fId || !Array.isArray(tenantList) || !tenantList.length) {
      return res.status(400).json({ error: 'facilityId and tenants[] are required' })
    }

    const facility = await requireOrgFacility(res, fId, orgId)
    if (!facility) return

    try {
      let imported = 0
      const errors = []

      for (const t of tenantList) {
        if (!t.name) { errors.push({ name: t.name, error: 'name required' }); continue }

        try {
          await queryOne(`
            INSERT INTO tenants (facility_id, external_id, name, email, phone, unit_number,
                                 unit_size, unit_type, monthly_rate, move_in_date,
                                 autopay_enabled, has_insurance, balance, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (facility_id, external_id)
            WHERE external_id IS NOT NULL
            DO UPDATE SET
              name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
              unit_number = EXCLUDED.unit_number, unit_size = EXCLUDED.unit_size,
              unit_type = EXCLUDED.unit_type, monthly_rate = EXCLUDED.monthly_rate,
              autopay_enabled = EXCLUDED.autopay_enabled, has_insurance = EXCLUDED.has_insurance,
              balance = EXCLUDED.balance, status = EXCLUDED.status, updated_at = NOW()
            RETURNING id
          `, [
            fId, t.externalId || null, t.name, t.email || null, t.phone || null,
            t.unitNumber || null, t.unitSize || null, t.unitType || null,
            t.monthlyRate || null, t.moveInDate || null,
            t.autopayEnabled || false, t.hasInsurance || false,
            t.balance || 0, t.status || 'active',
          ])
          imported++
        } catch (e) {
          errors.push({ name: t.name, error: e.message })
        }
      }

      return res.status(200).json({ imported, total: tenantList.length, errors })
    } catch (err) {
      console.error('v1/tenants POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to import tenants' })
    }
  }

  // ── PATCH: update a single tenant ──
  if (req.method === 'PATCH') {
    if (!requireScope(res, apiKey, 'tenants:write')) return
    if (!id) return res.status(400).json({ error: 'id query param is required' })

    const fieldMap = {
      name: 'name', email: 'email', phone: 'phone',
      unitNumber: 'unit_number', unitSize: 'unit_size', unitType: 'unit_type',
      monthlyRate: 'monthly_rate', moveInDate: 'move_in_date',
      autopayEnabled: 'autopay_enabled', hasInsurance: 'has_insurance',
      balance: 'balance', status: 'status', daysDelinquent: 'days_delinquent',
      movedOutDate: 'moved_out_date', moveOutReason: 'move_out_reason',
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
    sets.push('updated_at = NOW()')
    params.push(id, orgId)

    try {
      const tenant = await queryOne(
        `UPDATE tenants SET ${sets.join(', ')}
         FROM facilities f
         WHERE tenants.id = $${paramIdx++}
           AND tenants.facility_id = f.id
           AND f.organization_id = $${paramIdx}
         RETURNING tenants.id, tenants.facility_id, tenants.name, tenants.email,
                   tenants.unit_number, tenants.unit_size, tenants.status, tenants.updated_at`,
        params
      )
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' })
      return res.status(200).json({ tenant })
    } catch (err) {
      console.error('v1/tenants PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update tenant' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
