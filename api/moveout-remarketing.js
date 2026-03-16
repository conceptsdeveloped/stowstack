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

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    if (req.method === 'GET') {
      const { facilityId, status } = req.query

      let sql = `
        SELECT mr.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
               t.unit_number, t.unit_size, t.monthly_rate, t.move_out_reason as tenant_move_out_reason,
               f.name as facility_name, f.location as facility_location
        FROM moveout_remarketing mr
        JOIN tenants t ON t.id = mr.tenant_id
        JOIN facilities f ON f.id = mr.facility_id
        WHERE 1=1
      `
      const params = []
      if (facilityId) { params.push(facilityId); sql += ` AND mr.facility_id = $${params.length}` }
      if (status) { params.push(status); sql += ` AND mr.sequence_status = $${params.length}` }
      sql += ` ORDER BY mr.moved_out_date DESC`

      const sequences = await query(sql, params)

      const stats = await queryOne(`
        SELECT
          COUNT(*) as total_sequences,
          COUNT(*) FILTER (WHERE sequence_status = 'active') as active_sequences,
          COUNT(*) FILTER (WHERE sequence_status = 'completed') as completed_sequences,
          COUNT(*) FILTER (WHERE converted = true) as converted_count,
          SUM(opened_count) as total_opens,
          SUM(clicked_count) as total_clicks,
          ROUND(COUNT(*) FILTER (WHERE converted = true)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE sequence_status IN ('completed', 'converted')), 0) * 100, 1) as conversion_rate,
          COUNT(DISTINCT move_out_reason) as reason_count,
          AVG(current_step)::NUMERIC(3,1) as avg_steps_completed
        FROM moveout_remarketing
        ${facilityId ? 'WHERE facility_id = $1' : ''}
      `, facilityId ? [facilityId] : [])

      // Reason breakdown
      const reasonBreakdown = await query(`
        SELECT move_out_reason as reason,
               COUNT(*) as count,
               COUNT(*) FILTER (WHERE converted = true) as converted,
               ROUND(COUNT(*) FILTER (WHERE converted = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as conv_rate
        FROM moveout_remarketing
        ${facilityId ? 'WHERE facility_id = $1' : ''}
        GROUP BY move_out_reason
        ORDER BY count DESC
      `, facilityId ? [facilityId] : [])

      return res.json({ sequences, stats, reasonBreakdown })
    }

    if (req.method === 'POST') {
      const { tenantId, facilityId, offer_type, offer_value, move_out_reason_filter, days_since_moveout } = req.body

      // Batch enroll with filters
      if (facilityId && !tenantId) {
        const maxDays = days_since_moveout || 90
        let enrollSql = `
          SELECT t.* FROM tenants t
          LEFT JOIN moveout_remarketing mr ON mr.tenant_id = t.id
          WHERE t.status = 'moved_out' AND mr.id IS NULL
          AND t.moved_out_date >= NOW() - ($2 || ' days')::INTERVAL
        `
        const params = [facilityId, maxDays.toString()]

        if (facilityId !== 'all') {
          enrollSql = `
            SELECT t.* FROM tenants t
            LEFT JOIN moveout_remarketing mr ON mr.tenant_id = t.id
            WHERE t.facility_id = $1 AND t.status = 'moved_out' AND mr.id IS NULL
            AND t.moved_out_date >= NOW() - ($2 || ' days')::INTERVAL
          `
        } else {
          enrollSql = `
            SELECT t.* FROM tenants t
            LEFT JOIN moveout_remarketing mr ON mr.tenant_id = t.id
            WHERE t.status = 'moved_out' AND mr.id IS NULL
            AND t.moved_out_date >= NOW() - ($1 || ' days')::INTERVAL
          `
          params.splice(0, params.length, maxDays.toString())
        }

        if (move_out_reason_filter && move_out_reason_filter !== 'all') {
          params.push(move_out_reason_filter)
          enrollSql += ` AND t.move_out_reason = $${params.length}`
        }

        const unenrolled = await query(enrollSql, params)

        let enrolled = 0
        for (const t of unenrolled) {
          await query(`
            INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason,
              sequence_status, next_send_at, offer_type, offer_value)
            VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '3 days', $5, $6)
            ON CONFLICT (tenant_id) DO NOTHING
          `, [t.id, t.facility_id, t.moved_out_date, t.move_out_reason,
              offer_type || 'discount', offer_value || 0])
          enrolled++
        }

        return res.json({ enrolled, message: `Enrolled ${enrolled} former tenants` })
      }

      // Single enroll
      if (!tenantId) return res.status(400).json({ error: 'tenantId or facilityId required' })

      const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [tenantId])
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

      const seq = await queryOne(`
        INSERT INTO moveout_remarketing (tenant_id, facility_id, moved_out_date, move_out_reason,
          sequence_status, next_send_at, offer_type, offer_value)
        VALUES ($1, $2, $3, $4, 'active', NOW() + INTERVAL '3 days', $5, $6)
        ON CONFLICT (tenant_id) DO UPDATE SET
          sequence_status = 'active', next_send_at = NOW() + INTERVAL '3 days',
          current_step = 0, updated_at = NOW()
        RETURNING *
      `, [tenantId, tenant.facility_id, tenant.moved_out_date || new Date().toISOString().slice(0, 10),
          tenant.move_out_reason, offer_type || 'discount', offer_value || 0])

      return res.json({ sequence: seq })
    }

    if (req.method === 'PATCH') {
      const { id, ids, action, ...updates } = req.body

      // Batch operations
      if (Array.isArray(ids) && ids.length > 0) {
        if (action === 'batch_pause') {
          await query(`UPDATE moveout_remarketing SET sequence_status = 'paused', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids])
          return res.json({ updated: ids.length })
        }
        if (action === 'batch_resume') {
          await query(`UPDATE moveout_remarketing SET sequence_status = 'active', next_send_at = NOW() + INTERVAL '1 day', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids])
          return res.json({ updated: ids.length })
        }
        if (action === 'batch_advance') {
          await query(`
            UPDATE moveout_remarketing SET
              current_step = current_step + 1,
              last_sent_at = NOW(),
              next_send_at = NOW() + INTERVAL '7 days',
              sequence_status = CASE WHEN current_step + 1 >= total_steps THEN 'completed' ELSE sequence_status END,
              updated_at = NOW()
            WHERE id = ANY($1::uuid[]) AND sequence_status = 'active'
          `, [ids])
          return res.json({ updated: ids.length })
        }
        return res.status(400).json({ error: 'Unknown batch action' })
      }

      if (!id) return res.status(400).json({ error: 'id or ids required' })

      if (action === 'advance') {
        const seq = await queryOne(`
          UPDATE moveout_remarketing SET
            current_step = current_step + 1, last_sent_at = NOW(),
            next_send_at = NOW() + INTERVAL '7 days',
            sequence_status = CASE WHEN current_step + 1 >= total_steps THEN 'completed' ELSE sequence_status END,
            updated_at = NOW()
          WHERE id = $1 RETURNING *
        `, [id])

        // Log communication
        if (seq) {
          await query(`
            INSERT INTO tenant_communications (tenant_id, facility_id, channel, type, subject, related_id, status)
            VALUES ($1, $2, 'email', 'remarketing', $3, $4, 'sent')
          `, [seq.tenant_id, seq.facility_id, `Welcome back step ${seq.current_step}`, id])
        }

        return res.json({ sequence: seq })
      }

      if (action === 'convert') {
        const seq = await queryOne(`
          UPDATE moveout_remarketing SET converted = true, converted_at = NOW(), sequence_status = 'converted', updated_at = NOW()
          WHERE id = $1 RETURNING *
        `, [id])
        return res.json({ sequence: seq })
      }

      if (action === 'track_open') {
        await query(`UPDATE moveout_remarketing SET opened_count = opened_count + 1 WHERE id = $1`, [id])
        return res.json({ ok: true })
      }

      if (action === 'track_click') {
        await query(`UPDATE moveout_remarketing SET clicked_count = clicked_count + 1 WHERE id = $1`, [id])
        return res.json({ ok: true })
      }

      // Generic status/offer update
      const { sequence_status, offer_type, offer_value } = updates
      const sets = ['updated_at = NOW()']
      const params = [id]

      if (sequence_status) { params.push(sequence_status); sets.push(`sequence_status = $${params.length}`) }
      if (offer_type) { params.push(offer_type); sets.push(`offer_type = $${params.length}`) }
      if (offer_value !== undefined) { params.push(offer_value); sets.push(`offer_value = $${params.length}`) }

      const seq = await queryOne(`UPDATE moveout_remarketing SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
      return res.json({ sequence: seq })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Moveout remarketing API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
