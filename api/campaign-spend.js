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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

/**
 * GET  /api/campaign-spend?facilityId=xxx&startDate=2026-01-01&endDate=2026-03-15
 * POST /api/campaign-spend  { facilityId, startDate, endDate }  — Sync spend from Meta Marketing API
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // Auth check
  if (!requireAdmin(req, res)) return

  // GET — query stored spend data
  if (req.method === 'GET') {
    try {
      const { facilityId, startDate, endDate } = req.query || {}

      if (!facilityId) {
        return res.status(400).json({ error: 'facilityId is required' })
      }

      let sql = `
        SELECT id, platform, date, campaign_name, campaign_id, utm_campaign,
               spend, impressions, clicks, created_at
        FROM campaign_spend
        WHERE facility_id = $1
      `
      const params = [facilityId]
      let paramIdx = 2

      if (startDate) {
        sql += ` AND date >= $${paramIdx++}`
        params.push(startDate)
      }
      if (endDate) {
        sql += ` AND date <= $${paramIdx++}`
        params.push(endDate)
      }

      sql += ` ORDER BY date DESC, campaign_name`

      const rows = await query(sql, params)

      // Aggregate totals
      const totals = rows.reduce((acc, r) => {
        acc.spend += parseFloat(r.spend) || 0
        acc.impressions += parseInt(r.impressions) || 0
        acc.clicks += parseInt(r.clicks) || 0
        return acc
      }, { spend: 0, impressions: 0, clicks: 0 })

      return res.status(200).json({ spend: rows, totals })
    } catch (err) {
      console.error('Campaign spend GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch campaign spend' })
    }
  }

  // POST — sync spend from Meta Marketing API
  if (req.method === 'POST') {
    try {
      const { facilityId, startDate, endDate } = req.body || {}

      if (!facilityId) {
        return res.status(400).json({ error: 'facilityId is required' })
      }

      // Look up Meta connection for this facility
      const connection = await queryOne(
        `SELECT id, access_token, account_id, token_expires_at
         FROM platform_connections
         WHERE facility_id = $1 AND platform = 'meta' AND status = 'connected'`,
        [facilityId]
      )

      if (!connection) {
        return res.status(400).json({ error: 'No connected Meta account for this facility. Connect Meta in Settings first.' })
      }

      // Check token expiry
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        return res.status(400).json({ error: 'Meta access token has expired. Please reconnect in Settings.' })
      }

      // Build date range (default: last 30 days)
      const end = endDate || new Date().toISOString().split('T')[0]
      const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

      // Fetch from Meta Marketing API — campaign-level daily insights
      const url = new URL(`https://graph.facebook.com/v21.0/act_${connection.account_id}/insights`)
      url.searchParams.set('fields', 'campaign_name,campaign_id,spend,impressions,clicks')
      url.searchParams.set('time_increment', '1')
      url.searchParams.set('time_range', JSON.stringify({ since: start, until: end }))
      url.searchParams.set('level', 'campaign')
      url.searchParams.set('limit', '500')
      url.searchParams.set('access_token', connection.access_token)

      const metaRes = await fetch(url.toString())

      if (!metaRes.ok) {
        const errData = await metaRes.json().catch(() => ({}))
        console.error('Meta API error:', errData)
        return res.status(502).json({
          error: 'Meta API request failed',
          detail: errData.error?.message || `HTTP ${metaRes.status}`,
        })
      }

      const metaData = await metaRes.json()
      const rows = metaData.data || []

      if (rows.length === 0) {
        return res.status(200).json({ success: true, synced: 0, message: 'No campaign data found for this date range.' })
      }

      // Upsert each row into campaign_spend
      let synced = 0
      for (const row of rows) {
        // Convention: utm_campaign matches campaign_name (lowercase, trimmed)
        const utmCampaign = (row.campaign_name || '').trim().toLowerCase().replace(/\s+/g, '-')

        await query(
          `INSERT INTO campaign_spend (facility_id, platform, date, campaign_name, campaign_id, utm_campaign, spend, impressions, clicks)
           VALUES ($1, 'meta', $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (facility_id, platform, campaign_id, date) DO UPDATE SET
             campaign_name = EXCLUDED.campaign_name,
             utm_campaign = EXCLUDED.utm_campaign,
             spend = EXCLUDED.spend,
             impressions = EXCLUDED.impressions,
             clicks = EXCLUDED.clicks`,
          [
            facilityId,
            row.date_start,
            row.campaign_name || null,
            row.campaign_id || `unknown-${row.date_start}`,
            utmCampaign || null,
            parseFloat(row.spend) || 0,
            parseInt(row.impressions) || 0,
            parseInt(row.clicks) || 0,
          ]
        )
        synced++
      }

      return res.status(200).json({ success: true, synced, dateRange: { start, end } })
    } catch (err) {
      console.error('Campaign spend sync error:', err)
      return res.status(500).json({ error: 'Failed to sync campaign spend' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
