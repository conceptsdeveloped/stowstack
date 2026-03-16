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

  // ── GET: list unit types ──
  if (req.method === 'GET') {
    if (!requireScope(res, apiKey, 'units:read')) return

    try {
      const units = await query(
        `SELECT id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features,
                total_count, occupied_count, vacant_count, street_rate, web_rate, last_updated
         FROM facility_pms_units WHERE facility_id = $1 ORDER BY unit_type`,
        [facilityId]
      )
      return res.status(200).json({ units })
    } catch (err) {
      console.error('v1/facility-units GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch units' })
    }
  }

  // ── POST: upsert unit(s) ──
  if (req.method === 'POST') {
    if (!requireScope(res, apiKey, 'units:write')) return

    const body = req.body || {}
    const unitList = Array.isArray(body.units) ? body.units : [body]

    if (!unitList.length || !unitList[0].unitType) {
      return res.status(400).json({ error: 'unitType is required. Send a single unit or { units: [...] }' })
    }

    try {
      const saved = []
      for (const u of unitList) {
        const row = await queryOne(`
          INSERT INTO facility_pms_units
            (facility_id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features,
             total_count, occupied_count, street_rate, web_rate)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (facility_id, unit_type) DO UPDATE SET
            size_label = EXCLUDED.size_label, width_ft = EXCLUDED.width_ft, depth_ft = EXCLUDED.depth_ft,
            sqft = EXCLUDED.sqft, floor = EXCLUDED.floor, features = EXCLUDED.features,
            total_count = EXCLUDED.total_count, occupied_count = EXCLUDED.occupied_count,
            street_rate = EXCLUDED.street_rate, web_rate = EXCLUDED.web_rate,
            last_updated = NOW()
          RETURNING id, unit_type, size_label, width_ft, depth_ft, sqft, floor, features,
                    total_count, occupied_count, vacant_count, street_rate, web_rate, last_updated
        `, [
          facilityId, u.unitType, u.sizeLabel || null, u.widthFt || null, u.depthFt || null,
          u.sqft || null, u.floor || null, u.features || [],
          u.totalCount || 0, u.occupiedCount || 0, u.streetRate || null, u.webRate || null,
        ])
        saved.push(row)
      }

      dispatchWebhook(orgId, 'unit.updated', { facilityId, units: saved }).catch(() => {})

      return res.status(200).json({ units: saved })
    } catch (err) {
      console.error('v1/facility-units POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to save units' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
