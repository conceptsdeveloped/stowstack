import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  // GET /api/client-campaigns?code=XXXX
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    if (!code) return res.status(400).json({ error: 'Missing access code' })

    try {
      const client = await queryOne(`SELECT id FROM clients WHERE access_code = $1`, [code])
      if (!client) return res.status(404).json({ error: 'Client not found' })

      const rows = await query(
        `SELECT month, spend, leads, cpl, move_ins AS "moveIns",
                cost_per_move_in AS "costPerMoveIn", roas, occupancy_delta AS "occupancyDelta"
         FROM client_campaigns WHERE client_id = $1 ORDER BY month ASC`,
        [client.id]
      )
      return res.status(200).json({ campaigns: rows })
    } catch (err) {
      console.error('Get campaigns error:', err)
      return res.status(500).json({ error: 'Failed to get campaigns' })
    }
  }

  // POST /api/client-campaigns — add/update a campaign month
  if (req.method === 'POST') {
    const { code, campaign } = req.body || {}
    if (!code || !campaign) return res.status(400).json({ error: 'Missing code or campaign data' })
    if (!campaign.month || campaign.spend == null || campaign.leads == null) {
      return res.status(400).json({ error: 'Campaign requires month, spend, and leads' })
    }

    try {
      const client = await queryOne(`SELECT id FROM clients WHERE access_code = $1`, [code])
      if (!client) return res.status(404).json({ error: 'Client not found' })

      const spend = Number(campaign.spend)
      const leads = Number(campaign.leads)
      const moveIns = Number(campaign.moveIns || 0)
      const cpl = campaign.cpl != null ? Number(campaign.cpl) : (leads > 0 ? spend / leads : 0)
      const costPerMoveIn = campaign.costPerMoveIn != null ? Number(campaign.costPerMoveIn) : (moveIns > 0 ? spend / moveIns : 0)

      await query(
        `INSERT INTO client_campaigns (client_id, month, spend, leads, cpl, move_ins, cost_per_move_in, roas, occupancy_delta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (client_id, month) DO UPDATE SET
           spend = EXCLUDED.spend, leads = EXCLUDED.leads, cpl = EXCLUDED.cpl,
           move_ins = EXCLUDED.move_ins, cost_per_move_in = EXCLUDED.cost_per_move_in,
           roas = EXCLUDED.roas, occupancy_delta = EXCLUDED.occupancy_delta`,
        [client.id, campaign.month, spend, leads, cpl, moveIns, costPerMoveIn,
         Number(campaign.roas || 0), Number(campaign.occupancyDelta || 0)]
      )

      const campaigns = await query(
        `SELECT month, spend, leads, cpl, move_ins AS "moveIns",
                cost_per_move_in AS "costPerMoveIn", roas, occupancy_delta AS "occupancyDelta"
         FROM client_campaigns WHERE client_id = $1 ORDER BY month ASC`,
        [client.id]
      )
      return res.status(200).json({ success: true, campaigns })
    } catch (err) {
      console.error('Add campaign error:', err)
      return res.status(500).json({ error: 'Failed to add campaign' })
    }
  }

  // DELETE /api/client-campaigns — remove a campaign month
  if (req.method === 'DELETE') {
    const { code, month } = req.body || {}
    if (!code || !month) return res.status(400).json({ error: 'Missing code or month' })

    try {
      const client = await queryOne(`SELECT id FROM clients WHERE access_code = $1`, [code])
      if (!client) return res.status(404).json({ error: 'Client not found' })

      await query(
        `DELETE FROM client_campaigns WHERE client_id = $1 AND month = $2`,
        [client.id, month]
      )

      const campaigns = await query(
        `SELECT month, spend, leads, cpl, move_ins AS "moveIns",
                cost_per_move_in AS "costPerMoveIn", roas, occupancy_delta AS "occupancyDelta"
         FROM client_campaigns WHERE client_id = $1 ORDER BY month ASC`,
        [client.id]
      )
      return res.status(200).json({ success: true, campaigns })
    } catch (err) {
      console.error('Delete campaign error:', err)
      return res.status(500).json({ error: 'Failed to delete campaign' })
    }
  }

  // PATCH /api/client-campaigns — update client settings (monthlyGoal)
  if (req.method === 'PATCH') {
    const { code, monthlyGoal } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Missing code' })

    try {
      if (monthlyGoal !== undefined) {
        const goal = Math.max(0, Math.min(999, Number(monthlyGoal) || 0))
        await query(
          `UPDATE clients SET monthly_goal = $1 WHERE access_code = $2`,
          [goal, code]
        )
        return res.status(200).json({ success: true, monthlyGoal: goal })
      }
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Update client settings error:', err)
      return res.status(500).json({ error: 'Failed to update settings' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
