import { put, del, list } from '@vercel/blob'
import { query } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

export const config = {
  api: { bodyParser: false },
  maxDuration: 30,
}

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

// Parse multipart form data manually for Vercel serverless
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list assets for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const assets = await query(
        `SELECT * FROM assets WHERE facility_id = $1 ORDER BY created_at DESC`,
        [facilityId]
      )
      return res.status(200).json({ assets })
    } catch (err) {
      console.error('facility-assets GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch assets' })
    }
  }

  // POST — upload a file or save a URL-based asset
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || ''

    // JSON body — save a URL-based asset (from scraper or stock library)
    if (contentType.includes('application/json')) {
      // Need to parse body manually since bodyParser is off
      const body = await new Promise((resolve) => {
        const chunks = []
        req.on('data', c => chunks.push(c))
        req.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
      })

      const { facilityId, url, type, source, metadata } = body
      if (!facilityId || !url) return res.status(400).json({ error: 'facilityId and url required' })

      try {
        const rows = await query(
          `INSERT INTO assets (facility_id, type, source, url, metadata)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [facilityId, type || 'photo', source || 'uploaded', url, JSON.stringify(metadata || {})]
        )
        return res.status(200).json({ asset: rows[0] })
      } catch (err) {
        console.error('facility-assets POST (json) failed:', err.message)
        return res.status(500).json({ error: 'Failed to save asset' })
      }
    }

    // Binary upload — file upload to Vercel Blob
    const facilityId = req.query.facilityId || req.headers['x-facility-id']
    if (!facilityId) return res.status(400).json({ error: 'facilityId required (query param or X-Facility-Id header)' })

    const filename = req.query.filename || req.headers['x-filename'] || `upload-${Date.now()}`
    const fileType = req.headers['x-file-type'] || contentType || 'application/octet-stream'

    // Determine asset type from content type
    let assetType = 'photo'
    if (fileType.startsWith('video/')) assetType = 'video'
    else if (fileType === 'application/pdf') assetType = 'document'

    try {
      const body = await parseMultipart(req)

      const blob = await put(`facilities/${facilityId}/${filename}`, body, {
        access: 'public',
        contentType: fileType,
      })

      const rows = await query(
        `INSERT INTO assets (facility_id, type, source, url, metadata)
         VALUES ($1, $2, 'uploaded', $3, $4) RETURNING *`,
        [facilityId, assetType, blob.url, JSON.stringify({ filename, contentType: fileType, size: body.length })]
      )

      return res.status(200).json({ asset: rows[0], blobUrl: blob.url })
    } catch (err) {
      console.error('facility-assets POST (upload) failed:', err.message)
      return res.status(500).json({ error: 'Upload failed', details: err.message })
    }
  }

  // DELETE — remove an asset
  if (req.method === 'DELETE') {
    // Parse body manually since bodyParser is off
    const body = await new Promise((resolve) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
    })

    const { assetId } = body
    if (!assetId) return res.status(400).json({ error: 'assetId required' })

    try {
      // Get the asset URL first to delete from Blob storage
      const assets = await query(`SELECT url, source FROM assets WHERE id = $1`, [assetId])
      if (assets.length && assets[0].source === 'uploaded') {
        try { await del(assets[0].url) } catch (e) { console.error('Blob delete failed:', e.message) }
      }

      await query(`DELETE FROM assets WHERE id = $1`, [assetId])
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('facility-assets DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to delete asset' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
