/**
 * POST /api/fb/data-deletion
 *
 * Facebook Data Deletion Request Callback.
 * Required by Meta Platform Terms for apps using Facebook Login.
 *
 * Facebook sends a signed_request when a user removes StowStack and
 * requests their data be deleted. We verify the signature, store the
 * request in Postgres, and return the JSON Facebook expects.
 */

import crypto from 'crypto'
import { query } from '../_db.js'

const BASE_URL = process.env.BASE_URL || 'https://stowstack.co'

function base64UrlDecode(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function parseSignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split('.', 2)
  if (!encodedSig || !payload) return null

  const sig = base64UrlDecode(encodedSig)
  const data = JSON.parse(base64UrlDecode(payload).toString('utf8'))

  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest()

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    console.error('[FB Data Deletion] Bad signed request signature.')
    return null
  }

  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const appSecret = process.env.FB_APP_SECRET
  if (!appSecret) {
    console.error('[FB Data Deletion] FB_APP_SECRET env var is not set.')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const { signed_request } = req.body || {}
  if (!signed_request) {
    return res.status(400).json({ error: 'Missing signed_request' })
  }

  const data = parseSignedRequest(signed_request, appSecret)
  if (!data) {
    return res.status(403).json({ error: 'Invalid signature' })
  }

  const userId = data.user_id
  const confirmationCode = crypto.randomBytes(8).toString('hex')

  // Persist to Postgres
  try {
    await query(
      `INSERT INTO fb_deletion_requests (confirmation_code, fb_user_id, status, requested_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [confirmationCode, userId]
    )
  } catch (dbErr) {
    console.error('[FB Data Deletion] DB insert failed:', dbErr.message)
    // Still return success to Facebook — we logged the request
  }

  console.log(
    `[FB Data Deletion] Request received for user ${userId} — code: ${confirmationCode}`
  )

  const statusUrl = `${BASE_URL}/api/fb/data-deletion/status?code=${confirmationCode}`

  return res.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  })
}
