import { queryOne } from './_db.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  // POST /api/client-data — authenticate client by email + access code
  if (req.method === 'POST') {
    const { email, accessCode } = req.body || {}
    if (!email || !accessCode) {
      return res.status(400).json({ error: 'Email and access code required' })
    }

    try {
      const client = await queryOne(
        `SELECT * FROM clients WHERE access_code = $1`,
        [accessCode]
      )
      if (!client) {
        return res.status(401).json({ error: 'Invalid access code' })
      }

      if (client.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      return res.status(200).json({
        client: {
          email: client.email,
          name: client.name,
          facilityName: client.facility_name,
          location: client.location,
          occupancyRange: client.occupancy_range,
          totalUnits: client.total_units,
          signedAt: client.signed_at,
          accessCode: client.access_code,
          monthlyGoal: client.monthly_goal || 0,
        },
      })
    } catch (err) {
      console.error('Client auth error:', err)
      return res.status(500).json({ error: 'Internal error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
