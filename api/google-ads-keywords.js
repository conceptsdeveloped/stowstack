import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin, isAdmin } from './_auth.js'

export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

const SYSTEM_PROMPT = `You are a Google Ads keyword strategist specializing in self-storage facilities. You generate keyword ideas organized by search intent and ad group theme.

Return ONLY valid JSON — no markdown, no text outside the JSON.

For each keyword, provide:
- keyword: the search term (lowercase)
- intent: "high" (ready to rent), "medium" (researching), or "low" (early awareness)
- competition: "high", "medium", or "low" (based on typical self-storage market)
- estimatedCPC: realistic CPC in dollars for self-storage (typically $2-$12)
- estimatedVolume: monthly search volume estimate for a local market
- relevanceScore: 0-100, how relevant to self-storage
- rationale: 1-sentence explanation
- group: ad group name (e.g., "Brand + Location", "Unit Sizes", "Competitor", "Life Events")

OUTPUT:
{
  "keywords": [
    { "keyword": "", "intent": "", "competition": "", "estimatedCPC": 0, "estimatedVolume": 0, "relevanceScore": 0, "rationale": "", "group": "" }
  ]
}

Generate 25-35 keywords covering these groups:
1. Brand + Location (facility name + city/area)
2. Generic Storage (self storage, storage units, etc.)
3. Unit Sizes (5x5, 10x10, etc.)
4. Features (climate controlled, 24 hour access, etc.)
5. Life Events (moving, declutter, renovation, etc.)
6. Competitor (alternative to [competitor], storage near [landmark])
7. Long-tail / Low Competition (unique local opportunities)`

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { facilityId } = req.body || {}
  if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  try {
    const facilities = await query(`SELECT * FROM facilities WHERE id = $1`, [facilityId])
    if (!facilities.length) return res.status(404).json({ error: 'Facility not found' })
    const f = facilities[0]

    // Gather context
    const [contextDocs, marketingPlans] = await Promise.all([
      query(`SELECT type, title, content FROM facility_context WHERE facility_id = $1 AND type IN ('competitor_info', 'market_research') LIMIT 3`, [facilityId]),
      query(`SELECT plan_json, spend_recommendation, assigned_playbooks FROM marketing_plans WHERE facility_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`, [facilityId]),
    ])

    const lines = [
      `Facility: ${f.name}`,
      `Location: ${f.location}`,
      `Address: ${f.google_address || f.location}`,
      `Occupancy: ${f.occupancy_range || 'unknown'}`,
      `Total units: ${f.total_units || 'unknown'}`,
    ]
    if (f.google_rating) lines.push(`Rating: ${f.google_rating}★ (${f.review_count} reviews)`)
    if (f.biggest_issue) lines.push(`Challenge: ${f.biggest_issue}`)

    if (contextDocs.length) {
      lines.push('\nCompetitor/Market Context:')
      contextDocs.forEach(d => lines.push(`[${d.type}] ${d.title}: ${(d.content || '').slice(0, 300)}`))
    }

    // Inject marketing plan context if one exists
    const plan = marketingPlans[0]
    if (plan?.plan_json) {
      const p = typeof plan.plan_json === 'string' ? JSON.parse(plan.plan_json) : plan.plan_json
      lines.push('\n--- ACTIVE MARKETING PLAN (use this to inform keyword selection) ---')
      if (p.bottleneck_analysis) lines.push(`Bottleneck: ${p.bottleneck_analysis.slice(0, 200)}`)
      if (p.target_audiences?.length) {
        lines.push('Target audiences: ' + p.target_audiences.map(a => `${a.segment} (${a.messaging_angle})`).join('; '))
      }
      if (p.messaging_pillars?.length) {
        lines.push('Messaging pillars: ' + p.messaging_pillars.map(m => m.pillar).join(', '))
      }
      if (p.channel_strategy?.length) {
        const googleStrategy = p.channel_strategy.find(c => /google|search|ppc/i.test(c.channel))
        if (googleStrategy) {
          lines.push(`Google strategy: ${googleStrategy.objective}`)
          if (googleStrategy.tactics?.length) lines.push(`Tactics: ${googleStrategy.tactics.join('; ')}`)
        }
      }
      if (plan.assigned_playbooks?.length) {
        lines.push(`Active playbooks: ${plan.assigned_playbooks.join(', ')}`)
      }
      lines.push('Weight keyword suggestions toward these strategic priorities.')
    }

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Generate Google Ads keywords for this self-storage facility. Make them specific to the location and market.\n\n${lines.join('\n')}` }],
    })

    const raw = message.content[0].text.trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse keywords response')
      try {
        parsed = JSON.parse(match[0])
      } catch {
        // Repair truncated JSON
        let repaired = match[0].replace(/,\s*$/, '').replace(/,\s*"[^"]*$/, '')
        const ob = (repaired.match(/\{/g) || []).length
        const cb = (repaired.match(/\}/g) || []).length
        const oB = (repaired.match(/\[/g) || []).length
        const cB = (repaired.match(/\]/g) || []).length
        for (let i = 0; i < oB - cB; i++) repaired += ']'
        for (let i = 0; i < ob - cb; i++) repaired += '}'
        parsed = JSON.parse(repaired)
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Keyword generation failed:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
