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
    'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
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

const VALID_STEPS = ['facilityDetails', 'targetDemographics', 'unitMix', 'competitorIntel', 'adPreferences']

function emptyScaffold(code) {
  return {
    accessCode: code,
    updatedAt: new Date().toISOString(),
    completedAt: null,
    steps: {
      facilityDetails: { completed: false, data: { brandDescription: '', brandColors: '', sellingPoints: [] } },
      targetDemographics: { completed: false, data: { ageMin: 25, ageMax: 65, radiusMiles: 15, incomeLevel: 'any', targetRenters: true, targetOwners: true, notes: '' } },
      unitMix: { completed: false, data: { units: [], specials: '' } },
      competitorIntel: { completed: false, data: { competitors: [], differentiation: '' } },
      adPreferences: { completed: false, data: { toneOfVoice: '', pastAdExperience: '', monthlyBudget: '', primaryGoal: '', notes: '' } },
    },
  }
}

function clampStr(val, max) {
  if (typeof val !== 'string') return ''
  return val.slice(0, max)
}

function clampNum(val, min, max) {
  const n = Number(val)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

function isStepComplete(step, data) {
  switch (step) {
    case 'facilityDetails':
      return !!(data.brandDescription && data.brandColors && data.sellingPoints && data.sellingPoints.length > 0 && data.sellingPoints.some(s => s.trim()))
    case 'targetDemographics':
      return !!(data.ageMin && data.ageMax && data.radiusMiles && data.incomeLevel)
    case 'unitMix':
      return !!(data.units && data.units.length > 0 && data.units.every(u => u.type && u.size && u.monthlyRate > 0))
    case 'competitorIntel':
      return !!(data.differentiation)
    case 'adPreferences':
      return !!(data.toneOfVoice && data.monthlyBudget && data.primaryGoal)
    default:
      return false
  }
}

function sanitizeStepData(step, data) {
  switch (step) {
    case 'facilityDetails':
      return {
        brandDescription: clampStr(data.brandDescription, 500),
        brandColors: clampStr(data.brandColors, 100),
        sellingPoints: (Array.isArray(data.sellingPoints) ? data.sellingPoints : []).slice(0, 5).map(s => clampStr(s, 200)),
      }
    case 'targetDemographics':
      return {
        ageMin: clampNum(data.ageMin, 18, 99),
        ageMax: clampNum(data.ageMax, 18, 99),
        radiusMiles: clampNum(data.radiusMiles, 1, 100),
        incomeLevel: ['any', 'low-mid', 'mid-high', 'high'].includes(data.incomeLevel) ? data.incomeLevel : 'any',
        targetRenters: data.targetRenters !== false,
        targetOwners: data.targetOwners !== false,
        notes: clampStr(data.notes, 1000),
      }
    case 'unitMix':
      return {
        units: (Array.isArray(data.units) ? data.units : []).slice(0, 10).map(u => ({
          type: clampStr(u.type, 100),
          size: clampStr(u.size, 50),
          monthlyRate: Math.max(0, Number(u.monthlyRate) || 0),
          availableCount: Math.max(0, Math.round(Number(u.availableCount) || 0)),
        })),
        specials: clampStr(data.specials, 500),
      }
    case 'competitorIntel':
      return {
        competitors: (Array.isArray(data.competitors) ? data.competitors : []).slice(0, 5).map(c => ({
          name: clampStr(c.name, 100),
          distance: clampStr(c.distance, 50),
          pricingNotes: clampStr(c.pricingNotes, 200),
        })),
        differentiation: clampStr(data.differentiation, 500),
      }
    case 'adPreferences':
      return {
        toneOfVoice: ['professional', 'friendly', 'urgent', 'premium'].includes(data.toneOfVoice) ? data.toneOfVoice : '',
        pastAdExperience: clampStr(data.pastAdExperience, 1000),
        monthlyBudget: ['under-1k', '1k-2.5k', '2.5k-5k', '5k-10k', '10k+'].includes(data.monthlyBudget) ? data.monthlyBudget : '',
        primaryGoal: ['fill-units', 'lease-up', 'seasonal-push', 'rebrand'].includes(data.primaryGoal) ? data.primaryGoal : '',
        notes: clampStr(data.notes, 1000),
      }
    default:
      return {}
  }
}

function computeCompletion(onboarding) {
  const completed = VALID_STEPS.filter(s => onboarding.steps[s]?.completed).length
  return Math.round((completed / VALID_STEPS.length) * 100)
}

async function verifyClientAuth(redis, code, email) {
  if (!code || !email) return false
  const raw = await redis.get(`client:${code}`)
  if (!raw) return false
  const record = typeof raw === 'string' ? JSON.parse(raw) : raw
  return record.email && record.email.toLowerCase() === email.trim().toLowerCase()
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  const redis = getRedis()
  const isAdmin = req.headers['x-admin-key'] === ADMIN_KEY

  // GET /api/client-onboarding?code=XXXX[&email=xxx] — get onboarding data
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const code = url.searchParams.get('code')
    if (!code) return res.status(400).json({ error: 'Missing access code' })

    // Auth: admin key or client email
    if (!isAdmin) {
      const email = url.searchParams.get('email')
      if (!redis) return res.status(200).json({ onboarding: emptyScaffold(code), completionPct: 0 })
      const valid = await verifyClientAuth(redis, code, email)
      if (!valid) return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!redis) return res.status(200).json({ onboarding: emptyScaffold(code), completionPct: 0 })

    try {
      const raw = await redis.get(`onboarding:${code}`)
      const onboarding = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : emptyScaffold(code)
      return res.status(200).json({ onboarding, completionPct: computeCompletion(onboarding) })
    } catch (err) {
      console.error('Get onboarding error:', err)
      return res.status(500).json({ error: 'Failed to get onboarding data' })
    }
  }

  // PATCH /api/client-onboarding — save a step
  // body: { code, step, data, email? }
  if (req.method === 'PATCH') {
    const { code, step, data, email } = req.body || {}
    if (!code || !step || !data) return res.status(400).json({ error: 'Missing code, step, or data' })
    if (!VALID_STEPS.includes(step)) return res.status(400).json({ error: 'Invalid step' })

    // Auth
    if (!isAdmin) {
      if (!redis) return res.status(200).json({ success: true, onboarding: emptyScaffold(code), completionPct: 0 })
      const valid = await verifyClientAuth(redis, code, email)
      if (!valid) return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!redis) return res.status(200).json({ success: true, onboarding: emptyScaffold(code), completionPct: 0 })

    try {
      const raw = await redis.get(`onboarding:${code}`)
      const onboarding = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : emptyScaffold(code)

      const sanitized = sanitizeStepData(step, data)
      onboarding.steps[step] = {
        completed: isStepComplete(step, sanitized),
        data: sanitized,
      }
      onboarding.updatedAt = new Date().toISOString()

      // Check if all steps complete
      const allDone = VALID_STEPS.every(s => onboarding.steps[s]?.completed)
      if (allDone && !onboarding.completedAt) {
        onboarding.completedAt = new Date().toISOString()
      } else if (!allDone) {
        onboarding.completedAt = null
      }

      await redis.set(`onboarding:${code}`, JSON.stringify(onboarding))
      return res.status(200).json({ success: true, onboarding, completionPct: computeCompletion(onboarding) })
    } catch (err) {
      console.error('Save onboarding step error:', err)
      return res.status(500).json({ error: 'Failed to save onboarding data' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
