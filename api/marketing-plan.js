import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from './_auth.js'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co', 'https://www.stowstack.co',
  'http://localhost:5173', 'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

// Portfolio optimizer scoring logic (pulled from PortfolioOptimizerView)
const OCCUPANCY_MIDPOINTS = {
  'below-60': 50, '60-75': 67, '75-85': 80, '85-95': 90, 'above-95': 97,
}

function getSpendRecommendation(facility) {
  const occ = OCCUPANCY_MIDPOINTS[facility.occupancy_range] ?? 75
  const rating = parseFloat(facility.google_rating) || 0
  const reviewCount = facility.review_count || 0

  // Vacancy-based budget weight
  let budgetTier, monthlyBudget, reasoning = []
  if (occ < 60) {
    budgetTier = 'aggressive'
    monthlyBudget = { min: 2000, max: 5000 }
    reasoning.push('Low occupancy — aggressive spend to fill units fast')
  } else if (occ < 75) {
    budgetTier = 'growth'
    monthlyBudget = { min: 1500, max: 3500 }
    reasoning.push('Moderate vacancy — strong growth opportunity')
  } else if (occ < 85) {
    budgetTier = 'steady'
    monthlyBudget = { min: 800, max: 2000 }
    reasoning.push('Healthy occupancy — steady spend to maintain and grow')
  } else if (occ < 95) {
    budgetTier = 'optimize'
    monthlyBudget = { min: 500, max: 1200 }
    reasoning.push('High occupancy — optimize for premium units and rate increases')
  } else {
    budgetTier = 'maintain'
    monthlyBudget = { min: 300, max: 800 }
    reasoning.push('Near full — minimal spend, focus on retention and rate optimization')
  }

  // Channel allocation
  const channels = {
    google_search: occ < 80 ? 40 : 30,
    meta_ads: occ < 80 ? 30 : 25,
    google_display: 10,
    tiktok_organic: 10,
    google_business: 10,
  }

  if (rating >= 4.5 && reviewCount > 50) {
    reasoning.push(`Strong reputation (${rating}★, ${reviewCount} reviews) — leverage social proof in ads`)
  } else if (rating < 4.0) {
    reasoning.push('Below 4★ rating — prioritize reputation management before heavy ad spend')
  }

  if (facility.biggest_issue) {
    reasoning.push(`Operator-identified challenge: "${facility.biggest_issue}" — plan should address this directly`)
  }

  return { budgetTier, monthlyBudget, channels, reasoning }
}

const PLAN_SYSTEM_PROMPT = `You are a sharp, experienced self-storage marketing strategist who has scaled dozens of independent facilities from underperforming to full occupancy. You think like an operator — you understand that every dollar of ad spend needs to justify itself, that the real competition isn't Public Storage but the customer's inertia, and that the best marketing makes the phone ring with people who are ready to sign a lease this week.

You do not produce generic marketing advice. Every insight must be grounded in the specific facility data you're given. If they're at 70% occupancy with a 4.8-star rating, you know exactly what that means and what to do about it. If they have 15 vacant 10x10s and 0 vacant 5x5s, you don't waste a single keyword on 5x5s. If their biggest issue is "competing with Public Storage down the street," you craft a strategy that turns that into an advantage.

Your plans read like they were written by someone who has actually run storage facilities — not a consultant who Googled "self storage marketing."

Return ONLY valid JSON — no markdown, no commentary outside the JSON.

CRITICAL: tab_directives MUST be the FIRST field. These are the single most important output — they are the specific, actionable instructions that appear in each creative tool to guide the operator.

{
  "tab_directives": {
    "creative": "2-3 sentences. Be specific: which ad angles to run, which audiences to write for, what emotional hook to lead with, and why — tied directly to the facility's bottleneck. Reference actual data (rating, occupancy, location).",
    "google_ads": "2-3 sentences. Name specific keyword themes, which unit types to bid on, how aggressive to be, and what the search intent strategy should be. Reference vacancy data if available.",
    "tiktok": "2-3 sentences. What specific organic content to create this week — not vague categories but actual video concepts. What makes this facility's TikTok presence different from generic storage content.",
    "video": "2-3 sentences. What specific video to generate and why. What visual mood, what story it tells in 5 seconds without words. How it connects to the broader campaign.",
    "landing_pages": "2-3 sentences. What landing pages to build, which audience each serves, and what the conversion path looks like. What makes someone click 'Reserve' instead of bouncing."
  },
  "summary": "3-4 sentence strategic overview. Not a list of tactics — a thesis. What is the core insight about this facility's market position, and what is the one big move that will change their trajectory?",
  "bottleneck_analysis": "2-3 sentences. Diagnose the real problem — not just 'low occupancy' but WHY. Is it awareness? Pricing? Wrong audience? Bad reputation? Competition? Be honest and specific.",
  "target_audiences": [
    { "segment": "specific name", "description": "who they actually are — age, situation, what's happening in their life right now", "messaging_angle": "the exact emotional hook that makes them act", "channels": ["specific platforms"] }
  ],
  "messaging_pillars": [
    { "pillar": "theme name", "rationale": "why this works for THIS facility specifically", "example_headline": "an actual headline you'd run — not placeholder text" }
  ],
  "channel_strategy": [
    { "channel": "platform", "budget_pct": 30, "objective": "what we're trying to accomplish here specifically", "tactics": ["concrete actions, not vague strategies"] }
  ],
  "content_calendar": [
    { "week": 1, "focus": "specific theme tied to the strategy", "deliverables": ["exact pieces to produce"], "channels": ["where each goes"] }
  ],
  "kpis": [
    { "metric": "name", "target": "specific number", "timeframe": "when" }
  ],
  "quick_wins": ["things that can be done TODAY that will have immediate impact — not 'create social media accounts'"]
}`

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!requireAdmin(req, res)) return

  // GET — fetch latest plan for a facility
  if (req.method === 'GET') {
    const { facilityId } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })
    try {
      const plans = await query(
        `SELECT * FROM marketing_plans WHERE facility_id = $1 ORDER BY created_at DESC LIMIT 1`, [facilityId]
      )
      return res.status(200).json({ plan: plans[0] || null })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — generate a new marketing plan
  if (req.method === 'POST') {
    const { facilityId, playbooks } = req.body || {}
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

    try {
      // Gather all facility data
      const [facilities, contextDocs, placesData, scrapeData, pmsUnits, pmsSnapshot] = await Promise.all([
        query(`SELECT * FROM facilities WHERE id = $1`, [facilityId]),
        query(`SELECT type, title, content FROM facility_context WHERE facility_id = $1 ORDER BY created_at DESC`, [facilityId]),
        query(`SELECT photos, reviews FROM places_data WHERE facility_id = $1 ORDER BY fetched_at DESC LIMIT 1`, [facilityId]),
        query(`SELECT url, metadata FROM assets WHERE facility_id = $1 AND source = 'website_scrape' LIMIT 5`, [facilityId]),
        query(`SELECT unit_type, total_count, occupied_count, (total_count - occupied_count) as vacant_count, street_rate, web_rate, features FROM facility_pms_units WHERE facility_id = $1 ORDER BY total_count DESC`, [facilityId]).catch(() => []),
        query(`SELECT occupancy_pct, total_units, occupied_units, move_ins_mtd, move_outs_mtd FROM facility_pms_snapshots WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 1`, [facilityId]).catch(() => []),
      ])

      if (!facilities.length) return res.status(404).json({ error: 'Facility not found' })
      const facility = facilities[0]

      // Build spend recommendation
      const spendRec = getSpendRecommendation(facility)

      // Build context for Claude
      const lines = [
        `Facility: ${facility.name}`,
        `Location: ${facility.location}`,
        `Occupancy: ${facility.occupancy_range}`,
        `Total units: ${facility.total_units || 'unknown'}`,
        `Biggest challenge: ${facility.biggest_issue || 'not specified'}`,
      ]

      if (facility.google_rating) lines.push(`Google Rating: ${facility.google_rating}★ (${facility.review_count} reviews)`)
      if (facility.google_address) lines.push(`Address: ${facility.google_address}`)
      if (facility.website) lines.push(`Website: ${facility.website}`)
      if (facility.hours) lines.push(`Hours: ${JSON.stringify(facility.hours)}`)
      if (facility.notes) lines.push(`Operator notes: ${facility.notes}`)

      // Add business context docs
      if (contextDocs.length) {
        lines.push('\n--- BUSINESS CONTEXT DOCUMENTS ---')
        for (const doc of contextDocs) {
          lines.push(`[${doc.type}] ${doc.title}: ${(doc.content || '').slice(0, 500)}`)
        }
      }

      // Add review snippets
      const reviews = placesData[0]?.reviews
      if (reviews?.length) {
        lines.push('\n--- CUSTOMER REVIEWS ---')
        reviews.slice(0, 5).forEach(r => lines.push(`${r.rating}★: "${(r.text || '').slice(0, 150)}"`))
      }

      // Add PMS unit data if available
      if (pmsUnits?.length) {
        lines.push('\n--- UNIT INVENTORY (from PMS) ---')
        const totalUnits = pmsUnits.reduce((s, u) => s + (u.total_count || 0), 0)
        const totalVacant = pmsUnits.reduce((s, u) => s + (u.vacant_count || 0), 0)
        const monthlyGap = pmsUnits.reduce((s, u) => s + ((u.vacant_count || 0) * (u.street_rate || 0)), 0)
        lines.push(`Total: ${totalUnits} units, ${totalVacant} vacant ($${monthlyGap.toLocaleString()}/mo revenue gap)`)
        pmsUnits.forEach(u => {
          const features = Array.isArray(u.features) && u.features.length ? ` [${u.features.join(', ')}]` : ''
          lines.push(`  ${u.unit_type}: ${u.total_count} total, ${u.vacant_count} vacant, $${u.street_rate || '?'}/mo${u.web_rate ? `, web $${u.web_rate}` : ''}${features}`)
        })
        if (pmsSnapshot?.[0]) {
          const snap = pmsSnapshot[0]
          if (snap.occupancy_pct) lines.push(`Overall occupancy: ${snap.occupancy_pct}%`)
          if (snap.move_ins_mtd || snap.move_outs_mtd) lines.push(`This month: ${snap.move_ins_mtd || 0} move-ins, ${snap.move_outs_mtd || 0} move-outs`)
        }
      }

      // Add playbook context if assigned
      if (playbooks?.length) {
        lines.push(`\n--- ASSIGNED SEASONAL PLAYBOOKS ---`)
        lines.push(`Active playbooks: ${playbooks.join(', ')}`)
        lines.push('Incorporate these seasonal strategies into the plan.')
        if (playbooks.includes('b2b-commercial')) {
          lines.push('B2B/Commercial focus: Target contractors, small businesses, e-commerce sellers, medical/legal offices needing document storage, restaurants needing equipment/inventory overflow, real estate agents staging furniture. Emphasize long-term leases, bulk discounts, invoice billing, after-hours access, and larger unit availability.')
        }
      }

      lines.push(`\n--- BUDGET RECOMMENDATION ---`)
      lines.push(`Tier: ${spendRec.budgetTier} ($${spendRec.monthlyBudget.min}-$${spendRec.monthlyBudget.max}/month)`)
      lines.push(`Channel allocation: ${Object.entries(spendRec.channels).map(([k,v]) => `${k}: ${v}%`).join(', ')}`)
      spendRec.reasoning.forEach(r => lines.push(`- ${r}`))

      const client = new Anthropic({ apiKey })
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: PLAN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Generate a marketing plan for this facility. Every word should be earned — no filler, no generic advice. Reference the actual data: their rating, their occupancy, their location, their reviews, their unit types. If you can swap in any other facility's name and the plan still makes sense, it's too generic. 2-3 target audiences, 3 messaging pillars, 4-week calendar, 3-4 KPIs, 3 quick wins. tab_directives FIRST.\n\n${lines.join('\n')}` }],
      })

      let raw = message.content[0].text.trim()
      let planJson
      try {
        planJson = JSON.parse(raw)
      } catch {
        // Try extracting JSON block
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          try {
            planJson = JSON.parse(match[0])
          } catch {
            // Attempt to repair truncated JSON by closing open brackets
            let repaired = match[0]
            const openBraces = (repaired.match(/\{/g) || []).length
            const closeBraces = (repaired.match(/\}/g) || []).length
            const openBrackets = (repaired.match(/\[/g) || []).length
            const closeBrackets = (repaired.match(/\]/g) || []).length
            // Trim trailing incomplete values
            repaired = repaired.replace(/,\s*$/, '')
            repaired = repaired.replace(/,\s*"[^"]*$/, '')
            for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']'
            for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}'
            planJson = JSON.parse(repaired)
          }
        } else {
          throw new Error('Could not parse marketing plan response')
        }
      }

      // Get version number
      const maxVersion = await query(
        `SELECT COALESCE(MAX(version), 0) as v FROM marketing_plans WHERE facility_id = $1`, [facilityId]
      )

      const rows = await query(
        `INSERT INTO marketing_plans (facility_id, version, plan_json, spend_recommendation, assigned_playbooks, generated_from, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
        [
          facilityId,
          maxVersion[0].v + 1,
          JSON.stringify(planJson),
          JSON.stringify(spendRec),
          playbooks || [],
          JSON.stringify({ contextDocs: contextDocs.length, hasReviews: !!reviews?.length, occupancy: facility.occupancy_range }),
        ]
      )

      // Archive previous active plans
      await query(
        `UPDATE marketing_plans SET status = 'archived' WHERE facility_id = $1 AND id != $2 AND status = 'active'`,
        [facilityId, rows[0].id]
      )

      return res.status(200).json({ plan: rows[0] })
    } catch (err) {
      console.error('Marketing plan generation failed:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
