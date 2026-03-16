import { query } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

export const config = { maxDuration: 30 }

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
  return isAdmin(req)
}

// ── Meta Publishing ──

async function metaApi(endpoint, accessToken, body) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, ...body }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

async function publishToMeta(variation, connection, imageUrl) {
  const { access_token, account_id, page_id } = connection
  const adAccountId = account_id.startsWith('act_') ? account_id : `act_${account_id}`
  const content = variation.content_json
  const facilityName = content.headline || 'Storage Ad'
  const landingUrl = connection.metadata?.landingUrl || 'https://stowstack.co'

  if (!page_id) throw new Error('No Facebook Page connected. Reconnect Meta and ensure a Page is linked.')

  // Step 1: Upload image
  let imageHash = null
  if (imageUrl) {
    const uploadData = await metaApi(`${adAccountId}/adimages`, access_token, { url: imageUrl })
    if (uploadData.images) {
      const firstKey = Object.keys(uploadData.images)[0]
      imageHash = uploadData.images[firstKey]?.hash
    }
  }

  // Step 2: Create Campaign (PAUSED so it doesn't spend money immediately)
  const campaignData = await metaApi(`${adAccountId}/campaigns`, access_token, {
    name: `StowStack — ${facilityName}`,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: [],
  })
  const campaignId = campaignData.id

  // Step 3: Create Ad Set (targeting, budget, schedule — all defaults, paused)
  const adSetData = await metaApi(`${adAccountId}/adsets`, access_token, {
    name: `${facilityName} — ${content.angleLabel || variation.angle || 'Ad Set'}`,
    campaign_id: campaignId,
    status: 'PAUSED',
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    daily_budget: 1000, // $10/day in cents — operator adjusts in Ads Manager
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: {
      geo_locations: { countries: ['US'] },
      age_min: 25,
      age_max: 65,
    },
  })
  const adSetId = adSetData.id

  // Step 4: Create Ad Creative
  const creativeSpec = {
    page_id,
    link_data: {
      message: content.primaryText || '',
      link: landingUrl,
      name: content.headline || '',
      description: content.description || '',
      call_to_action: {
        type: mapCtaToMeta(content.cta),
        value: { link: landingUrl },
      },
    },
  }
  if (imageHash) creativeSpec.link_data.image_hash = imageHash

  const creativeData = await metaApi(`${adAccountId}/adcreatives`, access_token, {
    name: `Creative — ${facilityName}`,
    object_story_spec: creativeSpec,
  })
  const creativeId = creativeData.id

  // Step 5: Create the Ad (links creative to ad set — PAUSED)
  const adData = await metaApi(`${adAccountId}/ads`, access_token, {
    name: `Ad — ${content.angleLabel || variation.angle || ''} — ${facilityName}`,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'PAUSED',
  })

  return {
    externalId: adData.id,
    externalUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${account_id}&campaign_ids=${campaignId}`,
    response: {
      campaignId,
      adSetId,
      creativeId,
      adId: adData.id,
      status: 'PAUSED',
      note: 'Campaign created as PAUSED. Review targeting and budget in Ads Manager, then activate when ready.',
    },
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

// ── TikTok Publishing ──

async function publishToTikTok(variation, connection, imageUrl) {
  const content = variation.content_json
  const accessToken = connection.access_token

  // Refresh token if expired
  if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
    const newToken = await refreshTikTokToken(connection)
    if (newToken) connection.access_token = newToken
  }

  // TikTok Content Posting API — photo post with caption
  // Step 1: Initialize the post
  const caption = [
    content.primaryText || content.headline || '',
    '',
    content.description || '',
    '',
    '#selfstorage #storage #moving #storageunit #declutter #organization',
  ].filter(Boolean).join('\n').slice(0, 2200) // TikTok caption limit

  if (imageUrl) {
    // Photo post via URL
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 0,
          photo_images: [imageUrl],
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
      }),
    })
    const initData = await initRes.json()

    if (initData.error?.code && initData.error.code !== 'ok') {
      throw new Error(`TikTok post failed: ${initData.error.message || initData.error.code}`)
    }

    return {
      externalId: initData.data?.publish_id || null,
      externalUrl: connection.metadata?.username
        ? `https://www.tiktok.com/@${connection.metadata.username}`
        : 'https://www.tiktok.com',
      response: {
        publishId: initData.data?.publish_id,
        status: 'posted',
        note: 'Photo posted to TikTok. It may take a few minutes to appear on the profile.',
      },
    }
  }

  // Text-only — TikTok requires media, so we can't post without an image/video
  throw new Error('TikTok requires an image or video. Select an image before publishing.')
}

async function refreshTikTokToken(connection) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  })
  const data = await res.json()

  if (data.access_token) {
    await query(
      `UPDATE platform_connections SET access_token = $1, refresh_token = COALESCE($2, refresh_token), token_expires_at = $3, updated_at = NOW() WHERE id = $4`,
      [data.access_token, data.refresh_token || null, new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(), connection.id]
    )
    return data.access_token
  }
  return null
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
        } else if (connection.platform === 'tiktok') {
          result = await publishToTikTok(variation, connection, imageUrl)
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
