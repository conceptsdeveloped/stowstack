import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope, requireOrgFacility } from '../_api-auth.js'

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

  // ── GET: list snapshots ──
  if (req.method === 'GET') {
    if (!requireScope(res, apiKey, 'facilities:read')) return

    const limit = Math.min(90, Math.max(1, parseInt(req.query.limit) || 30))

    try {
      const snapshots = await query(
        `SELECT id, snapshot_date, total_units, occupied_units, occupancy_pct,
                total_sqft, occupied_sqft, delinquency_pct,
                move_ins_mtd, move_outs_mtd, notes, created_at
         FROM facility_pms_snapshots
         WHERE facility_id = $1
         ORDER BY snapshot_date DESC
         LIMIT $2`,
        [facilityId, limit]
      )
      return res.status(200).json({ snapshots })
    } catch (err) {
      console.error('v1/facility-snapshots GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch snapshots' })
    }
  }

  // ── POST: upsert a daily snapshot ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'facilities:write')) return

    const { snapshotDate, totalUnits, occupiedUnits, occupancyPct, totalSqft, occupiedSqft,
            delinquencyPct, moveInsMtd, moveOutsMtd, notes } = req.body || {}

    try {
      const snapshot = await queryOne(`
        INSERT INTO facility_pms_snapshots
          (facility_id, snapshot_date, total_units, occupied_units, occupancy_pct,
           total_sqft, occupied_sqft, delinquency_pct, move_ins_mtd, move_outs_mtd, notes)
        VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (facility_id, snapshot_date) DO UPDATE SET
          total_units = EXCLUDED.total_units,
          occupied_units = EXCLUDED.occupied_units,
          occupancy_pct = EXCLUDED.occupancy_pct,
          total_sqft = EXCLUDED.total_sqft,
          occupied_sqft = EXCLUDED.occupied_sqft,
          delinquency_pct = EXCLUDED.delinquency_pct,
          move_ins_mtd = EXCLUDED.move_ins_mtd,
          move_outs_mtd = EXCLUDED.move_outs_mtd,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id, snapshot_date, total_units, occupied_units, occupancy_pct,
                  total_sqft, occupied_sqft, delinquency_pct,
                  move_ins_mtd, move_outs_mtd, notes, created_at
      `, [
        facilityId, snapshotDate || null, totalUnits || null, occupiedUnits || null,
        occupancyPct || null, totalSqft || null, occupiedSqft || null,
        delinquencyPct || null, moveInsMtd || 0, moveOutsMtd || 0, notes || null,
      ])

      // Mark facility as PMS-uploaded
      query('UPDATE facilities SET pms_uploaded = TRUE, updated_at = NOW() WHERE id = $1', [facilityId]).catch(() => {})

      return res.status(200).json({ snapshot })
    } catch (err) {
      console.error('v1/facility-snapshots POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to save snapshot' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
