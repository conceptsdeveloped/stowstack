import { getRedis } from './_redis.js'

let warnedOnce = false

/**
 * Rate limit a request using Upstash Redis (simple counter + TTL window).
 *
 * @param {import('http').IncomingMessage} req
 * @param {{ key: string, limit?: number, windowSeconds?: number }} opts
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
export async function rateLimit(req, { key, limit = 3, windowSeconds = 3600 }) {
  const redis = getRedis()

  if (!redis) {
    if (!warnedOnce) {
      console.warn('[rateLimit] Redis unavailable — allowing request (fail-open)')
      warnedOnce = true
    }
    return { allowed: true, remaining: limit - 1, resetAt: 0 }
  }

  const forwarded = req.headers['x-forwarded-for']
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
    || req.socket?.remoteAddress
    || 'unknown'

  const redisKey = `rl:${key}:${ip}`

  const count = await redis.incr(redisKey)

  // Set expiry only on the first increment (when the window starts)
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds)
  }

  const ttl = await redis.ttl(redisKey)
  const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000)
  const remaining = Math.max(0, limit - count)

  return { allowed: count <= limit, remaining, resetAt }
}

/**
 * Send a 429 Too Many Requests response with standard headers.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} resetAt — epoch ms when the window resets
 */
export function rateLimitResponse(res, resetAt) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))

  res.setHeader('Retry-After', String(retryAfter))
  res.setHeader('X-RateLimit-Remaining', '0')
  res.status(429).json({ error: 'Too many requests. Please try again later.' })
}
