import crypto from 'crypto'

/**
 * Meta Conversions API server-side event endpoint.
 * Accepts event data and fires to Meta's CAPI for server-side conversion tracking,
 * deduplication with browser pixel, and better event matching.
 *
 * Requires env vars:
 * - META_PIXEL_ID: Facebook pixel ID
 * - META_ACCESS_TOKEN: Facebook API access token
 *
 * Event types supported:
 * - PageView
 * - Lead
 * - InitiateCheckout (reservation_started)
 * - Purchase (move_in_completed)
 * - ViewContent (unit_selected)
 */

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

/**
 * Get CORS headers based on request origin.
 * @param {object} req - Vercel request object
 * @returns {object} CORS headers
 */
function getCorsHeaders(req) {
  const origin = req.headers['origin'] || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Hash a string using SHA-256.
 * Meta requires user data (email, phone, etc.) to be hashed.
 * @param {string} value - Value to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashSHA256(value) {
  if (!value) return undefined
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex')
}

/**
 * Normalize and hash user data for Meta CAPI.
 * @param {object} userData - User data object (email, phone, firstName, lastName, city, state, zip, country)
 * @returns {object} Hashed user data
 */
function normalizeUserData(userData) {
  if (!userData || typeof userData !== 'object') return {}

  const hashed = {}

  // Email
  if (userData.email) {
    hashed.em = hashSHA256(userData.email)
  }

  // Phone (remove non-digits, then hash)
  if (userData.phone) {
    const phoneDigits = userData.phone.replace(/\D/g, '')
    if (phoneDigits) hashed.ph = hashSHA256(phoneDigits)
  }

  // First name
  if (userData.firstName) {
    hashed.fn = hashSHA256(userData.firstName)
  }

  // Last name
  if (userData.lastName) {
    hashed.ln = hashSHA256(userData.lastName)
  }

  // City
  if (userData.city) {
    hashed.ct = hashSHA256(userData.city)
  }

  // State
  if (userData.state) {
    hashed.st = hashSHA256(userData.state)
  }

  // Zip
  if (userData.zip) {
    hashed.zp = hashSHA256(userData.zip)
  }

  // Country
  if (userData.country) {
    hashed.country = hashSHA256(userData.country)
  }

  return hashed
}

/**
 * Map StowStack event names to Meta standard events.
 * @param {string} stowStackEvent - StowStack event name
 * @returns {string} Meta standard event name
 */
function mapEventName(stowStackEvent) {
  const eventMap = {
    PageView: 'PageView',
    Lead: 'Lead',
    InitiateCheckout: 'InitiateCheckout',
    reservation_started: 'InitiateCheckout',
    Purchase: 'Purchase',
    move_in_completed: 'Purchase',
    ViewContent: 'ViewContent',
    unit_selected: 'ViewContent',
  }
  return eventMap[stowStackEvent] || stowStackEvent
}

/**
 * Build Meta CAPI event payload.
 * @param {object} data - Event data from client
 * @returns {object} Meta CAPI event payload
 */
function buildCAPIEvent(data) {
  const {
    event_name,
    event_time,
    event_id,
    user_data,
    custom_data,
    user_agent,
    client_ip_address,
  } = data

  const event = {
    event_name: mapEventName(event_name),
    event_time,
  }

  // Event ID for deduplication (should match browser pixel)
  if (event_id) {
    event.event_id = event_id
  }

  // Normalized and hashed user data
  if (user_data) {
    event.user_data = normalizeUserData(user_data)
    // Add client IP and user agent if provided (improves matching)
    if (client_ip_address) {
      event.user_data.client_ip_address = client_ip_address
    }
    if (user_agent) {
      event.user_data.client_user_agent = user_agent
    }
  }

  // Custom data (value, currency, content_name, etc.)
  if (custom_data && typeof custom_data === 'object') {
    event.custom_data = {}
    // Standard custom data fields
    if (custom_data.value !== undefined) {
      event.custom_data.value = custom_data.value
    }
    if (custom_data.currency) {
      event.custom_data.currency = custom_data.currency
    }
    if (custom_data.content_name) {
      event.custom_data.content_name = custom_data.content_name
    }
    if (custom_data.content_category) {
      event.custom_data.content_category = custom_data.content_category
    }
    if (custom_data.content_type) {
      event.custom_data.content_type = custom_data.content_type
    }
    if (custom_data.content_id) {
      event.custom_data.content_id = custom_data.content_id
    }
    if (custom_data.num_items !== undefined) {
      event.custom_data.num_items = custom_data.num_items
    }
  }

  return event
}

/**
 * Send event to Meta Conversions API.
 * @param {object} event - CAPI event payload
 * @param {string} pixelId - Meta pixel ID
 * @param {string} accessToken - Meta API access token
 * @returns {Promise<object>} Meta API response
 */
async function sendToMetaCAPI(event, pixelId, accessToken) {
  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`

  const payload = {
    data: [event],
    access_token: accessToken,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Meta CAPI error (${response.status}): ${errorBody}`
    )
  }

  return response.json()
}

/**
 * Validate incoming event data.
 * @param {object} body - Request body
 * @returns {object|null} Validation errors or null if valid
 */
function validateEventData(body) {
  const errors = {}

  if (!body.event_name || typeof body.event_name !== 'string') {
    errors.event_name = 'event_name is required'
  }

  if (!body.event_time || typeof body.event_time !== 'number') {
    errors.event_time = 'event_time (Unix timestamp) is required'
  }

  if (!body.user_data || typeof body.user_data !== 'object') {
    errors.user_data = 'user_data object is required'
  }

  // At least one user data field should be present
  if (body.user_data) {
    const hasAtLeastOne = body.user_data.email ||
      body.user_data.phone ||
      body.user_data.firstName ||
      body.user_data.lastName
    if (!hasAtLeastOne) {
      errors.user_data =
        'user_data must contain at least email, phone, firstName, or lastName'
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Vercel serverless function handler.
 */
export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value))

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    // Validate event data
    const validationErrors = validateEventData(body)
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      })
    }

    // Require environment variables
    const pixelId = process.env.META_PIXEL_ID
    const accessToken = process.env.META_ACCESS_TOKEN

    if (!pixelId || !accessToken) {
      console.error('Meta CAPI: Missing environment variables')
      return res.status(500).json({
        error: 'Server not configured for Meta CAPI',
      })
    }

    // Build CAPI event
    const capiEvent = buildCAPIEvent({
      ...body,
      // Capture client IP and user agent for better matching
      client_ip_address: req.headers['x-forwarded-for']?.split(',')[0],
      user_agent: req.headers['user-agent'],
    })

    // Send to Meta
    const metaResponse = await sendToMetaCAPI(
      capiEvent,
      pixelId,
      accessToken
    )

    console.log(
      `Meta CAPI: ${body.event_name} sent successfully`,
      JSON.stringify({ event_id: body.event_id, response: metaResponse })
    )

    return res.status(200).json({
      success: true,
      event_id: body.event_id,
      meta_response: metaResponse,
    })
  } catch (error) {
    console.error('Meta CAPI error:', error.message)
    return res.status(500).json({
      error: 'Failed to send event to Meta',
      message: error.message,
    })
  }
}
