import { query, queryOne } from './_db.js'
import { isAdmin } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, X-Org-Token')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const isAdminUser = isAdmin(req)

    const orgToken = req.headers['x-org-token']
    let orgUser = null
    if (orgToken) {
      try {
        const decoded = Buffer.from(orgToken, 'base64').toString()
        const [orgId, email] = decoded.split(':')
        orgUser = await queryOne(
          `SELECT * FROM org_users WHERE organization_id = $1 AND email = $2 AND status = 'active'`,
          [orgId, email]
        )
      } catch { /* invalid */ }
    }

    if (!isAdminUser && !orgUser) return res.status(401).json({ error: 'Unauthorized' })
    const orgId = req.query?.orgId || (orgUser && orgUser.organization_id)
    if (!orgId) return res.status(400).json({ error: 'Organization ID required' })

    /* ── GET: facilities with campaign summary ── */
    if (req.method === 'GET') {
      const facilities = await query(
        `SELECT f.*,
          (SELECT json_agg(json_build_object(
            'month', cc.month, 'spend', cc.spend, 'leads', cc.leads, 'cpl', cc.cpl,
            'moveIns', cc.move_ins, 'roas', cc.roas, 'occupancyDelta', cc.occupancy_delta
          ) ORDER BY cc.month)
          FROM clients c JOIN client_campaigns cc ON cc.client_id = c.id
          WHERE c.facility_id = f.id) as campaigns,
          (SELECT COUNT(*) FROM landing_pages lp WHERE lp.facility_id = f.id AND lp.status = 'published') as live_pages,
          (SELECT COUNT(*) FROM ad_variations av WHERE av.facility_id = f.id AND av.status = 'published') as live_ads
         FROM facilities f
         WHERE f.organization_id = $1
         ORDER BY f.name`,
        [orgId]
      )

      // Portfolio aggregates
      const totals = facilities.reduce((acc, f) => {
        const campaigns = f.campaigns || []
        campaigns.forEach(c => {
          acc.spend += Number(c.spend) || 0
          acc.leads += Number(c.leads) || 0
          acc.moveIns += Number(c.moveIns) || 0
        })
        return acc
      }, { spend: 0, leads: 0, moveIns: 0 })

      return res.json({ facilities, totals })
    }

    /* ── POST: assign facility to org ── */
    if (req.method === 'POST') {
      if (!isAdminUser && orgUser?.role !== 'org_admin') return res.status(403).json({ error: 'Forbidden' })

      const { facilityId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'Facility ID required' })

      // Check facility limit
      const org = await queryOne('SELECT facility_limit FROM organizations WHERE id = $1', [orgId])
      const currentCount = await queryOne('SELECT COUNT(*)::int as count FROM facilities WHERE organization_id = $1', [orgId])
      if (currentCount.count >= (org?.facility_limit || 10)) {
        return res.status(400).json({ error: 'Facility limit reached for your plan' })
      }

      const facility = await queryOne(
        'UPDATE facilities SET organization_id = $2 WHERE id = $1 RETURNING *',
        [facilityId, orgId]
      )
      if (!facility) return res.status(404).json({ error: 'Facility not found' })
      return res.json({ facility })
    }

    /* ── PATCH: remove facility from org ── */
    if (req.method === 'PATCH') {
      if (!isAdminUser && orgUser?.role !== 'org_admin') return res.status(403).json({ error: 'Forbidden' })

      const { facilityId, action } = req.body
      if (action === 'remove' && facilityId) {
        await query('UPDATE facilities SET organization_id = NULL WHERE id = $1 AND organization_id = $2', [facilityId, orgId])
        return res.json({ success: true })
      }
      return res.status(400).json({ error: 'Invalid action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Org facilities API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
