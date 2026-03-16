import { query } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope, requireOrgFacility } from '../_api-auth.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireScope(res, apiKey, 'units:read')) return

  const { facilityId } = req.query
  const facility = await requireOrgFacility(res, facilityId, orgId)
  if (!facility) return

  try {
    const [units, specials] = await Promise.all([
      query(
        `SELECT unit_type, size_label, sqft, features, vacant_count AS available_count,
                street_rate, web_rate
         FROM facility_pms_units
         WHERE facility_id = $1 AND vacant_count > 0
         ORDER BY unit_type`,
        [facilityId]
      ),
      query(
        `SELECT id, name, description, applies_to, discount_type, discount_value,
                min_lease_months, start_date, end_date
         FROM facility_pms_specials
         WHERE facility_id = $1 AND active = TRUE
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         ORDER BY name`,
        [facilityId]
      ),
    ])

    // Attach matching specials to each unit
    const availability = units.map(unit => ({
      ...unit,
      specials: specials.filter(s =>
        !s.applies_to?.length || s.applies_to.includes(unit.unit_type)
      ).map(({ id, name, description, discount_type, discount_value, min_lease_months }) => ({
        id, name, description, discountType: discount_type, discountValue: discount_value, minLeaseMonths: min_lease_months,
      })),
    }))

    return res.status(200).json({ availability })
  } catch (err) {
    console.error('v1/facility-availability GET failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch availability' })
  }
}
