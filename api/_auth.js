// Shared admin authentication helpers
import crypto from 'crypto'

export function getAdminKey() {
  const key = process.env.ADMIN_SECRET
  if (!key) {
    throw new Error('ADMIN_SECRET environment variable is not set')
  }
  return key
}

function safeCompare(a, b) {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function requireAdmin(req, res) {
  let key
  try {
    key = getAdminKey()
  } catch (err) {
    console.error(err.message)
    res.status(401).json({ error: 'Server auth misconfigured' })
    return false
  }

  if (!safeCompare(req.headers['x-admin-key'], key)) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }

  return true
}

export function isAdmin(req) {
  try {
    return safeCompare(req.headers['x-admin-key'], getAdminKey())
  } catch {
    return false
  }
}
