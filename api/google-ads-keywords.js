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

    // PMS data enrichment — storEDGE is canonical source of truth
    try {
      const [pmsUnits, pmsSnap, pmsSpecials] = await Promise.all([
        query(
          `SELECT unit_type, size_label, street_rate, web_rate, total_count, occupied_count,
                  (total_count - occupied_count) AS vacant_count, features
           FROM facility_pms_units WHERE facility_id = $1 ORDER BY total_count DESC`,
          [facilityId]
        ),
        query(
          `SELECT occupancy_pct, total_units, occupied_units FROM facility_pms_snapshots
           WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
          [facilityId]
        ),
        query(
          `SELECT name, applies_to, discount_type, discount_value FROM facility_pms_specials
           WHERE facility_id = $1 AND active = true LIMIT 3`,
          [facilityId]
        ),
      ])
      if (pmsUnits.length) {
        const totalUnits = pmsUnits.reduce((s, u) => s + (u.total_count || 0), 0)
        const totalVacant = pmsUnits.reduce((s, u) => s + (u.vacant_count || 0), 0)
        const occPct = pmsSnap[0]?.occupancy_pct || (totalUnits > 0 ? ((totalUnits - totalVacant) / totalUnits * 100).toFixed(1) : null)
        const monthlyGap = pmsUnits.reduce((s, u) => s + ((u.vacant_count || 0) * (u.street_rate || 0)), 0)

        lines.push('\n--- storEDGE PMS DATA (CANONICAL SOURCE OF TRUTH) ---')
        pmsUnits.forEach(u => {
          const features = Array.isArray(u.features) && u.features.length ? ` [${u.features.join(', ')}]` : ''
          const vacancy = u.vacant_count > 0 ? `${u.vacant_count} vacant ($${(u.vacant_count * (u.street_rate || 0)).toLocaleString()}/mo revenue gap)` : 'FULL — do NOT target'
          lines.push(`${u.unit_type}: $${u.street_rate || '?'}/mo${u.web_rate ? `, web $${u.web_rate}` : ''} — ${vacancy}${features}`)
        })
        if (occPct) lines.push(`Overall occupancy: ${occPct}%`)
        lines.push(`Total vacant: ${totalVacant} units | Monthly revenue gap: $${monthlyGap.toLocaleString()}`)

        // Occupancy-based strategy directive (Section 5.1)
        const occ = parseFloat(occPct) || 0
        if (occ < 80) {
          lines.push('\nSTRATEGY: AGGRESSIVE DEMAND — Under 80% occupancy. Broad keywords, strong offer terms, volume over efficiency.')
          lines.push('Generate keywords covering ALL available unit types. Include move-in incentive keywords.')
        } else if (occ < 90) {
          const priorityTypes = pmsUnits.filter(u => u.vacant_count > 0).sort((a, b) => b.vacant_count - a.vacant_count).slice(0, 3)
          lines.push(`\nSTRATEGY: TARGETED BY UNIT TYPE — 80-90% occupancy. Focus on underperforming types.`)
          lines.push(`Priority unit types to fill: ${priorityTypes.map(u => `${u.unit_type} (${u.vacant_count} vacant)`).join(', ')}`)
          lines.push('Weight keywords toward these specific unit sizes/types. Optimize for CPMI.')
        } else if (occ < 95) {
          lines.push('\nSTRATEGY: SELECTIVE + RATE OPTIMIZATION — 90-95% occupancy. Fill specific vacancies only.')
          lines.push('Generate precise, long-tail keywords for remaining vacant unit types. Reduce broad match terms.')
        } else {
          lines.push('\nSTRATEGY: REVENUE MAXIMIZATION — 95%+ occupancy. Minimal acquisition keywords.')
          lines.push('Focus on brand defense, waitlist/coming-soon, and high-value unit keywords only.')
        }

        if (pmsSpecials.length) {
          lines.push('\nActive promotions: ' + pmsSpecials.map(s => {
            const disc = s.discount_type === 'percent' ? `${s.discount_value}% off` : s.discount_type === 'months_free' ? `${s.discount_value} mo free` : `$${s.discount_value} off`
            return `${s.name} (${disc}${s.applies_to?.length ? ` on ${s.applies_to.join(', ')}` : ''})`
          }).join('; '))
          lines.push('Include keywords that align with these active promotions.')
        }

        // Anti-patterns (Section 9)
        lines.push('\nRULES:')
        lines.push('- NEVER generate generic "Self Storage Near You" — always reference specific unit types/sizes the facility has available')
        lines.push('- NEVER target keywords for unit types at 100% occupancy')
        lines.push('- Weight keywords toward unit types with the largest revenue gap')
        lines.push('- Include location-specific keywords (city, neighborhood, landmarks)')
      }
    } catch { /* PMS data is optional enrichment */ }

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
