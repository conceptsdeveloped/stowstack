import { query } from './_db.js'

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export default async function handler(req, res) {
  const { id } = req.query || {}

  if (id) {
    query(
      `UPDATE client_reports SET opened_at = COALESCE(opened_at, NOW()), status = 'opened' WHERE id = $1 AND opened_at IS NULL`,
      [id]
    ).catch(() => {})
  }

  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  return res.status(200).end(PIXEL)
}
