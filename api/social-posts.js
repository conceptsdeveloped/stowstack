/**
 * Social Posts CRUD API
 *
 * GET    /api/social-posts?facilityId=X&status=draft&platform=facebook&month=2026-03
 * POST   /api/social-posts  { facilityId, platform, postType, content, hashtags, mediaUrls, ctaUrl, scheduledAt }
 * PATCH  /api/social-posts  { id, content?, hashtags?, status?, scheduledAt?, mediaUrls? }
 * DELETE /api/social-posts?id=X
 *
 * Does NOT modify any existing tables or endpoints.
 */
import { query, queryOne } from './_db.js'
import { requireAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  try {
    /* ── GET: List posts ── */
    if (req.method === 'GET') {
      const { facilityId, status, platform, month } = req.query
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      let sql = `SELECT * FROM social_posts WHERE facility_id = $1`
      const params = [facilityId]
      let idx = 2

      if (status) {
        sql += ` AND status = $${idx++}`
        params.push(status)
      }
      if (platform) {
        sql += ` AND platform = $${idx++}`
        params.push(platform)
      }
      if (month) {
        // month format: "2026-03"
        sql += ` AND (
          (scheduled_at >= $${idx}::date AND scheduled_at < ($${idx}::date + interval '1 month'))
          OR (published_at >= $${idx}::date AND published_at < ($${idx}::date + interval '1 month'))
          OR (created_at >= $${idx}::date AND created_at < ($${idx}::date + interval '1 month'))
        )`
        params.push(`${month}-01`)
        idx++
      }

      sql += ` ORDER BY COALESCE(scheduled_at, created_at) ASC`

      const posts = await query(sql, params)
      return res.status(200).json({ posts })
    }

    /* ── POST: Create post ── */
    if (req.method === 'POST') {
      const {
        facilityId, platform, postType, content,
        hashtags, mediaUrls, ctaUrl, scheduledAt,
        aiGenerated, batchId, suggestedImage,
      } = req.body

      if (!facilityId || !platform || !content) {
        return res.status(400).json({ error: 'facilityId, platform, and content required' })
      }

      const status = scheduledAt ? 'scheduled' : 'draft'

      const rows = await query(`
        INSERT INTO social_posts (
          facility_id, platform, post_type, content, hashtags, media_urls,
          cta_url, status, scheduled_at, ai_generated, batch_id, suggested_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        facilityId,
        platform,
        postType || 'tip',
        content,
        hashtags || [],
        mediaUrls || [],
        ctaUrl || null,
        status,
        scheduledAt || null,
        aiGenerated || false,
        batchId || null,
        suggestedImage || null,
      ])

      return res.status(201).json({ post: rows[0] })
    }

    /* ── PATCH: Update post ── */
    if (req.method === 'PATCH') {
      const { id, content, hashtags, mediaUrls, ctaUrl, status, scheduledAt, postType } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })

      const sets = []
      const params = []
      let idx = 1

      if (content !== undefined) { sets.push(`content = $${idx++}`); params.push(content) }
      if (hashtags !== undefined) { sets.push(`hashtags = $${idx++}`); params.push(hashtags) }
      if (mediaUrls !== undefined) { sets.push(`media_urls = $${idx++}`); params.push(mediaUrls) }
      if (ctaUrl !== undefined) { sets.push(`cta_url = $${idx++}`); params.push(ctaUrl) }
      if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status) }
      if (scheduledAt !== undefined) { sets.push(`scheduled_at = $${idx++}`); params.push(scheduledAt) }
      if (postType !== undefined) { sets.push(`post_type = $${idx++}`); params.push(postType) }

      sets.push(`updated_at = NOW()`)

      if (sets.length <= 1) return res.status(400).json({ error: 'Nothing to update' })

      params.push(id)
      const rows = await query(
        `UPDATE social_posts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      )

      if (rows.length === 0) return res.status(404).json({ error: 'Post not found' })
      return res.status(200).json({ post: rows[0] })
    }

    /* ── DELETE: Remove post ── */
    if (req.method === 'DELETE') {
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'id required' })

      await query(`DELETE FROM social_posts WHERE id = $1`, [id])
      return res.status(200).json({ deleted: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Social posts error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
