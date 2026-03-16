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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

// Score a tenant's churn risk based on available signals
function computeChurnScore(tenant, payments) {
  const factors = []
  let score = 0

  if (tenant.days_delinquent > 0) {
    const pts = Math.min(30, tenant.days_delinquent)
    score += pts
    factors.push({ factor: 'Payment delinquency', weight: pts, detail: `${tenant.days_delinquent} days past due` })
  }

  if (!tenant.autopay_enabled) {
    score += 10
    factors.push({ factor: 'No autopay', weight: 10, detail: 'Manual payment increases churn risk' })
  }

  const latePayments = payments.filter(p => p.days_late > 0)
  if (latePayments.length > 0) {
    const pts = Math.min(20, latePayments.length * 5)
    score += pts
    factors.push({ factor: 'Late payment history', weight: pts, detail: `${latePayments.length} late payments` })
  }

  const tenureMonths = Math.floor((Date.now() - new Date(tenant.move_in_date).getTime()) / (30 * 86400000))
  if (tenureMonths < 3) {
    const pts = 15 - tenureMonths * 5
    score += pts
    factors.push({ factor: 'Short tenure', weight: pts, detail: `${tenureMonths} month(s) tenure` })
  }

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

  if (!tenant.has_insurance) {
    score += 5
    factors.push({ factor: 'No insurance', weight: 5, detail: 'Less invested in unit' })
  }

  score = Math.min(100, score)
  const riskLevel = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

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
    // GET: fetch predictions or campaigns
    if (req.method === 'GET') {
      const { facilityId, riskLevel, resource } = req.query

      // Fetch retention campaigns
      if (resource === 'campaigns') {
        const campaigns = await query(`
          SELECT rc.*, f.name as facility_name,
            (SELECT COUNT(*) FROM churn_predictions cp WHERE cp.retention_campaign_id = rc.id) as current_enrolled
          FROM retention_campaigns rc
          LEFT JOIN facilities f ON f.id = rc.facility_id
          ${facilityId ? 'WHERE rc.facility_id = $1' : ''}
          ORDER BY rc.created_at DESC
        `, facilityId ? [facilityId] : [])
        return res.json({ campaigns })
      }

      // Fetch predictions
      let sql = `
        SELECT cp.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
               t.unit_number, t.unit_size, t.unit_type, t.monthly_rate, t.move_in_date,
               t.days_delinquent, t.autopay_enabled, t.has_insurance, t.balance,
               f.name as facility_name, f.location as facility_location,
               rc.name as campaign_name
        FROM churn_predictions cp
        JOIN tenants t ON t.id = cp.tenant_id
        JOIN facilities f ON f.id = cp.facility_id
        LEFT JOIN retention_campaigns rc ON rc.id = cp.retention_campaign_id
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
          COUNT(*) FILTER (WHERE retention_status = 'churned') as churned_count,
          AVG(risk_score)::INTEGER as avg_risk_score,
          COUNT(*) FILTER (WHERE retention_campaign_id IS NOT NULL) as in_campaign_count
        FROM churn_predictions cp
        JOIN tenants t ON t.id = cp.tenant_id
        WHERE t.status = 'active'
        ${facilityId ? 'AND cp.facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      return res.json({ predictions, stats })
    }

    // POST: run churn scoring, create campaign, or enroll in campaign
    if (req.method === 'POST') {
      const { action } = req.body

      // Create retention campaign
      if (action === 'create_campaign') {
        const { facility_id, name, trigger_risk_level, sequence_steps } = req.body
        if (!name || !sequence_steps) return res.status(400).json({ error: 'name and sequence_steps required' })

        const campaign = await queryOne(`
          INSERT INTO retention_campaigns (facility_id, name, trigger_risk_level, sequence_steps)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [facility_id || null, name, trigger_risk_level || 'high', JSON.stringify(sequence_steps)])

        return res.json({ campaign })
      }

      // Enroll matching predictions in a campaign
      if (action === 'enroll_campaign') {
        const { campaign_id } = req.body
        if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' })

        const campaign = await queryOne(`SELECT * FROM retention_campaigns WHERE id = $1`, [campaign_id])
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

        const result = await query(`
          UPDATE churn_predictions SET
            retention_campaign_id = $1,
            retention_status = 'enrolled'
          WHERE retention_status = 'none'
            AND risk_level = ANY($2::text[])
            ${campaign.facility_id ? 'AND facility_id = $3' : ''}
          RETURNING id
        `, campaign.facility_id
          ? [campaign_id, campaign.trigger_risk_level === 'medium' ? ['medium','high','critical'] : campaign.trigger_risk_level === 'high' ? ['high','critical'] : ['critical'], campaign.facility_id]
          : [campaign_id, campaign.trigger_risk_level === 'medium' ? ['medium','high','critical'] : campaign.trigger_risk_level === 'high' ? ['high','critical'] : ['critical']])

        // Update campaign enrolled count
        await query(`UPDATE retention_campaigns SET enrolled_count = enrolled_count + $2 WHERE id = $1`, [campaign_id, result.length])

        return res.json({ enrolled: result.length })
      }

      // Run churn scoring
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

    // PATCH: update retention status (single or batch)
    if (req.method === 'PATCH') {
      const { id, ids, action, retention_status, campaign_id } = req.body

      // Batch update retention status
      if (Array.isArray(ids) && ids.length > 0) {
        if (action === 'batch_enroll' && campaign_id) {
          await query(`
            UPDATE churn_predictions SET retention_campaign_id = $2, retention_status = 'enrolled'
            WHERE id = ANY($1::uuid[])
          `, [ids, campaign_id])
          await query(`UPDATE retention_campaigns SET enrolled_count = enrolled_count + $2 WHERE id = $1`, [campaign_id, ids.length])
          return res.json({ updated: ids.length })
        }
        if (action === 'batch_status' && retention_status) {
          await query(`UPDATE churn_predictions SET retention_status = $2 WHERE id = ANY($1::uuid[])`, [ids, retention_status])
          if (retention_status === 'retained') {
            // Update campaign retained count
            const withCampaign = await query(`SELECT DISTINCT retention_campaign_id FROM churn_predictions WHERE id = ANY($1::uuid[]) AND retention_campaign_id IS NOT NULL`, [ids])
            for (const r of withCampaign) {
              const cnt = await queryOne(`SELECT COUNT(*) as c FROM churn_predictions WHERE retention_campaign_id = $1 AND retention_status = 'retained'`, [r.retention_campaign_id])
              await query(`UPDATE retention_campaigns SET retained_count = $2 WHERE id = $1`, [r.retention_campaign_id, cnt.c])
            }
          }
          return res.json({ updated: ids.length })
        }
        return res.status(400).json({ error: 'Unknown batch action' })
      }

      if (!id) return res.status(400).json({ error: 'id or ids required' })

      // Toggle campaign active state
      if (action === 'toggle_campaign') {
        const campaign = await queryOne(`
          UPDATE retention_campaigns SET active = NOT active, updated_at = NOW() WHERE id = $1 RETURNING *
        `, [id])
        return res.json({ campaign })
      }

      // Update campaign
      if (action === 'update_campaign') {
        const { name, trigger_risk_level, sequence_steps } = req.body
        const sets = ['updated_at = NOW()']
        const params = [id]
        if (name) { params.push(name); sets.push(`name = $${params.length}`) }
        if (trigger_risk_level) { params.push(trigger_risk_level); sets.push(`trigger_risk_level = $${params.length}`) }
        if (sequence_steps) { params.push(JSON.stringify(sequence_steps)); sets.push(`sequence_steps = $${params.length}`) }

        const campaign = await queryOne(`UPDATE retention_campaigns SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
        return res.json({ campaign })
      }

      const prediction = await queryOne(`
        UPDATE churn_predictions SET retention_status = $2 WHERE id = $1 RETURNING *
      `, [id, retention_status])

      return res.json({ prediction })
    }

    // DELETE: remove campaign
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id required' })
      // Unlink predictions first
      await query(`UPDATE churn_predictions SET retention_campaign_id = NULL WHERE retention_campaign_id = $1`, [id])
      await query(`DELETE FROM retention_campaigns WHERE id = $1`, [id])
      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Churn predictions API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
