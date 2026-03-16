// Shared admin authentication helpers

export function getAdminKey() {
  const key = process.env.ADMIN_SECRET
  if (!key) {
    throw new Error('ADMIN_SECRET environment variable is not set')
  }
  return key
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

  if (req.headers['x-admin-key'] !== key) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }

  return true
}

export function isAdmin(req) {
  try {
    return req.headers['x-admin-key'] === getAdminKey()
  } catch {
    return false
  }
}
