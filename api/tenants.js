import { query, queryOne } from './_db.js'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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
  return req.headers['x-admin-key'] === ADMIN_KEY
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // GET: list tenants, optionally filter by facility
    if (req.method === 'GET') {
      const { facilityId, status, delinquent } = req.query

      let sql = `
        SELECT t.*, f.name as facility_name, f.location as facility_location
        FROM tenants t
        JOIN facilities f ON f.id = t.facility_id
        WHERE 1=1
      `
      const params = []

      if (facilityId) {
        params.push(facilityId)
        sql += ` AND t.facility_id = $${params.length}`
      }
      if (status) {
        params.push(status)
        sql += ` AND t.status = $${params.length}`
      }
      if (delinquent === 'true') {
        sql += ` AND t.days_delinquent > 0`
      }

      sql += ` ORDER BY t.days_delinquent DESC, t.name ASC`

      const tenants = await query(sql, params)

      // Get summary stats
      const stats = await queryOne(`
        SELECT
          COUNT(*) as total_tenants,
          COUNT(*) FILTER (WHERE status = 'active') as active_tenants,
          COUNT(*) FILTER (WHERE status = 'delinquent') as delinquent_tenants,
          COUNT(*) FILTER (WHERE days_delinquent > 0) as late_count,
          COUNT(*) FILTER (WHERE days_delinquent > 30) as severe_late_count,
          COUNT(*) FILTER (WHERE autopay_enabled = true) as autopay_count,
          SUM(monthly_rate) FILTER (WHERE status = 'active') as total_mrr,
          SUM(balance) FILTER (WHERE balance > 0) as total_outstanding,
          AVG(days_delinquent) FILTER (WHERE days_delinquent > 0) as avg_days_late
        FROM tenants
        ${facilityId ? 'WHERE facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      // Get recent payments
      const recentPayments = await query(`
        SELECT tp.*, t.name as tenant_name, t.unit_number
        FROM tenant_payments tp
        JOIN tenants t ON t.id = tp.tenant_id
        ${facilityId ? 'WHERE tp.facility_id = $1' : ''}
        ORDER BY tp.payment_date DESC
        LIMIT 20
      `, facilityId ? [facilityId] : [])

      return res.json({ tenants, stats, recentPayments })
    }

    // POST: create/sync a tenant
    if (req.method === 'POST') {
      const { facility_id, external_id, name, email, phone, unit_number, unit_size, unit_type,
              monthly_rate, move_in_date, autopay_enabled, has_insurance, insurance_monthly, balance, status } = req.body

      if (!facility_id || !name || !unit_number) {
        return res.status(400).json({ error: 'facility_id, name, and unit_number are required' })
      }

      const tenant = await queryOne(`
        INSERT INTO tenants (facility_id, external_id, name, email, phone, unit_number, unit_size, unit_type,
          monthly_rate, move_in_date, autopay_enabled, has_insurance, insurance_monthly, balance, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (facility_id, external_id) WHERE external_id IS NOT NULL
        DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
          unit_number = EXCLUDED.unit_number, unit_size = EXCLUDED.unit_size, monthly_rate = EXCLUDED.monthly_rate,
          autopay_enabled = EXCLUDED.autopay_enabled, has_insurance = EXCLUDED.has_insurance,
          balance = EXCLUDED.balance, status = EXCLUDED.status, updated_at = NOW()
        RETURNING *
      `, [facility_id, external_id, name, email, phone, unit_number, unit_size, unit_type,
          monthly_rate || 0, move_in_date || new Date().toISOString().slice(0, 10),
          autopay_enabled || false, has_insurance || false, insurance_monthly || 0, balance || 0, status || 'active'])

      return res.json({ tenant })
    }

    // PATCH: update tenant status, payment, move-out
    if (req.method === 'PATCH') {
      const { id, action, ...updates } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })

      if (action === 'record_payment') {
        const { amount, payment_date, due_date, method } = updates
        const daysLate = due_date && payment_date
          ? Math.max(0, Math.floor((new Date(payment_date) - new Date(due_date)) / 86400000))
          : 0

        const payment = await queryOne(`
          INSERT INTO tenant_payments (tenant_id, facility_id, amount, payment_date, due_date, method, status, days_late)
          SELECT $1, facility_id, $2, $3, $4, $5, $6, $7
          FROM tenants WHERE id = $1
          RETURNING *
        `, [id, amount, payment_date, due_date, method || 'manual', daysLate > 0 ? 'late' : 'paid', daysLate])

        // Update tenant balance and last payment
        await query(`
          UPDATE tenants SET balance = GREATEST(0, balance - $2), last_payment_date = $3,
            days_delinquent = CASE WHEN balance - $2 <= 0 THEN 0 ELSE days_delinquent END,
            status = CASE WHEN balance - $2 <= 0 THEN 'active' ELSE status END,
            updated_at = NOW()
          WHERE id = $1
        `, [id, amount, payment_date])

        return res.json({ payment })
      }

      if (action === 'move_out') {
        const { moved_out_date, move_out_reason } = updates
        const tenant = await queryOne(`
          UPDATE tenants SET status = 'moved_out', moved_out_date = $2, move_out_reason = $3, updated_at = NOW()
          WHERE id = $1 RETURNING *
        `, [id, moved_out_date || new Date().toISOString().slice(0, 10), move_out_reason || 'voluntary'])

        // Auto-enroll in move-out remarketing
        if (tenant) {
          await query(`
            INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason, sequence_status, next_send_at)
            VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '3 days')
            ON CONFLICT (tenant_id) DO NOTHING
          `, [id, tenant.facility_id, tenant.moved_out_date, tenant.move_out_reason])
        }

        return res.json({ tenant })
      }

      // Generic update
      const allowed = ['name', 'email', 'phone', 'unit_number', 'unit_size', 'monthly_rate',
                       'autopay_enabled', 'has_insurance', 'balance', 'days_delinquent', 'status']
      const sets = []
      const params = [id]
      for (const [k, v] of Object.entries(updates)) {
        if (allowed.includes(k)) {
          params.push(v)
          sets.push(`${k} = $${params.length}`)
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' })
      sets.push('updated_at = NOW()')

      const tenant = await queryOne(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
      return res.json({ tenant })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Tenants API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
