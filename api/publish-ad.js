import { query } from './_db.js'

export const config = { maxDuration: 30 }

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

// ── Meta Publishing ──

async function publishToMeta(variation, connection, imageUrl) {
  const { access_token, account_id, metadata } = connection
  const adAccountId = account_id.startsWith('act_') ? account_id : `act_${account_id}`
  const content = variation.content_json

  // Step 1: Upload image as ad creative
  let imageHash = null
  if (imageUrl) {
    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adimages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token,
          url: imageUrl,
        }),
      }
    )
    const uploadData = await uploadRes.json()
    if (uploadData.images) {
      const firstKey = Object.keys(uploadData.images)[0]
      imageHash = uploadData.images[firstKey]?.hash
    }
  }

  // Step 2: Create ad creative
  const creativePayload = {
    access_token,
    name: `StowStack - ${content.headline || 'Ad'}`,
    object_story_spec: {
      page_id: connection.page_id,
      link_data: {
        message: content.primaryText || '',
        link: connection.metadata?.landingUrl || 'https://stowstack.co',
        name: content.headline || '',
        description: content.description || '',
        call_to_action: {
          type: mapCtaToMeta(content.cta),
          value: { link: connection.metadata?.landingUrl || 'https://stowstack.co' },
        },
      },
    },
  }

  if (imageHash) {
    creativePayload.object_story_spec.link_data.image_hash = imageHash
  }

  const creativeRes = await fetch(
    `https://graph.facebook.com/v21.0/${adAccountId}/adcreatives`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creativePayload),
    }
  )
  const creativeData = await creativeRes.json()

  if (creativeData.error) {
    throw new Error(`Meta creative creation failed: ${creativeData.error.message}`)
  }

  return {
    externalId: creativeData.id,
    externalUrl: `https://business.facebook.com/adsmanager/manage/ads?act=${account_id}`,
    response: creativeData,
  }
}

function mapCtaToMeta(cta) {
  const map = {
    'Learn More': 'LEARN_MORE',
    'Get Quote': 'GET_QUOTE',
    'Book Now': 'BOOK_TRAVEL',
    'Contact Us': 'CONTACT_US',
    'Sign Up': 'SIGN_UP',
  }
  return map[cta] || 'LEARN_MORE'
}

// ── Google Ads Publishing ──

async function publishToGoogle(variation, connection, imageUrl) {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!developerToken) throw new Error('Google Ads developer token not configured')

  // Refresh access token if needed
  let accessToken = connection.access_token
  if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
    accessToken = await refreshGoogleToken(connection)
  }

  const customerId = connection.account_id
  const content = variation.content_json

  // For responsive search ads (Google Search)
  if (variation.platform === 'google_search') {
    // This creates the ad structure — full campaign/ad group creation requires more setup
    return {
      externalId: null,
      externalUrl: `https://ads.google.com/aw/ads?ocid=${customerId}`,
      response: {
        status: 'draft_created',
        message: 'Google Search ad creative prepared. Full campaign creation requires campaign and ad group setup in Google Ads.',
        creative: {
          headlines: [content.headline],
          descriptions: [content.primaryText, content.description].filter(Boolean),
          finalUrls: [connection.metadata?.landingUrl || 'https://stowstack.co'],
        },
      },
    }
  }

  // For display ads
  return {
    externalId: null,
    externalUrl: `https://ads.google.com/aw/ads?ocid=${customerId}`,
    response: {
      status: 'draft_created',
      message: 'Google Display ad creative prepared. Full campaign creation requires campaign setup in Google Ads.',
      creative: {
        headlines: [content.headline],
        descriptions: [content.primaryText, content.description].filter(Boolean),
        imageUrl,
        finalUrls: [connection.metadata?.landingUrl || 'https://stowstack.co'],
      },
    },
  }
}

async function refreshGoogleToken(connection) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()

  if (data.access_token) {
    await query(
      `UPDATE platform_connections SET access_token = $1, token_expires_at = $2, updated_at = NOW() WHERE id = $3`,
      [data.access_token, new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(), connection.id]
    )
    return data.access_token
  }
  throw new Error('Failed to refresh Google token')
}

// ── Handler ──

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch publish history for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const logs = await query(
        `SELECT pl.*, av.content_json, av.angle, av.platform as ad_platform
         FROM publish_log pl
         LEFT JOIN ad_variations av ON av.id = pl.variation_id
         WHERE pl.facility_id = $1
         ORDER BY pl.created_at DESC`,
        [facilityId]
      )
      return res.status(200).json({ logs })
    } catch (err) {
      console.error('publish-ad GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch publish log' })
    }
  }

  // POST — publish an ad variation to a platform
  if (req.method === 'POST') {
    const { variationId, connectionId, imageUrl } = req.body || {}
    if (!variationId || !connectionId) {
      return res.status(400).json({ error: 'variationId and connectionId required' })
    }

    try {
      // Fetch variation and connection
      const [variations, connections] = await Promise.all([
        query(`SELECT * FROM ad_variations WHERE id = $1`, [variationId]),
        query(`SELECT * FROM platform_connections WHERE id = $1`, [connectionId]),
      ])

      if (!variations.length) return res.status(404).json({ error: 'Variation not found' })
      if (!connections.length) return res.status(404).json({ error: 'Connection not found' })

      const variation = variations[0]
      const connection = connections[0]

      if (connection.status !== 'connected') {
        return res.status(400).json({ error: 'Platform not connected. Please reconnect.' })
      }

      // Create publish log entry
      const logRows = await query(
        `INSERT INTO publish_log (facility_id, variation_id, connection_id, platform, status, request_payload)
         VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
        [variation.facility_id, variationId, connectionId, connection.platform,
         JSON.stringify({ variationId, connectionId, imageUrl })]
      )
      const logEntry = logRows[0]

      let result
      try {
        if (connection.platform === 'meta') {
          result = await publishToMeta(variation, connection, imageUrl)
        } else if (connection.platform === 'google_ads') {
          result = await publishToGoogle(variation, connection, imageUrl)
        } else {
          throw new Error(`Unsupported platform: ${connection.platform}`)
        }

        // Update log with success
        await query(
          `UPDATE publish_log SET status = 'published', external_id = $1, external_url = $2, response_payload = $3 WHERE id = $4`,
          [result.externalId, result.externalUrl, JSON.stringify(result.response), logEntry.id]
        )

        // Update variation status
        await query(`UPDATE ad_variations SET status = 'published' WHERE id = $1`, [variationId])

        return res.status(200).json({
          success: true,
          logId: logEntry.id,
          externalId: result.externalId,
          externalUrl: result.externalUrl,
        })
      } catch (pubErr) {
        // Update log with failure
        await query(
          `UPDATE publish_log SET status = 'failed', error_message = $1 WHERE id = $2`,
          [pubErr.message, logEntry.id]
        )
        return res.status(500).json({ error: 'Publishing failed', details: pubErr.message, logId: logEntry.id })
      }
    } catch (err) {
      console.error('publish-ad POST failed:', err.message)
      return res.status(500).json({ error: 'Publishing failed', details: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
