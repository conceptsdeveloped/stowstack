import { query } from './_db.js'
import { isAdmin } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, X-Org-Token')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const isAdminUser = isAdmin(req)

    const orgToken = req.headers['x-org-token']
    let orgUserId = null
    let orgId = req.query?.orgId
    if (orgToken) {
      try {
        const decoded = Buffer.from(orgToken, 'base64').toString()
        const parts = decoded.split(':')
        orgId = parts[0]
        orgUserId = parts[1]
      } catch { /* invalid */ }
    }

    if (!isAdminUser && !orgUserId) return res.status(401).json({ error: 'Unauthorized' })
    if (!orgId) return res.status(400).json({ error: 'Organization ID required' })

    if (req.method === 'GET') {
      const activities = await query(
        `SELECT al.id, al.type, al.facility_name, al.detail, al.created_at
         FROM activity_log al
         JOIN facilities f ON f.id = al.facility_id
         WHERE f.organization_id = $1
         ORDER BY al.created_at DESC
         LIMIT 50`,
        [orgId]
      )
      return res.json({ activities })
    }

    if (req.method === 'POST') {
      const { type, facilityId, facilityName, detail } = req.body
      if (!type || !detail) return res.status(400).json({ error: 'Type and detail required' })

      const activity = await query(
        `INSERT INTO activity_log (type, facility_id, facility_name, detail)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [type, facilityId || null, facilityName || null, detail]
      )
      return res.json({ activity: activity[0] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Org activity API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
