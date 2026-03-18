import { query } from './_db.js'
import { getRedis } from './_redis.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const checks = { db: 'unknown', redis: 'unconfigured' }
  let overall = 'ok'

  // Check PostgreSQL
  try {
    await query('SELECT 1')
    checks.db = 'ok'
  } catch (err) {
    checks.db = 'error'
    overall = 'down'
    console.error('Health check DB error:', err.message)
  }

  // Check Redis
  const redis = getRedis()
  if (redis) {
    try {
      await redis.ping()
      checks.redis = 'ok'
    } catch (err) {
      checks.redis = 'error'
      if (overall !== 'down') overall = 'degraded'
      console.error('Health check Redis error:', err.message)
    }
  }

  const status = overall === 'down' ? 503 : 200

  return res.status(status).json({
    status: overall,
    ...checks,
    timestamp: new Date().toISOString(),
  })
}
