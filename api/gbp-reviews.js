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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

/**
 * Get a valid access token, refreshing if expired.
 */
async function getValidToken(connection) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
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
 * Fetch reviews from Google Business Profile API and upsert into our table.
 */
async function syncReviewsFromGBP(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const locationName = connection.location_id
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  const data = await res.json()
  const reviews = data.reviews || []
  let synced = 0

  for (const review of reviews) {
    const externalId = review.name || review.reviewId
    const existing = await query(`SELECT id FROM gbp_reviews WHERE external_review_id = $1`, [externalId])

    if (existing.length === 0) {
      await query(
        `INSERT INTO gbp_reviews (facility_id, gbp_connection_id, external_review_id, author_name, rating, review_text, review_time, response_text, response_status, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          facilityId,
          connection.id,
          externalId,
          review.reviewer?.displayName || 'Anonymous',
          review.starRating ? { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[review.starRating] || 5 : 5,
          review.comment || '',
          review.createTime || new Date().toISOString(),
          review.reviewReply?.comment || null,
          review.reviewReply ? 'published' : 'pending',
        ]
      )
      synced++
    } else {
      // Update existing review if GBP has a new reply we don't know about
      if (review.reviewReply?.comment) {
        await query(
          `UPDATE gbp_reviews SET response_text = $1, response_status = 'published', synced_at = NOW() WHERE external_review_id = $2 AND response_status = 'pending'`,
          [review.reviewReply.comment, externalId]
        )
      }
    }
  }

  await query(`UPDATE gbp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`, [connection.id])
  return { synced, total: reviews.length }
}

/**
 * Generate an AI response draft for a review.
 */
async function generateAIResponse(review, facilityName) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fallback template-based responses
    if (review.rating >= 4) {
      return `Thank you so much for your wonderful ${review.rating}-star review, ${review.author_name || 'valued customer'}! We're thrilled to hear about your positive experience at ${facilityName}. Your kind words mean a lot to our team. We look forward to continuing to serve you!`
    } else if (review.rating === 3) {
      return `Thank you for taking the time to share your feedback, ${review.author_name || 'valued customer'}. At ${facilityName}, we're always striving to improve. We'd love to hear more about how we can enhance your experience. Please don't hesitate to reach out to us directly so we can address any concerns.`
    } else {
      return `We sincerely apologize for your experience, ${review.author_name || 'valued customer'}. At ${facilityName}, we take all feedback seriously and want to make this right. Please reach out to us directly so we can address your concerns and work toward a resolution. Your satisfaction is our top priority.`
    }
  }

  // Use Anthropic API if available
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
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Write a professional, warm Google Business Profile review response for a self-storage facility called "${facilityName}".

The review is ${review.rating}/5 stars from "${review.author_name || 'a customer'}".
Review text: "${review.review_text || '(no text)'}"

Guidelines:
- Keep it under 150 words
- Be genuine and empathetic
- For negative reviews: apologize, offer to resolve, invite direct contact
- For positive reviews: express gratitude, mention specific points they raised
- Don't be overly corporate or use buzzwords
- Sign off with "The ${facilityName} Team"

Write only the response text, no quotes or labels.`,
          }],
        }),
      })
      const data = await res.json()
      if (data.content?.[0]?.text) return data.content[0].text
    } catch (err) {
      console.error('AI response generation failed:', err.message)
    }
  }

  // Final fallback
  return `Thank you for your review, ${review.author_name || 'valued customer'}! We appreciate your feedback and are committed to providing the best storage experience at ${facilityName}.`
}

/**
 * Publish a review response to GBP.
 */
async function publishReplyToGBP(review, responseText, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${review.external_review_id}/reply`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: responseText }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list reviews for a facility
  if (req.method === 'GET') {
    const { facilityId, status: filterStatus, rating: filterRating } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    let sql = `SELECT * FROM gbp_reviews WHERE facility_id = $1`
    const params = [facilityId]
    let idx = 2
    if (filterStatus) { sql += ` AND response_status = $${idx++}`; params.push(filterStatus) }
    if (filterRating) { sql += ` AND rating = $${idx++}`; params.push(parseInt(filterRating)) }
    sql += ` ORDER BY review_time DESC`

    const reviews = await query(sql, params)

    // Compute summary stats + rating distribution
    const [allReviews, distribution] = await Promise.all([
      query(
        `SELECT COUNT(*) as total, AVG(rating) as avg_rating,
                COUNT(*) FILTER (WHERE response_status = 'published') as responded
         FROM gbp_reviews WHERE facility_id = $1`,
        [facilityId]
      ),
      query(
        `SELECT rating, COUNT(*) as count FROM gbp_reviews WHERE facility_id = $1 GROUP BY rating ORDER BY rating DESC`,
        [facilityId]
      ),
    ])
    const stats = allReviews[0] || {}
    const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const row of distribution) {
      ratingDist[row.rating] = parseInt(row.count) || 0
    }

    return res.json({
      reviews,
      stats: {
        total: parseInt(stats.total) || 0,
        avg_rating: parseFloat(Number(stats.avg_rating || 0).toFixed(1)),
        responded: parseInt(stats.responded) || 0,
        response_rate: stats.total > 0 ? Math.round((stats.responded / stats.total) * 100) : 0,
        distribution: ratingDist,
      },
    })
  }

  // POST — sync reviews, generate AI response, or approve+publish
  if (req.method === 'POST') {
    const { action } = req.query

    // Sync reviews from GBP
    if (action === 'sync') {
      const { facilityId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      const conn = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`, [facilityId])
      if (!conn.length) return res.status(400).json({ error: 'No GBP connection for this facility' })

      try {
        const result = await syncReviewsFromGBP(facilityId, conn[0])
        return res.json({ ok: true, ...result })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // Generate AI response for a review
    if (action === 'generate-response') {
      const { reviewId } = req.body
      if (!reviewId) return res.status(400).json({ error: 'reviewId required' })

      const reviewRows = await query(`SELECT r.*, f.name as facility_name FROM gbp_reviews r JOIN facilities f ON r.facility_id = f.id WHERE r.id = $1`, [reviewId])
      if (!reviewRows.length) return res.status(404).json({ error: 'Review not found' })

      const review = reviewRows[0]
      const aiDraft = await generateAIResponse(review, review.facility_name)
      await query(`UPDATE gbp_reviews SET ai_draft = $1, response_status = 'ai_drafted' WHERE id = $2`, [aiDraft, reviewId])
      return res.json({ aiDraft })
    }

    // Approve and publish a response
    if (action === 'approve-response') {
      const { reviewId, responseText } = req.body
      if (!reviewId || !responseText) return res.status(400).json({ error: 'reviewId and responseText required' })

      const reviewRows = await query(
        `SELECT r.*, c.access_token, c.refresh_token, c.token_expires_at, c.location_id, c.id as conn_id
         FROM gbp_reviews r
         LEFT JOIN gbp_connections c ON r.gbp_connection_id = c.id
         WHERE r.id = $1`,
        [reviewId]
      )
      if (!reviewRows.length) return res.status(404).json({ error: 'Review not found' })

      const review = reviewRows[0]

      // Try to publish to GBP if connected
      if (review.access_token && review.external_review_id) {
        try {
          await publishReplyToGBP(review, responseText, {
            id: review.conn_id,
            access_token: review.access_token,
            refresh_token: review.refresh_token,
            token_expires_at: review.token_expires_at,
          })
        } catch (err) {
          console.error('Failed to publish reply to GBP:', err.message)
          // Still save locally even if GBP publish fails
        }
      }

      await query(
        `UPDATE gbp_reviews SET response_text = $1, response_status = 'published', responded_at = NOW() WHERE id = $2`,
        [responseText, reviewId]
      )
      return res.json({ ok: true })
    }

    // Bulk generate AI responses for all pending reviews
    if (action === 'bulk-generate') {
      const { facilityId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      const pending = await query(
        `SELECT r.*, f.name as facility_name FROM gbp_reviews r
         JOIN facilities f ON r.facility_id = f.id
         WHERE r.facility_id = $1 AND r.response_status = 'pending'`,
        [facilityId]
      )

      let generated = 0
      for (const review of pending) {
        const aiDraft = await generateAIResponse(review, review.facility_name)
        await query(`UPDATE gbp_reviews SET ai_draft = $1, response_status = 'ai_drafted' WHERE id = $2`, [aiDraft, review.id])
        generated++
      }
      return res.json({ ok: true, generated })
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  // PATCH — manually edit an AI draft
  if (req.method === 'PATCH') {
    const { id, aiDraft, responseStatus } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    const sets = []
    const params = []
    let idx = 1
    if (aiDraft !== undefined) { sets.push(`ai_draft = $${idx++}`); params.push(aiDraft) }
    if (responseStatus !== undefined) { sets.push(`response_status = $${idx++}`); params.push(responseStatus) }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

    params.push(id)
    const rows = await query(`UPDATE gbp_reviews SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params)
    if (!rows.length) return res.status(404).json({ error: 'Review not found' })
    return res.json({ review: rows[0] })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
