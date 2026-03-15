import { query } from '../_db.js'

/*
  Vercel Cron: Process GBP Automation
  Schedule: Every 2 hours (0 */2 * * *)

  1. Publishes scheduled posts where scheduled_at <= NOW()
  2. Syncs new reviews from GBP for all connected facilities
  3. Auto-generates AI response drafts for new unresponded reviews
  4. Auto-publishes responses if auto_respond is enabled
  5. Syncs hours/photos if auto-sync is enabled
  6. Refreshes expired OAuth tokens
*/

const CRON_SECRET = process.env.CRON_SECRET

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

async function publishPost(post, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Auth failed')

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

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${connection.location_id}/localPosts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(gbpPost),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  const result = await res.json()
  return result.name
}

async function syncReviewsForConnection(connection) {
  const token = await getValidToken(connection)
  if (!token) return 0

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${connection.location_id}/reviews?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 0

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
          connection.facility_id, connection.id, externalId,
          review.reviewer?.displayName || 'Anonymous',
          review.starRating ? { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[review.starRating] || 5 : 5,
          review.comment || '',
          review.createTime || new Date().toISOString(),
          review.reviewReply?.comment || null,
          review.reviewReply ? 'published' : 'pending',
        ]
      )
      synced++
    }
  }

  await query(`UPDATE gbp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`, [connection.id])
  return synced
}

async function generateTemplateResponse(review, facilityName) {
  if (review.rating >= 4) {
    return `Thank you so much for your wonderful ${review.rating}-star review, ${review.author_name || 'valued customer'}! We're thrilled to hear about your positive experience at ${facilityName}. We look forward to continuing to serve you!`
  } else if (review.rating === 3) {
    return `Thank you for sharing your feedback, ${review.author_name || 'valued customer'}. At ${facilityName}, we're always striving to improve. Please reach out to us directly so we can address any concerns.`
  } else {
    return `We sincerely apologize for your experience, ${review.author_name || 'valued customer'}. At ${facilityName}, we take all feedback seriously. Please reach out to us directly so we can work toward a resolution.`
  }
}

async function publishReply(review, responseText, connection) {
  const token = await getValidToken(connection)
  if (!token) return false

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${review.external_review_id}/reply`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: responseText }),
  })
  return res.ok
}

export default async function handler(req, res) {
  // Verify cron secret
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = { posts_published: 0, posts_failed: 0, reviews_synced: 0, responses_generated: 0, responses_published: 0 }

  try {
    // 1. Publish scheduled posts
    const duePosts = await query(
      `SELECT p.*, c.access_token, c.refresh_token, c.token_expires_at, c.location_id, c.id as conn_id
       FROM gbp_posts p
       JOIN gbp_connections c ON p.gbp_connection_id = c.id
       WHERE p.status = 'scheduled' AND p.scheduled_at <= NOW() AND c.status = 'connected'`
    )

    for (const post of duePosts) {
      try {
        const externalId = await publishPost(post, {
          id: post.conn_id,
          access_token: post.access_token,
          refresh_token: post.refresh_token,
          token_expires_at: post.token_expires_at,
          location_id: post.location_id,
        })
        await query(
          `UPDATE gbp_posts SET status = 'published', published_at = NOW(), external_post_id = $1 WHERE id = $2`,
          [externalId, post.id]
        )
        results.posts_published++
      } catch (err) {
        await query(`UPDATE gbp_posts SET status = 'failed', error_message = $1 WHERE id = $2`, [err.message, post.id])
        results.posts_failed++
      }
    }

    // 2. Sync reviews for all connected facilities
    const connections = await query(`SELECT * FROM gbp_connections WHERE status = 'connected'`)

    for (const conn of connections) {
      const synced = await syncReviewsForConnection(conn)
      results.reviews_synced += synced

      const config = conn.sync_config || {}

      // 3. Auto-generate and optionally auto-publish responses
      if (config.auto_respond) {
        const pendingReviews = await query(
          `SELECT r.*, f.name as facility_name FROM gbp_reviews r
           JOIN facilities f ON r.facility_id = f.id
           WHERE r.gbp_connection_id = $1 AND r.response_status = 'pending'`,
          [conn.id]
        )

        for (const review of pendingReviews) {
          const draft = await generateTemplateResponse(review, review.facility_name)
          await query(`UPDATE gbp_reviews SET ai_draft = $1, response_status = 'ai_drafted' WHERE id = $2`, [draft, review.id])
          results.responses_generated++

          // Auto-publish if auto_respond is on
          const published = await publishReply(review, draft, conn)
          if (published) {
            await query(
              `UPDATE gbp_reviews SET response_text = $1, response_status = 'published', responded_at = NOW() WHERE id = $2`,
              [draft, review.id]
            )
            results.responses_published++
          }
        }
      }

      // 4. Auto-sync hours if enabled
      if (config.sync_hours) {
        try {
          const token = await getValidToken(conn)
          if (token) {
            const facility = await query(`SELECT hours FROM facilities WHERE id = $1`, [conn.facility_id])
            if (facility[0]?.hours) {
              await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.location_id}?updateMask=regularHours`,
                {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ regularHours: facility[0].hours }),
                }
              )
            }
          }
        } catch (err) {
          console.error(`Hours sync failed for facility ${conn.facility_id}:`, err.message)
        }
      }
    }

    // 5. Refresh tokens that will expire within 30 minutes
    const expiring = await query(
      `SELECT * FROM gbp_connections WHERE status = 'connected' AND token_expires_at <= NOW() + INTERVAL '30 minutes'`
    )
    for (const conn of expiring) {
      await getValidToken(conn)
    }

    console.log('GBP cron results:', results)
    return res.json({ ok: true, ...results })
  } catch (err) {
    console.error('GBP cron error:', err.message)
    return res.status(500).json({ error: err.message, results })
  }
}
