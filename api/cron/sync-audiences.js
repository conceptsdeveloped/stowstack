import { query } from '../_db.js'

/*
  Vercel Cron: Sync Audiences
  Schedule: Weekly Sunday at 2am (0 2 * * 0)

  Refreshes all active custom audiences with latest tenant data.
*/

export default async function handler(req, res) {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = { checked: 0, refreshed: 0, errors: [] }

  try {
    // Get all active custom audiences that haven't been synced in 7+ days
    const syncs = await query(
      `SELECT as2.*, pc.access_token, pc.account_id
       FROM audience_syncs as2
       JOIN platform_connections pc ON as2.connection_id = pc.id
       WHERE as2.status = 'ready'
       AND as2.audience_type = 'custom'
       AND (as2.last_synced_at IS NULL OR as2.last_synced_at < NOW() - INTERVAL '7 days')
       AND pc.status = 'connected'`
    )

    for (const sync of syncs) {
      results.checked++
      try {
        // Trigger refresh via the main audience-sync endpoint
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
        const adminKey = process.env.ADMIN_SECRET

        const refreshRes = await fetch(`${baseUrl}/api/audience-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey,
          },
          body: JSON.stringify({
            facilityId: sync.facility_id,
            action: 'refresh',
            audienceSyncId: sync.id,
          }),
        })

        if (refreshRes.ok) {
          results.refreshed++
        } else {
          const errData = await refreshRes.json().catch(() => ({}))
          results.errors.push(`${sync.audience_name}: ${errData.error || 'refresh failed'}`)
        }
      } catch (err) {
        results.errors.push(`${sync.audience_name}: ${err.message}`)
      }
    }

    return res.json({ success: true, ...results })
  } catch (err) {
    console.error('sync-audiences cron error:', err)
    return res.status(500).json({ error: err.message, ...results })
  }
}
