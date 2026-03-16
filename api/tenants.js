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

const ESCALATION_STAGES = ['late_notice', 'second_notice', 'pre_lien', 'lien_filed', 'auction_scheduled', 'auction_complete']
const ESCALATION_THRESHOLDS = { late_notice: 1, second_notice: 8, pre_lien: 15, lien_filed: 31, auction_scheduled: 46, auction_complete: 61 }

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // GET: list tenants with enriched data
    if (req.method === 'GET') {
      const { facilityId, status, delinquent, includeAnalytics, tenantId } = req.query

      // Single tenant detail with full history
      if (tenantId) {
        const tenant = await queryOne(`
          SELECT t.*, f.name as facility_name, f.location as facility_location
          FROM tenants t JOIN facilities f ON f.id = t.facility_id
          WHERE t.id = $1
        `, [tenantId])
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

        const payments = await query(`SELECT * FROM tenant_payments WHERE tenant_id = $1 ORDER BY payment_date DESC LIMIT 50`, [tenantId])
        const escalations = await query(`SELECT * FROM delinquency_escalations WHERE tenant_id = $1 ORDER BY stage_entered_at DESC`, [tenantId])
        const churn = await queryOne(`SELECT * FROM churn_predictions WHERE tenant_id = $1`, [tenantId])
        const upsells = await query(`SELECT * FROM upsell_opportunities WHERE tenant_id = $1 AND status IN ('identified','queued','sent') ORDER BY monthly_uplift DESC`, [tenantId])
        const comms = await query(`SELECT * FROM tenant_communications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`, [tenantId])

        return res.json({ tenant, payments, escalations, churn, upsells, communications: comms })
      }

      // List tenants with cross-tab enrichment
      let sql = `
        SELECT t.*, f.name as facility_name, f.location as facility_location,
          cp.risk_score, cp.risk_level, cp.retention_status,
          COALESCE(uo.upsell_count, 0) as upsell_count,
          COALESCE(uo.upsell_potential, 0) as upsell_potential,
          de.current_stage, de.stage_entered_at as escalation_started
        FROM tenants t
        JOIN facilities f ON f.id = t.facility_id
        LEFT JOIN churn_predictions cp ON cp.tenant_id = t.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as upsell_count, COALESCE(SUM(monthly_uplift), 0) as upsell_potential
          FROM upsell_opportunities WHERE tenant_id = t.id AND status IN ('identified','queued','sent')
        ) uo ON true
        LEFT JOIN LATERAL (
          SELECT stage as current_stage, stage_entered_at
          FROM delinquency_escalations WHERE tenant_id = t.id
          ORDER BY stage_entered_at DESC LIMIT 1
        ) de ON true
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

      // Get summary stats with cross-tab data
      const stats = await queryOne(`
        SELECT
          COUNT(*) as total_tenants,
          COUNT(*) FILTER (WHERE t.status = 'active') as active_tenants,
          COUNT(*) FILTER (WHERE t.status = 'delinquent') as delinquent_tenants,
          COUNT(*) FILTER (WHERE t.days_delinquent > 0) as late_count,
          COUNT(*) FILTER (WHERE t.days_delinquent > 30) as severe_late_count,
          COUNT(*) FILTER (WHERE t.autopay_enabled = true) as autopay_count,
          SUM(t.monthly_rate) FILTER (WHERE t.status = 'active') as total_mrr,
          SUM(t.balance) FILTER (WHERE t.balance > 0) as total_outstanding,
          AVG(t.days_delinquent) FILTER (WHERE t.days_delinquent > 0) as avg_days_late,
          COUNT(*) FILTER (WHERE cp.risk_level IN ('high','critical')) as at_risk_count,
          COALESCE(SUM(t.monthly_rate) FILTER (WHERE cp.risk_level IN ('high','critical')), 0) as at_risk_revenue
        FROM tenants t
        LEFT JOIN churn_predictions cp ON cp.tenant_id = t.id
        ${facilityId ? 'WHERE t.facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      // Upsell potential summary
      const upsellStats = await queryOne(`
        SELECT COALESCE(SUM(monthly_uplift), 0) as total_upsell_potential,
               COUNT(*) as total_upsell_opps
        FROM upsell_opportunities
        WHERE status = 'identified'
        ${facilityId ? 'AND facility_id = $1' : ''}
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

      const result = { tenants, stats: { ...stats, ...upsellStats }, recentPayments }

      // Payment analytics (collections over time, method breakdown)
      if (includeAnalytics === 'true') {
        const monthlyCollections = await query(`
          SELECT date_trunc('month', payment_date)::date as month,
                 SUM(amount) FILTER (WHERE status = 'paid') as collected,
                 SUM(amount) FILTER (WHERE status IN ('pending','failed','late')) as outstanding,
                 COUNT(*) as payment_count
          FROM tenant_payments
          WHERE payment_date >= NOW() - INTERVAL '6 months'
          ${facilityId ? 'AND facility_id = $1' : ''}
          GROUP BY date_trunc('month', payment_date)
          ORDER BY month
        `, facilityId ? [facilityId] : [])

        const methodBreakdown = await query(`
          SELECT method, COUNT(*) as count, SUM(amount) as total
          FROM tenant_payments
          WHERE payment_date >= NOW() - INTERVAL '6 months'
          ${facilityId ? 'AND facility_id = $1' : ''}
          GROUP BY method
          ORDER BY total DESC
        `, facilityId ? [facilityId] : [])

        const collectionRate = await queryOne(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
            COUNT(*) as total_count,
            ROUND(COUNT(*) FILTER (WHERE status = 'paid')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as rate
          FROM tenant_payments
          WHERE payment_date >= NOW() - INTERVAL '30 days'
          ${facilityId ? 'AND facility_id = $1' : ''}
        `, facilityId ? [facilityId] : [])

        result.analytics = { monthlyCollections, methodBreakdown, collectionRate }
      }

      return res.json(result)
    }

    // POST: create/sync a tenant, or bulk import
    if (req.method === 'POST') {
      const { tenants: bulkTenants, action } = req.body

      // Auto-escalate delinquent tenants
      if (action === 'auto_escalate') {
        const { facilityId } = req.body
        const delinquent = await query(`
          SELECT t.* FROM tenants t WHERE t.days_delinquent > 0 AND t.status IN ('active','delinquent')
          ${facilityId ? 'AND t.facility_id = $1' : ''}
        `, facilityId ? [facilityId] : [])

        let escalated = 0
        for (const t of delinquent) {
          // Find current escalation stage
          const current = await queryOne(`
            SELECT stage FROM delinquency_escalations WHERE tenant_id = $1 ORDER BY stage_entered_at DESC LIMIT 1
          `, [t.id])

          const currentIdx = current ? ESCALATION_STAGES.indexOf(current.stage) : -1

          // Determine target stage based on days delinquent
          let targetStage = null
          for (let i = ESCALATION_STAGES.length - 1; i >= 0; i--) {
            if (t.days_delinquent >= ESCALATION_THRESHOLDS[ESCALATION_STAGES[i]]) {
              targetStage = ESCALATION_STAGES[i]
              break
            }
          }

          if (targetStage && ESCALATION_STAGES.indexOf(targetStage) > currentIdx) {
            const nextIdx = ESCALATION_STAGES.indexOf(targetStage) + 1
            const nextStageAt = nextIdx < ESCALATION_STAGES.length
              ? new Date(Date.now() + 7 * 86400000).toISOString()
              : null

            await query(`
              INSERT INTO delinquency_escalations (tenant_id, facility_id, stage, next_stage_at, automated)
              VALUES ($1, $2, $3, $4, true)
            `, [t.id, t.facility_id, targetStage, nextStageAt])

            // Update tenant status if needed
            if (t.status !== 'delinquent') {
              await query(`UPDATE tenants SET status = 'delinquent', updated_at = NOW() WHERE id = $1`, [t.id])
            }
            escalated++
          }
        }

        return res.json({ escalated, message: `Escalated ${escalated} tenants` })
      }

      // Bulk import
      if (Array.isArray(bulkTenants)) {
        const facility_id = req.body.facility_id
        if (!facility_id) return res.status(400).json({ error: 'facility_id required for bulk import' })

        let imported = 0, skipped = 0
        const errors = []

        for (const t of bulkTenants) {
          try {
            if (!t.name || !t.unit_number) {
              skipped++
              continue
            }
            await queryOne(`
              INSERT INTO tenants (facility_id, external_id, name, email, phone, unit_number, unit_size, unit_type,
                monthly_rate, move_in_date, autopay_enabled, has_insurance, insurance_monthly, balance, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              ON CONFLICT (facility_id, external_id) WHERE external_id IS NOT NULL
              DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
                unit_number = EXCLUDED.unit_number, unit_size = EXCLUDED.unit_size, monthly_rate = EXCLUDED.monthly_rate,
                autopay_enabled = EXCLUDED.autopay_enabled, has_insurance = EXCLUDED.has_insurance,
                balance = EXCLUDED.balance, status = EXCLUDED.status, updated_at = NOW()
              RETURNING id
            `, [facility_id, t.external_id || null, t.name, t.email || null, t.phone || null,
                t.unit_number, t.unit_size || null, t.unit_type || 'standard',
                parseFloat(t.monthly_rate) || 0, t.move_in_date || new Date().toISOString().slice(0, 10),
                t.autopay_enabled === true || t.autopay_enabled === 'true',
                t.has_insurance === true || t.has_insurance === 'true',
                parseFloat(t.insurance_monthly) || 0, parseFloat(t.balance) || 0, t.status || 'active'])
            imported++
          } catch (err) {
            errors.push({ name: t.name, unit: t.unit_number, error: err.message })
            skipped++
          }
        }

        return res.json({ imported, skipped, errors })
      }

      // Single tenant create
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

    // PATCH: update tenant status, payment, move-out, escalation, batch
    if (req.method === 'PATCH') {
      const { id, ids, action, ...updates } = req.body

      // Batch operations
      if (Array.isArray(ids) && ids.length > 0) {
        if (action === 'batch_status') {
          const { status } = updates
          await query(`UPDATE tenants SET status = $2, updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids, status])
          return res.json({ updated: ids.length })
        }
        if (action === 'batch_move_out') {
          const today = new Date().toISOString().slice(0, 10)
          await query(`UPDATE tenants SET status = 'moved_out', moved_out_date = $2, move_out_reason = 'voluntary', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids, today])
          // Auto-enroll in remarketing
          for (const tid of ids) {
            const t = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [tid])
            if (t) {
              await query(`
                INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason, sequence_status, next_send_at)
                VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '3 days')
                ON CONFLICT (tenant_id) DO NOTHING
              `, [tid, t.facility_id, t.moved_out_date || today, t.move_out_reason || 'voluntary'])
            }
          }
          return res.json({ updated: ids.length })
        }
        if (action === 'batch_autopay_invite') {
          // Log communication for autopay invite
          for (const tid of ids) {
            await query(`
              INSERT INTO tenant_communications (tenant_id, facility_id, channel, type, subject, status)
              SELECT $1, facility_id, 'email', 'general', 'Autopay enrollment invitation', 'sent'
              FROM tenants WHERE id = $1
            `, [tid])
          }
          return res.json({ sent: ids.length })
        }
        return res.status(400).json({ error: 'Unknown batch action' })
      }

      if (!id) return res.status(400).json({ error: 'id or ids required' })

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

        if (tenant) {
          await query(`
            INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason, sequence_status, next_send_at)
            VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '3 days')
            ON CONFLICT (tenant_id) DO NOTHING
          `, [id, tenant.facility_id, tenant.moved_out_date, tenant.move_out_reason])
        }

        return res.json({ tenant })
      }

      if (action === 'escalate') {
        const current = await queryOne(`
          SELECT stage FROM delinquency_escalations WHERE tenant_id = $1 ORDER BY stage_entered_at DESC LIMIT 1
        `, [id])
        const currentIdx = current ? ESCALATION_STAGES.indexOf(current.stage) : -1
        const nextIdx = currentIdx + 1
        if (nextIdx >= ESCALATION_STAGES.length) return res.json({ error: 'Already at final stage' })

        const nextStage = ESCALATION_STAGES[nextIdx]
        const futureIdx = nextIdx + 1
        const nextStageAt = futureIdx < ESCALATION_STAGES.length
          ? new Date(Date.now() + 7 * 86400000).toISOString()
          : null

        const tenant = await queryOne(`SELECT facility_id FROM tenants WHERE id = $1`, [id])
        const esc = await queryOne(`
          INSERT INTO delinquency_escalations (tenant_id, facility_id, stage, next_stage_at, automated, notes)
          VALUES ($1, $2, $3, $4, false, $5)
          RETURNING *
        `, [id, tenant.facility_id, nextStage, nextStageAt, updates.notes || null])

        return res.json({ escalation: esc })
      }

      if (action === 'de_escalate') {
        // Remove latest escalation
        await query(`
          DELETE FROM delinquency_escalations WHERE id = (
            SELECT id FROM delinquency_escalations WHERE tenant_id = $1 ORDER BY stage_entered_at DESC LIMIT 1
          )
        `, [id])
        return res.json({ ok: true })
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
