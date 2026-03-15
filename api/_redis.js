import { Redis } from '@upstash/redis'

// Reuse Redis instance across warm serverless invocations
let redis

export function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
  return redis
}
