import { query } from '../_db.js'

export default async function handler(req, res) {
  try {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()')
    const deleted = result.length || 0
    console.log(`[cleanup-sessions] Deleted ${deleted} expired sessions`)
    return res.json({ success: true, deleted })
  } catch (err) {
    console.error('Session cleanup error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
