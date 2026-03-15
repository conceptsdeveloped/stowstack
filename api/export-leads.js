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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const CSV_HEADER = 'Name,Email,Phone,Facility,Location,Occupancy,Units,Issue,Status,Created,Updated,Follow-Up,Notes Count'

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const facilities = await query(
      `SELECT f.*,
              (SELECT COUNT(*) FROM lead_notes WHERE facility_id = f.id) AS notes_count
       FROM facilities f
       ORDER BY f.created_at DESC`
    )

    const headers = CSV_HEADER
    const rows = facilities.map(f => [
      escapeCsv(f.contact_name),
      escapeCsv(f.contact_email),
      escapeCsv(f.contact_phone),
      escapeCsv(f.name),
      escapeCsv(f.location),
      escapeCsv(f.occupancy_range),
      escapeCsv(f.total_units),
      escapeCsv(f.biggest_issue),
      escapeCsv(f.pipeline_status),
      escapeCsv(f.created_at ? new Date(f.created_at).toLocaleDateString() : ''),
      escapeCsv(f.updated_at ? new Date(f.updated_at).toLocaleDateString() : ''),
      escapeCsv(f.follow_up_date || ''),
      escapeCsv(f.notes_count || 0),
    ].join(','))

    const csv = [headers, ...rows].join('\n')
    const date = new Date().toISOString().slice(0, 10)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=stowstack-leads-${date}.csv`)
    return res.end(csv)
  } catch (err) {
    console.error('Export leads error:', err)
    return res.status(500).json({ error: 'Failed to export leads' })
  }
}
