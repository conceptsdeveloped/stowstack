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

// Identify upsell opportunities for a tenant
function identifyUpsells(tenant) {
  const opportunities = []

  // Insurance upsell
  if (!tenant.has_insurance) {
    opportunities.push({
      type: 'insurance',
      title: 'Add tenant protection plan',
      description: `${tenant.name} has no insurance on unit ${tenant.unit_number}. Recommend adding coverage.`,
      current_value: 0,
      proposed_value: 12,
      monthly_uplift: 12,
      confidence: 75,
    })
  }

  // Autopay enrollment
  if (!tenant.autopay_enabled) {
    opportunities.push({
      type: 'autopay',
      title: 'Enroll in autopay',
      description: `${tenant.name} pays manually. Autopay reduces delinquency risk and improves retention.`,
      current_value: 0,
      proposed_value: 0,
      monthly_uplift: 0,
      confidence: 60,
    })
  }

  // Unit size upgrade (tenants in small units for > 6 months)
  const tenureMonths = Math.floor((Date.now() - new Date(tenant.move_in_date).getTime()) / (30 * 86400000))
  const smallSizes = ['5x5', '5x10', '5x15']
  if (tenant.unit_size && smallSizes.some(s => tenant.unit_size.includes(s)) && tenureMonths > 6) {
    const currentRate = parseFloat(tenant.monthly_rate) || 0
    const proposedRate = Math.round(currentRate * 1.4)
    opportunities.push({
      type: 'unit_upgrade',
      title: 'Upgrade to larger unit',
      description: `${tenant.name} has been in a ${tenant.unit_size} for ${tenureMonths} months. May need more space.`,
      current_value: currentRate,
      proposed_value: proposedRate,
      monthly_uplift: proposedRate - currentRate,
      confidence: 45,
    })
  }

  // Climate upgrade (standard unit tenants with high rates = storing valuable items)
  if (tenant.unit_type === 'standard' && parseFloat(tenant.monthly_rate) > 100) {
    const currentRate = parseFloat(tenant.monthly_rate) || 0
    const proposedRate = Math.round(currentRate * 1.25)
    opportunities.push({
      type: 'climate_upgrade',
      title: 'Upgrade to climate-controlled',
      description: `${tenant.name} stores in a standard unit at $${currentRate}/mo. Climate protection adds value.`,
      current_value: currentRate,
      proposed_value: proposedRate,
      monthly_uplift: proposedRate - currentRate,
      confidence: 40,
    })
  }

  return opportunities
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // GET: fetch opportunities
    if (req.method === 'GET') {
      const { facilityId, type, status } = req.query

      let sql = `
        SELECT uo.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
               t.unit_number, t.unit_size, t.monthly_rate,
               f.name as facility_name, f.location as facility_location
        FROM upsell_opportunities uo
        JOIN tenants t ON t.id = uo.tenant_id
        JOIN facilities f ON f.id = uo.facility_id
        WHERE 1=1
      `
      const params = []
      if (facilityId) {
        params.push(facilityId)
        sql += ` AND uo.facility_id = $${params.length}`
      }
      if (type) {
        params.push(type)
        sql += ` AND uo.type = $${params.length}`
      }
      if (status) {
        params.push(status)
        sql += ` AND uo.status = $${params.length}`
      }
      sql += ` ORDER BY uo.monthly_uplift DESC, uo.confidence DESC`

      const opportunities = await query(sql, params)

      const stats = await queryOne(`
        SELECT
          COUNT(*) as total_opportunities,
          COUNT(*) FILTER (WHERE status = 'identified') as pending_count,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
          COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
          SUM(monthly_uplift) FILTER (WHERE status = 'identified') as potential_mrr,
          SUM(monthly_uplift) FILTER (WHERE status = 'accepted') as captured_mrr,
          COUNT(DISTINCT type) as type_count
        FROM upsell_opportunities
        ${facilityId ? 'WHERE facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      return res.json({ opportunities, stats })
    }

    // POST: scan tenants and generate upsell opportunities
    if (req.method === 'POST') {
      const { facilityId } = req.body

      let tenantsSql = `SELECT * FROM tenants WHERE status = 'active'`
      const params = []
      if (facilityId) {
        params.push(facilityId)
        tenantsSql += ` AND facility_id = $1`
      }

      const tenants = await query(tenantsSql, params)
      let created = 0

      for (const tenant of tenants) {
        const upsells = identifyUpsells(tenant)
        for (const u of upsells) {
          // Only create if not already identified for this tenant+type
          const existing = await queryOne(
            `SELECT id FROM upsell_opportunities WHERE tenant_id = $1 AND type = $2 AND status IN ('identified', 'queued', 'sent')`,
            [tenant.id, u.type]
          )
          if (!existing) {
            await query(`
              INSERT INTO upsell_opportunities (tenant_id, facility_id, type, title, description,
                current_value, proposed_value, monthly_uplift, confidence)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [tenant.id, tenant.facility_id, u.type, u.title, u.description,
                u.current_value, u.proposed_value, u.monthly_uplift, u.confidence])
            created++
          }
        }
      }

      return res.json({ created, message: `Found ${created} new upsell opportunities` })
    }

    // PATCH: update opportunity status
    if (req.method === 'PATCH') {
      const { id, status, outreach_method } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })

      const sets = ['updated_at = NOW()']
      const params = [id]

      if (status) {
        params.push(status)
        sets.push(`status = $${params.length}`)
        if (status === 'sent') sets.push('sent_at = NOW()')
        if (['accepted', 'declined'].includes(status)) sets.push('responded_at = NOW()')
      }
      if (outreach_method) {
        params.push(outreach_method)
        sets.push(`outreach_method = $${params.length}`)
      }

      const opp = await queryOne(`UPDATE upsell_opportunities SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
      return res.json({ opportunity: opp })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Upsell API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
