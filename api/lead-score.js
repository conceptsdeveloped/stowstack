import { query, queryOne } from './_db.js'

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

function scoreLead(lead, hasOnboarding) {
  let score = 0
  const breakdown = {}

  const unitScores = { 'under-100': 8, '100-300': 14, '300-500': 18, '500+': 20 }
  const unitScore = unitScores[lead.totalUnits] || 10
  score += unitScore
  breakdown.facilitySize = unitScore

  const occScores = { 'below-60': 25, '60-75': 20, '75-85': 15, '85-95': 8, 'above-95': 3 }
  const occScore = occScores[lead.occupancyRange] || 10
  score += occScore
  breakdown.occupancy = occScore

  const issueScores = {
    'filling-units': 15, 'lowering-costs': 12, 'digital-presence': 10,
    'competitive-pressure': 13, 'seasonal-fluctuations': 11, 'other': 5,
  }
  const issueScore = issueScores[lead.biggestIssue] || 5
  score += issueScore
  breakdown.issue = issueScore

  const stageScores = {
    'submitted': 3, 'form_sent': 5, 'form_completed': 8,
    'audit_generated': 10, 'call_scheduled': 13, 'client_signed': 15, 'lost': 0,
  }
  const stageScore = stageScores[lead.status] || 0
  score += stageScore
  breakdown.pipelineProgress = stageScore

  const ageInDays = Math.max(0, (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const recencyScore = ageInDays <= 1 ? 10 : ageInDays <= 3 ? 8 : ageInDays <= 7 ? 6 : ageInDays <= 14 ? 4 : ageInDays <= 30 ? 2 : 1
  score += recencyScore
  breakdown.recency = recencyScore

  let engagementScore = 0
  if (lead.notesCount > 0) engagementScore += 3
  if (lead.formNotes) engagementScore += 3
  if (lead.pmsUploaded) engagementScore += 4
  if (hasOnboarding) engagementScore += 5
  engagementScore = Math.min(15, engagementScore)
  score += engagementScore
  breakdown.engagement = engagementScore

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F',
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const leadId = url.searchParams.get('id')

    // Single lead score
    if (leadId) {
      const facility = await queryOne(`SELECT * FROM facilities WHERE id = $1`, [leadId])
      if (!facility) return res.status(404).json({ error: 'Lead not found' })

      const noteCount = await queryOne(
        `SELECT COUNT(*) as count FROM lead_notes WHERE facility_id = $1`, [leadId]
      )

      let hasOnboarding = false
      if (facility.access_code) {
        const onb = await queryOne(
          `SELECT steps FROM client_onboarding WHERE access_code = $1`, [facility.access_code]
        )
        if (onb?.steps) {
          hasOnboarding = Object.values(onb.steps).some(s => s.completed)
        }
      }

      const lead = {
        totalUnits: facility.total_units,
        occupancyRange: facility.occupancy_range,
        biggestIssue: facility.biggest_issue,
        status: facility.pipeline_status,
        createdAt: facility.created_at,
        notesCount: parseInt(noteCount?.count || 0),
        formNotes: facility.form_notes,
        pmsUploaded: facility.pms_uploaded,
      }

      return res.status(200).json({ score: scoreLead(lead, hasOnboarding) })
    }

    // All lead scores
    const facilities = await query(`SELECT * FROM facilities`)
    if (!facilities.length) return res.status(200).json({ scores: {} })

    // Batch note counts
    const noteCounts = await query(
      `SELECT facility_id, COUNT(*) as count FROM lead_notes GROUP BY facility_id`
    )
    const noteCountMap = {}
    for (const n of noteCounts) noteCountMap[n.facility_id] = parseInt(n.count)

    // Batch onboarding check
    const onboardingRows = await query(
      `SELECT co.access_code, co.steps FROM client_onboarding co`
    )
    const onboardingMap = {}
    for (const o of onboardingRows) {
      if (o.steps) {
        onboardingMap[o.access_code] = Object.values(o.steps).some(s => s.completed)
      }
    }

    const scores = {}
    for (const f of facilities) {
      const lead = {
        totalUnits: f.total_units,
        occupancyRange: f.occupancy_range,
        biggestIssue: f.biggest_issue,
        status: f.pipeline_status,
        createdAt: f.created_at,
        notesCount: noteCountMap[f.id] || 0,
        formNotes: f.form_notes,
        pmsUploaded: f.pms_uploaded,
      }
      const hasOnboarding = f.access_code ? !!onboardingMap[f.access_code] : false
      scores[f.id] = scoreLead(lead, hasOnboarding)
    }

    return res.status(200).json({ scores })
  } catch (err) {
    console.error('Lead scoring error:', err)
    return res.status(500).json({ error: 'Failed to compute scores' })
  }
}
