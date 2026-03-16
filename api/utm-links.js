import { query } from './_db.js'
import crypto from 'crypto'
import { requireAdmin, isAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

function generateShortCode() {
  return crypto.randomBytes(4).toString('hex')
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list UTM links for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const rows = await query(
        `SELECT u.*, lp.title as landing_page_title, lp.slug as landing_page_slug
         FROM utm_links u
         LEFT JOIN landing_pages lp ON lp.id = u.landing_page_id
         WHERE u.facility_id = $1
         ORDER BY u.created_at DESC`,
        [facilityId]
      )
      return res.status(200).json({ links: rows })
    } catch (err) {
      console.error('utm-links GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch UTM links' })
    }
  }

  // POST — create a new UTM link
  if (req.method === 'POST') {
    const { facilityId, landingPageId, label, utmSource, utmMedium, utmCampaign, utmContent, utmTerm } = req.body || {}

    if (!facilityId || !label || !utmSource || !utmMedium) {
      return res.status(400).json({ error: 'facilityId, label, utmSource, and utmMedium are required' })
    }

    try {
      const shortCode = generateShortCode()
      const rows = await query(
        `INSERT INTO utm_links (facility_id, landing_page_id, label, utm_source, utm_medium, utm_campaign, utm_content, utm_term, short_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [facilityId, landingPageId || null, label, utmSource, utmMedium, utmCampaign || null, utmContent || null, utmTerm || null, shortCode]
      )

      // Join landing page info for the response
      if (rows[0].landing_page_id) {
        const lp = await query(`SELECT title, slug FROM landing_pages WHERE id = $1`, [rows[0].landing_page_id])
        if (lp.length) {
          rows[0].landing_page_title = lp[0].title
          rows[0].landing_page_slug = lp[0].slug
        }
      }

      return res.status(201).json({ link: rows[0] })
    } catch (err) {
      console.error('utm-links POST failed:', err.message)
      return res.status(500).json({ error: 'Failed to create UTM link' })
    }
  }

  // DELETE — remove a UTM link
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })

    try {
      await query(`DELETE FROM utm_links WHERE id = $1`, [id])
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('utm-links DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to delete UTM link' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
