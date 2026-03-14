import { Redis } from '@upstash/redis'

const ADMIN_KEY = process.env.ADMIN_SECRET || 'stowstack-admin-2024'
const IDEAS_KEY = 'stowstack:ideas'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const redis = getRedis()
  if (!redis) return res.status(500).json({ error: 'Redis not configured' })

  // GET — list all ideas
  if (req.method === 'GET') {
    const ideas = (await redis.get(IDEAS_KEY)) || []
    return res.json({ ideas })
  }

  // POST — add new idea
  if (req.method === 'POST') {
    const { title, description, category, priority } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

    const ideas = (await redis.get(IDEAS_KEY)) || []
    const idea = {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'general',
      priority: priority || 'medium',
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votes: 0,
    }
    ideas.unshift(idea)
    await redis.set(IDEAS_KEY, ideas)
    return res.json({ idea })
  }

  // PATCH — update idea
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    const ideas = (await redis.get(IDEAS_KEY)) || []
    const idx = ideas.findIndex(i => i.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Idea not found' })

    const allowed = ['title', 'description', 'category', 'priority', 'status', 'votes']
    for (const key of allowed) {
      if (updates[key] !== undefined) ideas[idx][key] = updates[key]
    }
    ideas[idx].updatedAt = new Date().toISOString()
    await redis.set(IDEAS_KEY, ideas)
    return res.json({ idea: ideas[idx] })
  }

  // DELETE — remove idea
  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id is required' })

    let ideas = (await redis.get(IDEAS_KEY)) || []
    ideas = ideas.filter(i => i.id !== id)
    await redis.set(IDEAS_KEY, ideas)
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
