import { query, queryOne } from '../_db.js'
import { setV1Cors, requireApiAuth, requireScope } from '../_api-auth.js'

export default async function handler(req, res) {
  setV1Cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const auth = await requireApiAuth(req, res)
  if (!auth) return
  const { apiKey } = auth
  const orgId = apiKey.organization_id

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30))

  try {
    const [summary, daily, byEndpoint, byKey, recentErrors] = await Promise.all([
      // Overall summary
      queryOne(`
        SELECT
          COUNT(*)::int AS total_requests,
          COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS success_count,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count,
          COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms,
          COUNT(DISTINCT api_key_id)::int AS active_keys
        FROM api_usage_log
        WHERE organization_id = $1 AND created_at > NOW() - ($2 || ' days')::INTERVAL
      `, [orgId, String(days)]),

      // Daily breakdown
      query(`
        SELECT
          created_at::date AS date,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors
        FROM api_usage_log
        WHERE organization_id = $1 AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY created_at::date ORDER BY date DESC
      `, [orgId, String(days)]),

      // By endpoint
      query(`
        SELECT path, method,
          COUNT(*)::int AS requests,
          COALESCE(AVG(duration_ms), 0)::int AS avg_ms,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors
        FROM api_usage_log
        WHERE organization_id = $1 AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY path, method ORDER BY requests DESC LIMIT 20
      `, [orgId, String(days)]),

      // By API key
      query(`
        SELECT u.api_key_id, k.name AS key_name, k.key_prefix,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE u.status_code >= 400)::int AS errors
        FROM api_usage_log u
        JOIN api_keys k ON k.id = u.api_key_id
        WHERE u.organization_id = $1 AND u.created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY u.api_key_id, k.name, k.key_prefix ORDER BY requests DESC
      `, [orgId, String(days)]),

      // Recent errors
      query(`
        SELECT method, path, status_code, created_at
        FROM api_usage_log
        WHERE organization_id = $1 AND status_code >= 400
          AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC LIMIT 50
      `, [orgId]),
    ])

    return res.status(200).json({
      period: `${days} days`,
      summary,
      daily,
      byEndpoint,
      byKey,
      recentErrors,
    })
  } catch (err) {
    console.error('v1/usage GET failed:', err.message)
    return res.status(500).json({ error: 'Failed to fetch usage data' })
  }
}
