import crypto from 'crypto'

/**
 * Google Ads conversion tracking endpoint.
 * Accepts conversion data and fires to Google Ads API or Conversion Measurement Protocol
 * for offline conversion tracking, gclid matching, and cross-device attribution.
 *
 * Requires env vars:
 * - GOOGLE_CONVERSION_ID: Google Ads conversion ID (AW-XXXXXXXXX)
 * - GOOGLE_CONVERSION_LABEL: Conversion label for specific conversion action
 * - GOOGLE_ADS_CUSTOMER_ID: (optional) Customer ID for API-based reporting
 *
 * Event types supported:
 * - Lead (lead_captured)
 * - InitiateCheckout (reservation_started)
 * - Purchase (move_in_completed)
 *
 * Can also use Measurement Protocol:
 * https://developers.google.com/google-ads/api/rest/reference/rest/v14/customers.conversionUploadServices
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
 * Hash a string using SHA-256 for PII matching.
 * Google requires user data to be hashed.
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
 * Normalize and hash user data for Google Ads conversion upload.
 * @param {object} userData - User data object (email, phone, firstName, lastName, etc.)
 * @returns {object} Hashed user data for Google
 */
function normalizeUserData(userData) {
  if (!userData || typeof userData !== 'object') return {}

  const hashed = {}

  // Email (can provide multiple)
  if (userData.email) {
    hashed.email = [
      hashSHA256(userData.email),
    ].filter(Boolean)
  }

  // Phone (remove non-digits, then hash)
  if (userData.phone) {
    const phoneDigits = userData.phone.replace(/\D/g, '')
    if (phoneDigits) {
      hashed.phone = [hashSHA256(phoneDigits)].filter(Boolean)
    }
  }

  // First name
  if (userData.firstName) {
    hashed.firstName = [hashSHA256(userData.firstName)].filter(Boolean)
  }

  // Last name
  if (userData.lastName) {
    hashed.lastName = [hashSHA256(userData.lastName)].filter(Boolean)
  }

  // City
  if (userData.city) {
    hashed.city = [hashSHA256(userData.city)].filter(Boolean)
  }

  // State
  if (userData.state) {
    hashed.state = [hashSHA256(userData.state)].filter(Boolean)
  }

  // Postal code
  if (userData.zip || userData.postalCode) {
    const zip = userData.zip || userData.postalCode
    hashed.postalCode = [hashSHA256(zip)].filter(Boolean)
  }

  // Country
  if (userData.country) {
    hashed.country = [hashSHA256(userData.country)].filter(Boolean)
  }

  return hashed
}

/**
 * Use Google Measurement Protocol to fire conversion.
 * This is simpler than the API but has some limitations.
 * @param {object} conversionData - Conversion data
 * @returns {Promise<object>} Response from Google
 */
async function sendViaMeasurementProtocol(conversionData) {
  const {
    conversionId,
    conversionLabel,
    conversionValue,
    conversionCurrency,
    gclid,
    fbclid,
  } = conversionData

  // Build URL params for measurement protocol
  const params = new URLSearchParams({
    cv: '1',
    tid: 'G-XXXXXXX', // GA4 Measurement ID (if tracking in GA4)
    _p: Math.random().toString(36).substring(2, 15), // Unique user ID
    cid: fbclid || gclid || undefined, // Client ID
    t: 'event',
    en: 'conversion',
  })

  if (conversionValue) {
    params.append('ev', conversionValue)
  }

  if (conversionCurrency) {
    params.append('cu', conversionCurrency)
  }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversion_id: conversionId,
        conversion_label: conversionLabel,
        value: conversionValue,
        currency: conversionCurrency,
      }),
    }
  )

  return response.json()
}

/**
 * Send conversion via Google Ads Conversion Upload API (more robust).
 * Requires Google Ads API credentials.
 * @param {object} conversionData - Conversion data
 * @param {string} accessToken - Google OAuth token (if using API)
 * @returns {Promise<object>} Response from Google Ads API
 */
async function sendViaConversionAPI(conversionData, accessToken) {
  const {
    conversationId,
    conversionTime,
    userData,
    conversionValue,
    conversionCurrency,
    gclid,
  } = conversionData

  // Note: This requires Google Ads API OAuth token setup
  // For now, we'll use the Conversion Upload API via pixel
  const conversionPixelUrl = `https://www.googleadservices.com/pagead/conversion/${conversionData.conversionId}/?`

  const params = new URLSearchParams({
    label: conversionData.conversionLabel,
    value: conversionValue || '0',
    currency: conversionCurrency || 'USD',
    gclid: gclid || '',
  })

  const response = await fetch(conversionPixelUrl + params.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  })

  // Google conversion pixels don't return JSON, just 204/302
  return {
    status: response.status,
    success: response.ok,
  }
}

/**
 * Map StowStack event names to Google conversion events.
 * @param {string} stowStackEvent - StowStack event name
 * @returns {string} Google conversion event label
 */
function mapEventName(stowStackEvent) {
  const eventMap = {
    Lead: 'lead',
    lead_captured: 'lead',
    InitiateCheckout: 'initiate_checkout',
    reservation_started: 'initiate_checkout',
    Purchase: 'purchase',
    move_in_completed: 'purchase',
  }
  return eventMap[stowStackEvent] || stowStackEvent.toLowerCase()
}

/**
 * Build Google Ads conversion payload.
 * @param {object} data - Conversion data from client
 * @returns {object} Google Ads conversion payload
 */
function buildConversionPayload(data) {
  const {
    event_name,
    event_time,
    user_data,
    gclid,
    fbclid,
    conversion_value,
    conversion_currency,
    custom_data,
  } = data

  return {
    eventName: mapEventName(event_name),
    eventTime: event_time || Math.floor(Date.now() / 1000),
    userData: normalizeUserData(user_data),
    gclid: gclid || '',
    fbclid: fbclid || '',
    conversionValue: conversion_value || 0,
    conversionCurrency: conversion_currency || 'USD',
    customData: custom_data || {},
  }
}

/**
 * Validate incoming conversion data.
 * @param {object} body - Request body
 * @returns {object|null} Validation errors or null if valid
 */
function validateConversionData(body) {
  const errors = {}

  if (!body.event_name || typeof body.event_name !== 'string') {
    errors.event_name = 'event_name is required'
  }

  if (body.event_time && typeof body.event_time !== 'number') {
    errors.event_time = 'event_time must be a Unix timestamp'
  }

  // At least email or phone for matching
  if (!body.user_data || typeof body.user_data !== 'object') {
    errors.user_data = 'user_data object is required'
  }

  if (body.user_data) {
    const hasIdentifier = body.user_data.email || body.user_data.phone
    if (!hasIdentifier) {
      errors.user_data = 'user_data must contain email or phone for matching'
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

    // Validate conversion data
    const validationErrors = validateConversionData(body)
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      })
    }

    // Require environment variables
    const conversionId = process.env.GOOGLE_CONVERSION_ID
    const conversionLabel = process.env.GOOGLE_CONVERSION_LABEL

    if (!conversionId || !conversionLabel) {
      console.error('Google Conversion: Missing environment variables')
      return res.status(500).json({
        error: 'Server not configured for Google conversions',
      })
    }

    // Build conversion payload
    const conversionPayload = buildConversionPayload({
      ...body,
      conversionId,
      conversionLabel,
    })

    // Send to Google (using pixel-based method for now)
    // In production, you'd use the Google Ads API with OAuth
    const googleResponse = await sendViaConversionAPI(conversionPayload)



    return res.status(200).json({
      success: true,
      event_name: body.event_name,
      conversion_id: conversionId,
      google_response: googleResponse,
    })
  } catch (error) {
    console.error('Google Conversion error:', error.message)
    return res.status(500).json({
      error: 'Failed to send conversion to Google',
      message: error.message,
    })
  }
}
