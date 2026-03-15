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

// Score a tenant's churn risk based on available signals
function computeChurnScore(tenant, payments) {
  const factors = []
  let score = 0

  // Factor 1: Delinquency (0-30 pts)
  if (tenant.days_delinquent > 0) {
    const pts = Math.min(30, tenant.days_delinquent)
    score += pts
    factors.push({ factor: 'Payment delinquency', weight: pts, detail: `${tenant.days_delinquent} days past due` })
  }

  // Factor 2: No autopay (0-10 pts)
  if (!tenant.autopay_enabled) {
    score += 10
    factors.push({ factor: 'No autopay', weight: 10, detail: 'Manual payment increases churn risk' })
  }

  // Factor 3: Late payment history (0-20 pts)
  const latePayments = payments.filter(p => p.days_late > 0)
  if (latePayments.length > 0) {
    const pts = Math.min(20, latePayments.length * 5)
    score += pts
    factors.push({ factor: 'Late payment history', weight: pts, detail: `${latePayments.length} late payments` })
  }

  // Factor 4: Short tenure (0-15 pts) — tenants < 3 months are higher risk
  const tenureMonths = Math.floor((Date.now() - new Date(tenant.move_in_date).getTime()) / (30 * 86400000))
  if (tenureMonths < 3) {
    const pts = 15 - tenureMonths * 5
    score += pts
    factors.push({ factor: 'Short tenure', weight: pts, detail: `${tenureMonths} month(s) tenure` })
  }

  // Factor 5: Lease expiring soon (0-15 pts)
  if (tenant.lease_end_date) {
    const daysToEnd = Math.floor((new Date(tenant.lease_end_date).getTime() - Date.now()) / 86400000)
    if (daysToEnd <= 30 && daysToEnd > 0) {
      const pts = Math.min(15, Math.round(15 * (1 - daysToEnd / 30)))
      score += pts
      factors.push({ factor: 'Lease expiring soon', weight: pts, detail: `${daysToEnd} days until lease end` })
    } else if (daysToEnd <= 0) {
      score += 15
      factors.push({ factor: 'Lease expired', weight: 15, detail: 'Month-to-month, easy to leave' })
    }
  } else {
    score += 5
    factors.push({ factor: 'No lease end date', weight: 5, detail: 'Month-to-month tenant' })
  }

  // Factor 6: No insurance (slight signal)
  if (!tenant.has_insurance) {
    score += 5
    factors.push({ factor: 'No insurance', weight: 5, detail: 'Less invested in unit' })
  }

  score = Math.min(100, score)
  const riskLevel = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

  // Recommended actions
  const actions = []
  if (score >= 50) {
    actions.push({ action: 'personal_call', priority: 'high', description: 'Schedule a personal check-in call' })
  }
  if (score >= 25 && !tenant.autopay_enabled) {
    actions.push({ action: 'autopay_incentive', priority: 'medium', description: 'Offer autopay discount incentive' })
  }
  if (score >= 50 && tenant.lease_end_date) {
    actions.push({ action: 'renewal_offer', priority: 'high', description: 'Send early renewal offer with discount' })
  }
  if (tenant.days_delinquent > 7) {
    actions.push({ action: 'payment_reminder', priority: 'urgent', description: 'Send payment reminder with flexible options' })
  }

  return { score, riskLevel, factors, actions, predictedVacate: riskLevel === 'critical' || riskLevel === 'high'
    ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : null }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // GET: fetch predictions, optionally filter
    if (req.method === 'GET') {
      const { facilityId, riskLevel } = req.query

      let sql = `
        SELECT cp.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
               t.unit_number, t.unit_size, t.unit_type, t.monthly_rate, t.move_in_date,
               t.days_delinquent, t.autopay_enabled, t.has_insurance, t.balance,
               f.name as facility_name, f.location as facility_location
        FROM churn_predictions cp
        JOIN tenants t ON t.id = cp.tenant_id
        JOIN facilities f ON f.id = cp.facility_id
        WHERE t.status = 'active'
      `
      const params = []
      if (facilityId) {
        params.push(facilityId)
        sql += ` AND cp.facility_id = $${params.length}`
      }
      if (riskLevel) {
        params.push(riskLevel)
        sql += ` AND cp.risk_level = $${params.length}`
      }
      sql += ` ORDER BY cp.risk_score DESC`

      const predictions = await query(sql, params)

      const stats = await queryOne(`
        SELECT
          COUNT(*) as total_scored,
          COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE risk_level = 'high') as high_count,
          COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_count,
          COUNT(*) FILTER (WHERE risk_level = 'low') as low_count,
          COUNT(*) FILTER (WHERE retention_status = 'enrolled') as enrolled_count,
          COUNT(*) FILTER (WHERE retention_status = 'retained') as retained_count,
          AVG(risk_score)::INTEGER as avg_risk_score
        FROM churn_predictions cp
        JOIN tenants t ON t.id = cp.tenant_id
        WHERE t.status = 'active'
        ${facilityId ? 'AND cp.facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      return res.json({ predictions, stats })
    }

    // POST: run churn scoring for a facility (or all)
    if (req.method === 'POST') {
      const { facilityId } = req.body

      let tenantsSql = `SELECT * FROM tenants WHERE status = 'active'`
      const params = []
      if (facilityId) {
        params.push(facilityId)
        tenantsSql += ` AND facility_id = $1`
      }

      const tenants = await query(tenantsSql, params)
      let scored = 0

      for (const tenant of tenants) {
        const payments = await query(
          `SELECT * FROM tenant_payments WHERE tenant_id = $1 ORDER BY payment_date DESC LIMIT 12`,
          [tenant.id]
        )

        const result = computeChurnScore(tenant, payments)

        await query(`
          INSERT INTO churn_predictions (tenant_id, facility_id, risk_score, risk_level, predicted_vacate, factors, recommended_actions, last_scored_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (tenant_id) DO UPDATE SET
            risk_score = EXCLUDED.risk_score, risk_level = EXCLUDED.risk_level,
            predicted_vacate = EXCLUDED.predicted_vacate, factors = EXCLUDED.factors,
            recommended_actions = EXCLUDED.recommended_actions, last_scored_at = NOW()
        `, [tenant.id, tenant.facility_id, result.score, result.riskLevel,
            result.predictedVacate, JSON.stringify(result.factors), JSON.stringify(result.actions)])

        scored++
      }

      return res.json({ scored, message: `Scored ${scored} tenants` })
    }

    // PATCH: update retention status
    if (req.method === 'PATCH') {
      const { id, retention_status } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })

      const prediction = await queryOne(`
        UPDATE churn_predictions SET retention_status = $2 WHERE id = $1 RETURNING *
      `, [id, retention_status])

      return res.json({ prediction })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Churn predictions API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
