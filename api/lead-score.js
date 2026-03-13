import { Redis } from '@upstash/redis'

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

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

/*
  Lead scoring criteria (0-100):
  - Facility size (totalUnits): larger = higher value client
  - Occupancy range: lower occupancy = more urgency = higher score
  - Biggest issue: "filling-units" scores highest
  - Pipeline progress: further along = more engaged
  - Recency: newer leads score higher (engagement signal)
  - Has notes: engagement indicator
  - Has form notes: extra detail = more serious
  - Onboarding started: high engagement signal
*/

function scoreLead(lead, hasOnboarding) {
  let score = 0
  const breakdown = {}

  // Facility size (0-20 points)
  const unitScores = { 'under-100': 8, '100-300': 14, '300-500': 18, '500+': 20 }
  const unitScore = unitScores[lead.totalUnits] || 10
  score += unitScore
  breakdown.facilitySize = unitScore

  // Occupancy — lower = more need (0-25 points)
  const occScores = { 'below-60': 25, '60-75': 20, '75-85': 15, '85-95': 8, 'above-95': 3 }
  const occScore = occScores[lead.occupancyRange] || 10
  score += occScore
  breakdown.occupancy = occScore

  // Issue type (0-15 points)
  const issueScores = {
    'filling-units': 15,
    'lowering-costs': 12,
    'digital-presence': 10,
    'competitive-pressure': 13,
    'seasonal-fluctuations': 11,
    'other': 5,
  }
  const issueScore = issueScores[lead.biggestIssue] || 5
  score += issueScore
  breakdown.issue = issueScore

  // Pipeline stage (0-15 points) — further along = more engaged
  const stageScores = {
    'submitted': 3,
    'form_sent': 5,
    'form_completed': 8,
    'audit_generated': 10,
    'call_scheduled': 13,
    'client_signed': 15,
    'lost': 0,
  }
  const stageScore = stageScores[lead.status] || 0
  score += stageScore
  breakdown.pipelineProgress = stageScore

  // Recency (0-10 points) — leads from last 7 days score highest
  const ageInDays = Math.max(0, (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const recencyScore = ageInDays <= 1 ? 10 : ageInDays <= 3 ? 8 : ageInDays <= 7 ? 6 : ageInDays <= 14 ? 4 : ageInDays <= 30 ? 2 : 1
  score += recencyScore
  breakdown.recency = recencyScore

  // Engagement signals (0-15 points)
  let engagementScore = 0
  if (lead.notes && lead.notes.length > 0) engagementScore += 3
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

  const redis = getRedis()
  if (!redis) {
    return res.status(200).json({ scores: {} })
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const leadId = url.searchParams.get('id')

    // Single lead score
    if (leadId) {
      const raw = await redis.get(`lead:${leadId}`)
      if (!raw) return res.status(404).json({ error: 'Lead not found' })
      const lead = typeof raw === 'string' ? JSON.parse(raw) : raw

      // Check onboarding status
      let hasOnboarding = false
      if (lead.accessCode) {
        const onb = await redis.get(`onboarding:${lead.accessCode}`)
        if (onb) {
          const parsed = typeof onb === 'string' ? JSON.parse(onb) : onb
          hasOnboarding = Object.values(parsed.steps || {}).some(s => s.completed)
        }
      }

      return res.status(200).json({ score: scoreLead(lead, hasOnboarding) })
    }

    // All lead scores
    const keys = await redis.keys('lead:*')
    if (!keys.length) return res.status(200).json({ scores: {} })

    const pipeline = redis.pipeline()
    keys.forEach(k => pipeline.get(k))
    const results = await pipeline.exec()

    // Batch check onboarding for signed clients
    const onboardingCodes = new Set()
    const leads = results
      .map((raw, i) => {
        const record = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!record) return null
        if (record.accessCode) onboardingCodes.add(record.accessCode)
        return { id: keys[i].replace('lead:', ''), ...record }
      })
      .filter(Boolean)

    // Fetch onboarding records
    const onboardingMap = {}
    if (onboardingCodes.size > 0) {
      const obPipeline = redis.pipeline()
      const codes = [...onboardingCodes]
      codes.forEach(c => obPipeline.get(`onboarding:${c}`))
      const obResults = await obPipeline.exec()
      codes.forEach((c, i) => {
        if (obResults[i]) {
          const parsed = typeof obResults[i] === 'string' ? JSON.parse(obResults[i]) : obResults[i]
          onboardingMap[c] = parsed.steps ? Object.values(parsed.steps).some(s => s.completed) : false
        }
      })
    }

    const scores = {}
    leads.forEach(lead => {
      const hasOnboarding = lead.accessCode ? !!onboardingMap[lead.accessCode] : false
      scores[lead.id] = scoreLead(lead, hasOnboarding)
    })

    return res.status(200).json({ scores })
  } catch (err) {
    console.error('Lead scoring error:', err)
    return res.status(500).json({ error: 'Failed to compute scores' })
  }
}
