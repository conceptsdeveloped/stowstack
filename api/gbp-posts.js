import { query } from './_db.js'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'

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

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

/**
 * Refresh an expired GBP OAuth token using the refresh_token.
 * Returns the new access_token or null on failure.
 */
async function refreshAccessToken(connection) {
  if (!connection.refresh_token) return null
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
      await query(
        `UPDATE gbp_connections SET access_token = $1, token_expires_at = $2, status = 'connected', updated_at = NOW() WHERE id = $3`,
        [data.access_token, expiresAt, connection.id]
      )
      return data.access_token
    }
  } catch (err) {
    console.error('GBP token refresh failed:', err.message)
  }
  await query(`UPDATE gbp_connections SET status = 'expired', updated_at = NOW() WHERE id = $1`, [connection.id])
  return null
}

/**
 * Get a valid access token for a GBP connection, refreshing if needed.
 */
async function getValidToken(connection) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
  return refreshAccessToken(connection)
}

/**
 * Publish a post to Google Business Profile via the API.
 */
async function publishToGBP(post, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const gbpPost = {
    languageCode: 'en',
    summary: post.body,
    topicType: post.post_type === 'offer' ? 'OFFER' : post.post_type === 'event' ? 'EVENT' : 'STANDARD',
  }

  if (post.cta_type && post.cta_url) {
    gbpPost.callToAction = { actionType: post.cta_type, url: post.cta_url }
  }

  if (post.image_url) {
    gbpPost.media = [{ mediaFormat: 'PHOTO', sourceUrl: post.image_url }]
  }

  if (post.post_type === 'offer') {
    gbpPost.offer = {}
    if (post.offer_code) gbpPost.offer.couponCode = post.offer_code
    if (post.start_date) gbpPost.offer.startDate = post.start_date
    if (post.end_date) gbpPost.offer.endDate = post.end_date
  }

  if (post.post_type === 'event') {
    gbpPost.event = { title: post.title || 'Event' }
    if (post.start_date) gbpPost.event.schedule = { startDate: post.start_date }
    if (post.end_date) gbpPost.event.schedule = { ...gbpPost.event.schedule, endDate: post.end_date }
  }

  const locationName = connection.location_id
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gbpPost),
    }
  )

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  const result = await res.json()
  return result.name // external post ID
}

/**
 * Generate AI post content based on a prompt context.
 */
async function generateAIPostContent(facilityName, postType, promptContext) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Write a Google Business Profile post for a self-storage facility called "${facilityName}".

Post type: ${postType}
Context: ${promptContext || 'General update about the facility'}

Guidelines:
- Keep it under 300 characters (GBP character limit for posts)
- Be engaging and action-oriented
- Include a clear call-to-action
- Use a friendly, professional tone
- For offers: mention the specific deal and any urgency
- For availability: mention unit types/sizes if known
- For events: include relevant dates/times
- Don't use hashtags or emojis excessively

Return ONLY a JSON object with two fields:
{"title": "Short title (under 60 chars)", "body": "Post body text"}`,
          }],
        }),
      })
      const data = await res.json()
      const content = data.content?.[0]?.text
      if (content) {
        try {
          const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
          return parsed
        } catch {
          return { title: '', body: content }
        }
      }
    } catch (err) {
      console.error('AI post generation failed:', err.message)
    }
  }

  // Template fallbacks
  const templates = {
    update: { title: `News from ${facilityName}`, body: `${promptContext || `Visit ${facilityName} for all your storage needs! We offer clean, secure units in a variety of sizes. Stop by today or call us to learn more.`}` },
    offer: { title: `Special Offer at ${facilityName}`, body: `${promptContext || `Don't miss our current special at ${facilityName}! Limited time offer on select units. Call or visit us to claim your deal before it's gone.`}` },
    event: { title: `Event at ${facilityName}`, body: `${promptContext || `Join us at ${facilityName}! Check our profile for details and updated hours. We look forward to seeing you.`}` },
    availability: { title: `Units Available at ${facilityName}`, body: `${promptContext || `Great news — we have units available at ${facilityName}! Climate-controlled and standard options in multiple sizes. Reserve yours today.`}` },
  }
  return templates[postType] || templates.update
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list posts for a facility
  if (req.method === 'GET') {
    const { facilityId, status: filterStatus } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    let sql = `SELECT * FROM gbp_posts WHERE facility_id = $1`
    const params = [facilityId]
    if (filterStatus) {
      sql += ` AND status = $2`
      params.push(filterStatus)
    }
    sql += ` ORDER BY created_at DESC`

    const posts = await query(sql, params)
    return res.json({ posts })
  }

  // POST — create a new GBP post or generate AI content
  if (req.method === 'POST') {
    const { action } = req.query

    // AI content generation
    if (action === 'generate-content') {
      const { facilityId, postType: pType, promptContext } = req.body
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      const facility = await query(`SELECT name FROM facilities WHERE id = $1`, [facilityId])
      const facilityName = facility[0]?.name || 'our facility'
      const generated = await generateAIPostContent(facilityName, pType || 'update', promptContext || '')
      return res.json({ generated })
    }

    const { facilityId, postType, title, body, ctaType, ctaUrl, imageUrl, offerCode, startDate, endDate, scheduledAt, publish } = req.body
    if (!facilityId || !body) return res.status(400).json({ error: 'facilityId and body required' })

    const conn = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`, [facilityId])
    const connection = conn[0] || null

    let status = 'draft'
    if (scheduledAt) status = 'scheduled'

    const rows = await query(
      `INSERT INTO gbp_posts (facility_id, gbp_connection_id, post_type, title, body, cta_type, cta_url, image_url, offer_code, start_date, end_date, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [facilityId, connection?.id || null, postType || 'update', title || null, body, ctaType || null, ctaUrl || null, imageUrl || null, offerCode || null, startDate || null, endDate || null, status, scheduledAt || null]
    )

    const post = rows[0]

    // Immediately publish if requested and connection exists
    if (publish && connection) {
      try {
        const externalId = await publishToGBP(post, connection)
        await query(
          `UPDATE gbp_posts SET status = 'published', published_at = NOW(), external_post_id = $1 WHERE id = $2`,
          [externalId, post.id]
        )
        post.status = 'published'
        post.external_post_id = externalId
      } catch (err) {
        await query(
          `UPDATE gbp_posts SET status = 'failed', error_message = $1 WHERE id = $2`,
          [err.message, post.id]
        )
        post.status = 'failed'
        post.error_message = err.message
      }
    }

    return res.status(201).json({ post })
  }

  // PATCH — update a post
  if (req.method === 'PATCH') {
    const { id, title, body, ctaType, ctaUrl, imageUrl, offerCode, startDate, endDate, status: newStatus, scheduledAt } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    const sets = []
    const params = []
    let idx = 1

    if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title) }
    if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(body) }
    if (ctaType !== undefined) { sets.push(`cta_type = $${idx++}`); params.push(ctaType) }
    if (ctaUrl !== undefined) { sets.push(`cta_url = $${idx++}`); params.push(ctaUrl) }
    if (imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(imageUrl) }
    if (offerCode !== undefined) { sets.push(`offer_code = $${idx++}`); params.push(offerCode) }
    if (startDate !== undefined) { sets.push(`start_date = $${idx++}`); params.push(startDate) }
    if (endDate !== undefined) { sets.push(`end_date = $${idx++}`); params.push(endDate) }
    if (newStatus !== undefined) { sets.push(`status = $${idx++}`); params.push(newStatus) }
    if (scheduledAt !== undefined) { sets.push(`scheduled_at = $${idx++}`); params.push(scheduledAt) }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

    params.push(id)
    const rows = await query(`UPDATE gbp_posts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params)
    if (!rows.length) return res.status(404).json({ error: 'Post not found' })
    return res.json({ post: rows[0] })
  }

  // DELETE — delete a post
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })

    // If published, try to delete from GBP
    const postRows = await query(`SELECT p.*, c.* FROM gbp_posts p LEFT JOIN gbp_connections c ON p.gbp_connection_id = c.id WHERE p.id = $1`, [id])
    if (postRows.length && postRows[0].external_post_id && postRows[0].access_token) {
      try {
        const token = await getValidToken(postRows[0])
        if (token) {
          await fetch(`https://mybusiness.googleapis.com/v4/${postRows[0].external_post_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      } catch (err) {
        console.error('Failed to delete GBP post:', err.message)
      }
    }

    await query(`DELETE FROM gbp_posts WHERE id = $1`, [id])
    return res.json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
