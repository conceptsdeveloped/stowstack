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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { facilityId } = req.query

  // ── GET: fetch all PMS data for a facility ──
  if (req.method === 'GET') {
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const [snapshot, units, specials, rateHistory] = await Promise.all([
        queryOne(
          `SELECT * FROM facility_pms_snapshots WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
          [facilityId]
        ),
        query(
          `SELECT * FROM facility_pms_units WHERE facility_id = $1 ORDER BY unit_type`,
          [facilityId]
        ),
        query(
          `SELECT * FROM facility_pms_specials WHERE facility_id = $1 ORDER BY active DESC, created_at DESC`,
          [facilityId]
        ),
        query(
          `SELECT * FROM facility_pms_rate_history WHERE facility_id = $1 ORDER BY effective_date DESC LIMIT 50`,
          [facilityId]
        ),
      ])

      return res.status(200).json({ snapshot, units, specials, rateHistory })
    } catch (err) {
      console.error('facility-pms GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch PMS data' })
    }
  }

  // ── POST: upsert snapshot or add/update units/specials ──
  if (req.method === 'POST') {
    const { action } = req.body || {}

    // -- Save facility snapshot --
    if (action === 'save_snapshot') {
      const { facility_id, snapshot_date, total_units, occupied_units, occupancy_pct, total_sqft, occupied_sqft, gross_potential, actual_revenue, delinquency_pct, move_ins_mtd, move_outs_mtd, notes } = req.body
      if (!facility_id) return res.status(400).json({ error: 'facility_id required' })

      try {
        const row = await queryOne(`
          INSERT INTO facility_pms_snapshots (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct, total_sqft, occupied_sqft, gross_potential, actual_revenue, delinquency_pct, move_ins_mtd, move_outs_mtd, notes)
          VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (facility_id, snapshot_date) DO UPDATE SET
            total_units = EXCLUDED.total_units,
            occupied_units = EXCLUDED.occupied_units,
            occupancy_pct = EXCLUDED.occupancy_pct,
            total_sqft = EXCLUDED.total_sqft,
            occupied_sqft = EXCLUDED.occupied_sqft,
            gross_potential = EXCLUDED.gross_potential,
            actual_revenue = EXCLUDED.actual_revenue,
            delinquency_pct = EXCLUDED.delinquency_pct,
            move_ins_mtd = EXCLUDED.move_ins_mtd,
            move_outs_mtd = EXCLUDED.move_outs_mtd,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING *
        `, [facility_id, snapshot_date || null, total_units || null, occupied_units || null, occupancy_pct || null, total_sqft || null, occupied_sqft || null, gross_potential || null, actual_revenue || null, delinquency_pct || null, move_ins_mtd || 0, move_outs_mtd || 0, notes || null])

        // Also mark facility as PMS uploaded
        await query(`UPDATE facilities SET pms_uploaded = TRUE, updated_at = NOW() WHERE id = $1`, [facility_id])

        return res.status(200).json({ snapshot: row })
      } catch (err) {
        console.error('save_snapshot failed:', err.message)
        return res.status(500).json({ error: 'Failed to save snapshot' })
      }
    }

    // -- Save unit type --
    if (action === 'save_unit') {
      const { facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible } = req.body
      if (!facility_id || !unit_type) return res.status(400).json({ error: 'facility_id and unit_type required' })

      try {
        const row = await queryOne(`
          INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (facility_id, unit_type) DO UPDATE SET
            size_label = EXCLUDED.size_label,
            width_ft = EXCLUDED.width_ft,
            depth_ft = EXCLUDED.depth_ft,
            sqft = EXCLUDED.sqft,
            floor = EXCLUDED.floor,
            features = EXCLUDED.features,
            total_count = EXCLUDED.total_count,
            occupied_count = EXCLUDED.occupied_count,
            street_rate = EXCLUDED.street_rate,
            actual_avg_rate = EXCLUDED.actual_avg_rate,
            web_rate = EXCLUDED.web_rate,
            push_rate = EXCLUDED.push_rate,
            ecri_eligible = EXCLUDED.ecri_eligible,
            last_updated = NOW()
          RETURNING *
        `, [facility_id, unit_type, size_label || null, width_ft || null, depth_ft || null, sqft || null, floor || null, features || [], total_count || 0, occupied_count || 0, street_rate || null, actual_avg_rate || null, web_rate || null, push_rate || null, ecri_eligible || 0])

        return res.status(200).json({ unit: row })
      } catch (err) {
        console.error('save_unit failed:', err.message)
        return res.status(500).json({ error: 'Failed to save unit' })
      }
    }

    // -- Save special/promotion --
    if (action === 'save_special') {
      const { id, facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active } = req.body
      if (!facility_id || !name) return res.status(400).json({ error: 'facility_id and name required' })

      try {
        let row
        if (id) {
          row = await queryOne(`
            UPDATE facility_pms_specials SET
              name = $2, description = $3, applies_to = $4, discount_type = $5,
              discount_value = $6, min_lease_months = $7, start_date = $8, end_date = $9, active = $10
            WHERE id = $1 RETURNING *
          `, [id, name, description || null, applies_to || [], discount_type || 'fixed', discount_value || null, min_lease_months || 1, start_date || null, end_date || null, active !== false])
        } else {
          row = await queryOne(`
            INSERT INTO facility_pms_specials (facility_id, name, description, applies_to, discount_type, discount_value, min_lease_months, start_date, end_date, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
          `, [facility_id, name, description || null, applies_to || [], discount_type || 'fixed', discount_value || null, min_lease_months || 1, start_date || null, end_date || null, active !== false])
        }
        return res.status(200).json({ special: row })
      } catch (err) {
        console.error('save_special failed:', err.message)
        return res.status(500).json({ error: 'Failed to save special' })
      }
    }

    // -- Bulk save units (paste from spreadsheet) --
    if (action === 'bulk_save_units') {
      const { facility_id, units } = req.body
      if (!facility_id || !Array.isArray(units)) return res.status(400).json({ error: 'facility_id and units[] required' })

      try {
        const saved = []
        for (const u of units) {
          const row = await queryOne(`
            INSERT INTO facility_pms_units (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features, total_count, occupied_count, street_rate, actual_avg_rate, web_rate, push_rate, ecri_eligible)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (facility_id, unit_type) DO UPDATE SET
              size_label = EXCLUDED.size_label, width_ft = EXCLUDED.width_ft, depth_ft = EXCLUDED.depth_ft,
              sqft = EXCLUDED.sqft, floor = EXCLUDED.floor, features = EXCLUDED.features,
              total_count = EXCLUDED.total_count, occupied_count = EXCLUDED.occupied_count,
              street_rate = EXCLUDED.street_rate, actual_avg_rate = EXCLUDED.actual_avg_rate,
              web_rate = EXCLUDED.web_rate, push_rate = EXCLUDED.push_rate,
              ecri_eligible = EXCLUDED.ecri_eligible, last_updated = NOW()
            RETURNING *
          `, [facility_id, u.unit_type, u.size_label || null, u.width_ft || null, u.depth_ft || null, u.sqft || null, u.floor || null, u.features || [], u.total_count || 0, u.occupied_count || 0, u.street_rate || null, u.actual_avg_rate || null, u.web_rate || null, u.push_rate || null, u.ecri_eligible || 0])
          saved.push(row)
        }

        await query(`UPDATE facilities SET pms_uploaded = TRUE, updated_at = NOW() WHERE id = $1`, [facility_id])
        return res.status(200).json({ units: saved })
      } catch (err) {
        console.error('bulk_save_units failed:', err.message)
        return res.status(500).json({ error: 'Failed to bulk save units' })
      }
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  // ── DELETE: remove a unit type or special ──
  if (req.method === 'DELETE') {
    const { type, id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id required' })

    try {
      if (type === 'unit') {
        await query('DELETE FROM facility_pms_units WHERE id = $1', [id])
      } else if (type === 'special') {
        await query('DELETE FROM facility_pms_specials WHERE id = $1', [id])
      } else {
        return res.status(400).json({ error: 'type must be "unit" or "special"' })
      }
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('facility-pms DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to delete' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
