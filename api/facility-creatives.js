import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin, isAdmin } from './_auth.js'
import { getCreativeContext } from './_creative.js'

export const config = { maxDuration: 60 }

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
  return isAdmin(req)
}

/* ═══════════════════════════════════════════════════════════════
   FACILITY CONTEXT BUILDER
   Pulls facility data, places data, AND onboarding wizard data
   to give Claude the richest possible context for copy generation.
   ═══════════════════════════════════════════════════════════════ */

async function buildFacilityContext(facilityId) {
  // Fetch facility + places data + onboarding data + PMS data in parallel
  const [facilities, onboardingRows, pmsUnits, pmsSnapshots, pmsSpecials] = await Promise.all([
    query(
      `SELECT f.*, pd.photos, pd.reviews
       FROM facilities f
       LEFT JOIN LATERAL (
         SELECT photos, reviews FROM places_data
         WHERE facility_id = f.id ORDER BY fetched_at DESC LIMIT 1
       ) pd ON true
       WHERE f.id = $1`,
      [facilityId]
    ),
    query(
      `SELECT co.steps FROM client_onboarding co
       JOIN clients c ON c.id = co.client_id
       WHERE c.facility_id = $1
       ORDER BY co.updated_at DESC LIMIT 1`,
      [facilityId]
    ),
    query(
      `SELECT unit_type, total_count, occupied_count, (total_count - occupied_count) AS vacant_count, street_rate, web_rate, actual_avg_rate, features
       FROM facility_pms_units WHERE facility_id = $1 ORDER BY total_count DESC`,
      [facilityId]
    ).catch(() => []),
    query(
      `SELECT occupancy_pct, actual_revenue, gross_potential, delinquency_pct, move_ins_mtd, move_outs_mtd
       FROM facility_pms_snapshots WHERE facility_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
      [facilityId]
    ).catch(() => []),
    query(
      `SELECT name, description, discount_type, discount_value, applies_to
       FROM facility_pms_specials WHERE facility_id = $1 AND active = true`,
      [facilityId]
    ).catch(() => []),
  ])

  if (!facilities.length) return null
  const f = facilities[0]
  const onboarding = onboardingRows[0]?.steps || null

  // Core facility info
  const lines = [`Facility: ${f.name}`, `Location: ${f.location}`]
  if (f.google_rating) lines.push(`Google Rating: ${f.google_rating} stars (${f.review_count} reviews)`)
  if (f.google_address) lines.push(`Full Address: ${f.google_address}`)
  if (f.reviews?.length) {
    const snippets = f.reviews.slice(0, 3).map(r => `"${r.text.slice(0, 150)}"`).join('\n')
    lines.push(`Top Customer Reviews:\n${snippets}`)
  }
  if (f.photos?.length) lines.push(`Photos available: ${f.photos.length}`)
  if (f.occupancy_range) lines.push(`Current occupancy: ${f.occupancy_range}`)
  if (f.biggest_issue) lines.push(`Operator's biggest challenge: ${f.biggest_issue}`)
  if (f.total_units) lines.push(`Total units: ${f.total_units}`)
  if (f.google_phone) lines.push(`Phone: ${f.google_phone}`)
  if (f.website) lines.push(`Website: ${f.website}`)

  // Onboarding wizard enrichment
  if (onboarding) {
    // Facility details (brand voice, selling points)
    const fd = onboarding.facilityDetails?.data
    if (fd) {
      if (fd.brandDescription) lines.push(`\nBrand Description: ${fd.brandDescription}`)
      if (fd.sellingPoints?.filter(s => s.trim()).length) {
        lines.push(`Key Selling Points: ${fd.sellingPoints.filter(s => s.trim()).join(', ')}`)
      }
      if (fd.brandColors) lines.push(`Brand Colors: ${fd.brandColors}`)
    }

    // Target demographics
    const td = onboarding.targetDemographics?.data
    if (td) {
      const parts = []
      if (td.ageMin && td.ageMax) parts.push(`ages ${td.ageMin}-${td.ageMax}`)
      if (td.radiusMiles) parts.push(`within ${td.radiusMiles} miles`)
      if (td.incomeLevel) parts.push(`${td.incomeLevel} income`)
      if (td.renterVsOwner) parts.push(`${td.renterVsOwner}`)
      if (parts.length) lines.push(`Target Audience: ${parts.join(', ')}`)
    }

    // Unit mix & pricing
    const um = onboarding.unitMix?.data
    if (um?.units?.length) {
      const unitLines = um.units
        .filter(u => u.type)
        .map(u => {
          const parts = [u.type]
          if (u.size) parts.push(u.size)
          if (u.monthlyRate) parts.push(`$${u.monthlyRate}/mo`)
          if (u.availableCount) parts.push(`${u.availableCount} available`)
          return parts.join(' — ')
        })
      if (unitLines.length) lines.push(`\nUnit Mix:\n${unitLines.join('\n')}`)
      if (um.specials) lines.push(`Current Specials/Promotions: ${um.specials}`)
    }

    // Competitor intel
    const ci = onboarding.competitorIntel?.data
    if (ci?.competitors?.length) {
      const compLines = ci.competitors
        .filter(c => c.name)
        .map(c => {
          const parts = [c.name]
          if (c.distance) parts.push(c.distance)
          if (c.pricingNotes) parts.push(c.pricingNotes)
          return parts.join(' — ')
        })
      if (compLines.length) lines.push(`\nCompetitors:\n${compLines.join('\n')}`)
      if (ci.differentiation) lines.push(`Key Differentiator: ${ci.differentiation}`)
    }

    // Ad preferences (tone, goals, budget)
    const ap = onboarding.adPreferences?.data
    if (ap) {
      if (ap.toneOfVoice) lines.push(`\nPreferred Tone: ${ap.toneOfVoice}`)
      if (ap.primaryGoal) lines.push(`Primary Ad Goal: ${ap.primaryGoal}`)
      if (ap.monthlyBudget) lines.push(`Monthly Budget: ${ap.monthlyBudget}`)
      if (ap.pastAdExperience) lines.push(`Past Ad Experience: ${ap.pastAdExperience}`)
      if (ap.notes) lines.push(`Operator Notes: ${ap.notes}`)
    }
  }

  // ── PMS Data (from storEDGE imports) — THE SINGLE SOURCE OF TRUTH ──
  if (pmsUnits.length) {
    const totalUnits = pmsUnits.reduce((s, u) => s + (u.total_count || 0), 0)
    const totalOccupied = pmsUnits.reduce((s, u) => s + (u.occupied_count || 0), 0)
    const totalVacant = totalUnits - totalOccupied
    const overallOccupancy = totalUnits > 0 ? ((totalOccupied / totalUnits) * 100).toFixed(1) : null
    const grossPotential = pmsUnits.reduce((s, u) => s + ((u.total_count || 0) * (u.street_rate || 0)), 0)
    const actualRevenue = pmsUnits.reduce((s, u) => s + ((u.occupied_count || 0) * (u.actual_avg_rate || u.street_rate || 0)), 0)
    const revenueLost = grossPotential - actualRevenue

    lines.push('\n═══ storEDGE PMS DATA (CANONICAL SOURCE OF TRUTH) ═══')
    lines.push('CRITICAL: This data comes directly from the operator\'s PMS. All recommendations MUST be grounded in these numbers. Never contradict PMS data.')

    // Unit-level breakdown with occupancy context
    lines.push('\nUNIT INVENTORY (by type):')
    pmsUnits.forEach(u => {
      const occPct = u.total_count > 0 ? ((u.occupied_count / u.total_count) * 100).toFixed(0) : '0'
      const features = Array.isArray(u.features) && u.features.length ? ` [${u.features.join(', ')}]` : ''
      const revenueGap = u.vacant_count * (u.street_rate || 0)
      lines.push(`  ${u.unit_type}: ${u.occupied_count}/${u.total_count} occupied (${occPct}%), ${u.vacant_count} vacant, street $${u.street_rate || '?'}/mo${u.web_rate ? `, web $${u.web_rate}/mo` : ''}${u.actual_avg_rate ? `, avg actual $${u.actual_avg_rate}/mo` : ''}${features}${revenueGap > 0 ? ` → $${revenueGap.toLocaleString()}/mo revenue opportunity` : ''}`)
    })

    // Facility-level summary
    lines.push(`\nFACILITY SUMMARY: ${overallOccupancy}% occupied, ${totalVacant} vacant units, $${actualRevenue.toLocaleString()}/mo actual revenue, $${grossPotential.toLocaleString()}/mo gross potential, $${revenueLost.toLocaleString()}/mo revenue gap`)

    // OCCUPANCY-BASED STRATEGY DIRECTIVE (from Section 5.1)
    const occ = parseFloat(overallOccupancy) || 0
    lines.push('\n--- STRATEGIC DIRECTIVE (based on occupancy level) ---')
    if (occ < 80) {
      lines.push(`STRATEGY: AGGRESSIVE DEMAND GENERATION. At ${occ}% occupancy, this facility needs volume. Use broad targeting, strong offers, price-anchored headlines. Lead with availability and value. Budget should scale up — CPMI target is secondary to filling units.`)
    } else if (occ < 90) {
      lines.push(`STRATEGY: TARGETED DEMAND GENERATION. At ${occ}% occupancy, focus on underperforming unit types specifically. Don't run generic "storage available" — target the specific unit sizes with vacancy.`)
      const underperforming = pmsUnits.filter(u => u.total_count > 0 && ((u.occupied_count / u.total_count) * 100) < 80)
      if (underperforming.length) {
        lines.push(`Priority unit types to fill: ${underperforming.map(u => `${u.unit_type} (${u.vacant_count} vacant)`).join(', ')}`)
      }
    } else if (occ < 95) {
      lines.push(`STRATEGY: SELECTIVE + RATE OPTIMIZATION. At ${occ}% occupancy, only generate demand for specific remaining vacancies. Rate optimization becomes the primary revenue lever. Consider testing rate increases on high-occupancy unit types.`)
      const highOcc = pmsUnits.filter(u => u.total_count > 0 && ((u.occupied_count / u.total_count) * 100) >= 93)
      if (highOcc.length) {
        lines.push(`Rate increase candidates (93%+ occupied): ${highOcc.map(u => `${u.unit_type} at ${((u.occupied_count / u.total_count) * 100).toFixed(0)}%`).join(', ')}`)
      }
    } else {
      lines.push(`STRATEGY: REVENUE MAXIMIZATION. At ${occ}% occupancy, MINIMAL OR ZERO acquisition ad spend. Focus on rate increases, waitlist strategy, premium positioning. Do NOT spend money driving demand for units that don't exist.`)
    }

    // ANTI-PATTERNS
    lines.push('\n--- RULES (NEVER VIOLATE) ---')
    lines.push('- NEVER advertise a unit type that is at 100% occupancy')
    lines.push('- NEVER use generic "Self Storage Near You" — always reference specific unit types, sizes, and pricing from the PMS data above')
    lines.push('- NEVER present occupancy without unit-type breakdown')
    lines.push('- All pricing in ads/landing pages MUST match current PMS rates shown above')
    lines.push('- Every recommendation must connect to revenue impact in dollars')
    lines.push('- Speak in operator language: revenue, move-ins, cost per move-in — NOT impressions, CTR, CPM')
  }

  if (pmsSnapshots.length) {
    const s = pmsSnapshots[0]
    if (s.move_ins_mtd || s.move_outs_mtd) {
      const netMoveIns = (s.move_ins_mtd || 0) - (s.move_outs_mtd || 0)
      lines.push(`\nMonth-to-date activity: ${s.move_ins_mtd} move-ins, ${s.move_outs_mtd} move-outs (net ${netMoveIns >= 0 ? '+' : ''}${netMoveIns})`)
    }
    if (s.delinquency_pct) lines.push(`Delinquency: ${s.delinquency_pct}%`)
  }

  if (pmsSpecials.length) {
    lines.push('\nACTIVE PROMOTIONS (from PMS — use these exact offers in ad copy):')
    pmsSpecials.forEach(sp => {
      const discount = sp.discount_type === 'percent' ? `${sp.discount_value}% off` : sp.discount_type === 'months_free' ? `${sp.discount_value} month(s) free` : `$${sp.discount_value} off`
      const appliesTo = sp.applies_to?.length ? ` (applies to: ${sp.applies_to.join(', ')})` : ''
      lines.push(`  ${sp.name}: ${discount}${appliesTo}${sp.description ? ` — ${sp.description}` : ''}`)
    })
  }

  return { facility: f, context: lines.join('\n'), onboarding }
}

/* ═══════════════════════════════════════════════════════════════
   SYSTEM PROMPTS — one per generation type
   ═══════════════════════════════════════════════════════════════ */

const SYSTEM_PROMPTS = {
  meta_feed: `You are an expert Meta (Facebook/Instagram) ad copywriter specializing in self-storage facilities. You write high-converting ad copy for independent storage operators targeting local customers.

You produce exactly 4 ad variations, each with a distinct angle. Return ONLY valid JSON — no markdown, no text outside the JSON.

ANGLES TO USE (one per variation):
1. social_proof — lead with real rating/reviews to build trust
2. convenience — emphasize location, ease of access, no hassle
3. urgency — limited units, act now, don't lose your spot
4. lifestyle — emotional hook, peace of mind, reclaim your space

META AD FORMAT RULES:
- primaryText: 80-125 characters ideal. This is the main body shown above the image. Conversational, direct, no fluff.
- headline: MAX 40 characters. Bold claim or offer. No punctuation at end.
- description: MAX 30 characters. Supporting line under headline.
- cta: one of — "Learn More", "Get Quote", "Book Now", "Contact Us", "Sign Up"
- Do NOT use all-caps words except CTA-style words like "FREE"
- Use local city/neighborhood when available to increase relevance
- If rating is provided, use the actual number (e.g. "4.8-star")
- If competitor data is provided, use it to position the facility as the better choice WITHOUT naming competitors
- If unit pricing is provided, reference specific deals (e.g. "Starting at $49/mo")
- Match the operator's preferred tone if specified

OUTPUT STRUCTURE:
{
  "variations": [
    {
      "angle": "social_proof",
      "angleLabel": "Social Proof",
      "primaryText": "",
      "headline": "",
      "description": "",
      "cta": "",
      "targetingNote": ""
    }
  ]
}`,

  google_search: `You are an expert Google Ads copywriter specializing in self-storage facilities. You write high-converting Responsive Search Ads (RSA) for independent storage operators.

You produce a SINGLE RSA ad group with 15 headlines and 4 descriptions. Return ONLY valid JSON — no markdown, no text outside the JSON.

GOOGLE RSA RULES:
- headlines: exactly 15 unique headlines, each MAX 30 characters
  - Mix keyword-focused ("Self Storage in [City]"), benefit-focused ("24/7 Access"), offer-focused ("First Month Free"), and trust ("4.8★ Rated")
  - At least 3 should include the city/location name
  - At least 2 should include a call to action
  - Include pricing if available
  - Pin suggestions: mark 1-2 headlines as "pin_position": 1 for headlines that must appear in position 1
- descriptions: exactly 4 unique descriptions, each MAX 90 characters
  - Lead with benefits, include call to action
  - At least one should mention specific features (climate-controlled, drive-up, etc.)
  - At least one should include location details
- finalUrl: suggested landing page path (e.g. "/storage/grand-rapids" or just "/")
- sitelinks: 4 sitelink extensions with title (MAX 25 chars) and description (MAX 35 chars)

OUTPUT STRUCTURE:
{
  "adGroup": {
    "name": "",
    "headlines": [
      { "text": "", "pin_position": null }
    ],
    "descriptions": [
      { "text": "" }
    ],
    "finalUrl": "/",
    "sitelinks": [
      { "title": "", "description": "" }
    ],
    "keywords": [""]
  }
}`,

  landing_page: `You are an expert landing page copywriter specializing in self-storage facilities. You write high-converting, section-based landing page content for independent storage operators.

Generate a complete set of landing page sections. Return ONLY valid JSON — no markdown, no text outside the JSON.

Use the facility data, reviews, unit pricing, and competitor info to make every section specific and credible. DO NOT use generic filler copy.

SECTION REQUIREMENTS:
1. hero — the top banner
   - headline: 40-60 chars, bold and specific (use city name). No period at end.
   - subheadline: 80-120 chars, benefit-driven supporting line
   - badgeText: short trust signal like "4.8★ Rated" or "Serving [City] Since 2005"
   - ctaText: 2-4 words, action-oriented
   - ctaUrl: "#cta"

2. trust_bar — horizontal strip of trust signals
   - items: 4-5 items, each with icon (star|shield|clock|check|truck|building) and text (MAX 20 chars each)

3. features — 3-6 key facility features
   - headline: section heading
   - items: each with icon (shield|clock|truck|star|building|check), title (MAX 25 chars), desc (40-80 chars)

4. unit_types — pricing cards from real unit mix data
   - headline: section heading
   - units: each with name, size, price (format: "$XX"), features (2-3 per unit)

5. testimonials — social proof from real reviews
   - headline: section heading
   - items: each with name, text (rephrase/shorten real reviews to 60-100 chars), metric (optional, e.g. "5-star review")

6. faq — common questions
   - headline: "Frequently Asked Questions"
   - items: 5-7 Q&A pairs relevant to the facility (hours, access, security, move-in, pricing)

7. cta — bottom conversion section
   - headline: action-oriented, 30-50 chars
   - subheadline: urgency or benefit line, 60-100 chars
   - ctaText: "Reserve Your Unit" or similar
   - ctaUrl: "#"

OUTPUT STRUCTURE:
{
  "sections": [
    { "section_type": "hero", "sort_order": 0, "config": { ... } },
    { "section_type": "trust_bar", "sort_order": 1, "config": { ... } },
    { "section_type": "features", "sort_order": 2, "config": { ... } },
    { "section_type": "unit_types", "sort_order": 3, "config": { ... } },
    { "section_type": "testimonials", "sort_order": 4, "config": { ... } },
    { "section_type": "faq", "sort_order": 5, "config": { ... } },
    { "section_type": "cta", "sort_order": 6, "config": { ... } }
  ],
  "meta_title": "MAX 60 chars — [Facility Name] | Self Storage in [City]",
  "meta_description": "MAX 155 chars — include city, key benefit, and CTA"
}`,

  email_drip: `You are an expert email marketing copywriter specializing in self-storage follow-up sequences. You write conversion-focused nurture emails for independent storage operators.

Generate a 4-email drip sequence for a facility. Each email should build on the previous one, escalating from value-add to urgency. Return ONLY valid JSON.

SEQUENCE STRUCTURE:
1. Email 1 (Day 2) — Warm follow-up: reference their inquiry, share one unique facility benefit
2. Email 2 (Day 5) — Value add: share a useful tip about moving/storage, subtly position the facility
3. Email 3 (Day 10) — Social proof: lead with reviews/rating, address common objections
4. Email 4 (Day 21) — Last chance: urgency angle, limited availability, time-sensitive offer

EMAIL RULES:
- subject: MAX 50 characters. No spam trigger words. Personalize with city or facility name.
- preheader: MAX 80 characters. Complements subject line.
- body: 80-150 words. Conversational, direct, scannable. Short paragraphs (2-3 sentences max).
- ctaText: clear action button text (2-4 words)
- ctaUrl: "#reserve" (placeholder)
- Use the operator's preferred tone if specified
- Reference real facility features, pricing, and reviews where relevant
- Include the facility name and city naturally

OUTPUT STRUCTURE:
{
  "sequence": [
    {
      "step": 1,
      "delayDays": 2,
      "subject": "",
      "preheader": "",
      "body": "",
      "ctaText": "",
      "ctaUrl": "#reserve",
      "label": "Warm follow-up"
    }
  ]
}`
}

/* ═══════════════════════════════════════════════════════════════
   GENERATION LOGIC
   ═══════════════════════════════════════════════════════════════ */

function parseJsonResponse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse AI response as JSON')
    return JSON.parse(match[0])
  }
}

async function generateWithClaude(systemPrompt, userMessage, apiKey, platform) {
  const creativeContext = getCreativeContext(platform || 'meta')
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `${systemPrompt}\n\n${creativeContext}`,
    messages: [{ role: 'user', content: userMessage }],
  })
  return parseJsonResponse(message.content[0].text.trim())
}

async function generateMetaAds(facilityId, context, feedback, apiKey) {
  let feedbackNote = ''
  if (feedback) feedbackNote = `\n\nPREVIOUS FEEDBACK FROM REVIEWER (incorporate this):\n${feedback}`

  const userMessage = `Generate 4 Meta ad variations for this self-storage facility. Use the real data provided — especially the rating, review snippets, unit pricing, and competitor positioning — to make the copy specific and credible.${feedbackNote}

${context}

Return the JSON object with the "variations" array. Nothing else.`

  return generateWithClaude(SYSTEM_PROMPTS.meta_feed, userMessage, apiKey, 'meta')
}

async function generateGoogleRSA(facilityId, context, feedback, apiKey) {
  let feedbackNote = ''
  if (feedback) feedbackNote = `\n\nPREVIOUS FEEDBACK FROM REVIEWER (incorporate this):\n${feedback}`

  const userMessage = `Generate a Google Responsive Search Ad for this self-storage facility. Use real data — ratings, pricing, location, and features — for specific, high-performing ad copy.${feedbackNote}

${context}

Return the JSON object with the "adGroup". Nothing else.`

  return generateWithClaude(SYSTEM_PROMPTS.google_search, userMessage, apiKey, 'google_search')
}

async function generateLandingPageCopy(facilityId, context, feedback, apiKey) {
  let feedbackNote = ''
  if (feedback) feedbackNote = `\n\nPREVIOUS FEEDBACK FROM REVIEWER (incorporate this):\n${feedback}`

  const userMessage = `Generate complete landing page content for this self-storage facility. Use real data to make every section specific and credible. Do NOT use generic placeholder copy.${feedbackNote}

${context}

Return the JSON object with the "sections" array, "meta_title", and "meta_description". Nothing else.`

  return generateWithClaude(SYSTEM_PROMPTS.landing_page, userMessage, apiKey, 'meta')
}

async function generateEmailDrip(facilityId, context, feedback, apiKey) {
  let feedbackNote = ''
  if (feedback) feedbackNote = `\n\nPREVIOUS FEEDBACK FROM REVIEWER (incorporate this):\n${feedback}`

  const userMessage = `Generate a 4-email drip sequence for this self-storage facility. Use real data — facility name, city, pricing, reviews — to make the emails specific and personal.${feedbackNote}

${context}

Return the JSON object with the "sequence" array. Nothing else.`

  return generateWithClaude(SYSTEM_PROMPTS.email_drip, userMessage, apiKey, 'meta')
}

/* ═══════════════════════════════════════════════════════════════
   PERSISTENCE HELPERS
   ═══════════════════════════════════════════════════════════════ */

async function getOrCreateBrief(facilityId, facility, context, platforms) {
  const existingBriefs = await query(
    `SELECT id, version FROM creative_briefs WHERE facility_id = $1 ORDER BY version DESC LIMIT 1`,
    [facilityId]
  )

  if (existingBriefs.length) return existingBriefs[0].id

  const newBrief = await query(
    `INSERT INTO creative_briefs (facility_id, brief_json, platform_recommendation, status)
     VALUES ($1, $2, $3, 'draft') RETURNING id`,
    [facilityId, JSON.stringify({ facility: facility.name, location: facility.location, context }), platforms]
  )
  return newBrief[0].id
}

async function getNextVersion(facilityId) {
  const maxVersion = await query(
    `SELECT COALESCE(MAX(version), 0) as max_v FROM ad_variations WHERE facility_id = $1`,
    [facilityId]
  )
  return maxVersion[0].max_v + 1
}

async function insertVariations(variations, facilityId, briefId, platform, format, nextVersion) {
  const inserted = []
  for (const v of variations) {
    const angle = v.angle || v.name || platform
    const rows = await query(
      `INSERT INTO ad_variations
        (facility_id, brief_id, platform, format, angle, content_json, status, version)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING *`,
      [facilityId, briefId, platform, format, angle, JSON.stringify(v), nextVersion]
    )
    inserted.push(rows[0])
  }
  return inserted
}

/* ═══════════════════════════════════════════════════════════════
   HANDLER
   ═══════════════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const facilityId = req.query.facilityId || req.body?.facilityId

  // ── GET — fetch all ad variations + briefs for a facility ──
  if (req.method === 'GET') {
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    try {
      const [variations, briefs] = await Promise.all([
        query(
          `SELECT * FROM ad_variations WHERE facility_id = $1 ORDER BY created_at DESC`,
          [facilityId]
        ),
        query(
          `SELECT * FROM creative_briefs WHERE facility_id = $1 ORDER BY created_at DESC`,
          [facilityId]
        ),
      ])
      return res.status(200).json({ variations, briefs })
    } catch (err) {
      console.error('facility-creatives GET failed:', err.message)
      return res.status(500).json({ error: 'Failed to fetch creatives' })
    }
  }

  // ── POST — generate new content for a facility ──
  if (req.method === 'POST') {
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })

    // Platform type: meta_feed (default), google_search, landing_page, email_drip, all
    const platform = req.body?.platform || 'meta_feed'
    const feedback = req.body?.feedback || null

    try {
      const facilityData = await buildFacilityContext(facilityId)
      if (!facilityData) return res.status(404).json({ error: 'Facility not found' })

      const { facility, context } = facilityData
      const result = { variations: [], landingPage: null, emailSequence: null }

      // Determine which platforms to generate for
      const platforms = platform === 'all'
        ? ['meta_feed', 'google_search', 'landing_page', 'email_drip']
        : [platform]

      const briefId = await getOrCreateBrief(facilityId, facility, context, platforms)
      const nextVersion = await getNextVersion(facilityId)

      // Generate in parallel where possible
      const generators = []

      if (platforms.includes('meta_feed')) {
        generators.push(
          generateMetaAds(facilityId, context, feedback, apiKey)
            .then(async parsed => {
              const inserted = await insertVariations(
                parsed.variations, facilityId, briefId, 'meta_feed', 'static', nextVersion
              )
              result.variations.push(...inserted)
            })
        )
      }

      if (platforms.includes('google_search')) {
        generators.push(
          generateGoogleRSA(facilityId, context, feedback, apiKey)
            .then(async parsed => {
              // Store the entire ad group as a single variation
              const rows = await query(
                `INSERT INTO ad_variations
                  (facility_id, brief_id, platform, format, angle, content_json, status, version)
                 VALUES ($1, $2, 'google_search', 'text', 'rsa', $3, 'draft', $4)
                 RETURNING *`,
                [facilityId, briefId, JSON.stringify(parsed.adGroup), nextVersion]
              )
              result.variations.push(rows[0])
            })
        )
      }

      if (platforms.includes('landing_page')) {
        generators.push(
          generateLandingPageCopy(facilityId, context, feedback, apiKey)
            .then(async parsed => {
              // Store as a single variation with all sections
              const rows = await query(
                `INSERT INTO ad_variations
                  (facility_id, brief_id, platform, format, angle, content_json, status, version)
                 VALUES ($1, $2, 'landing_page', 'sections', 'full_page', $3, 'draft', $4)
                 RETURNING *`,
                [facilityId, briefId, JSON.stringify(parsed), nextVersion]
              )
              result.variations.push(rows[0])
              result.landingPage = parsed
            })
        )
      }

      if (platforms.includes('email_drip')) {
        generators.push(
          generateEmailDrip(facilityId, context, feedback, apiKey)
            .then(async parsed => {
              // Store as a single variation
              const rows = await query(
                `INSERT INTO ad_variations
                  (facility_id, brief_id, platform, format, angle, content_json, status, version)
                 VALUES ($1, $2, 'email_drip', 'email', 'nurture_sequence', $3, 'draft', $4)
                 RETURNING *`,
                [facilityId, briefId, JSON.stringify(parsed), nextVersion]
              )
              result.variations.push(rows[0])
              result.emailSequence = parsed
            })
        )
      }

      await Promise.all(generators)

      // Update facility status
      await query(
        `UPDATE facilities SET status = 'generating' WHERE id = $1 AND status IN ('intake', 'scraped', 'briefed')`,
        [facilityId]
      )

      return res.status(200).json({
        variations: result.variations,
        briefId,
        landingPage: result.landingPage,
        emailSequence: result.emailSequence,
        platforms,
        version: nextVersion,
      })
    } catch (err) {
      console.error('Copy generation failed:', err.message)
      return res.status(500).json({ error: 'Copy generation failed', details: err.message })
    }
  }

  // ── PATCH — update a variation (approve, reject with feedback, edit content) ──
  if (req.method === 'PATCH') {
    const { variationId, status, feedback, content_json, deploy } = req.body || {}
    if (!variationId) return res.status(400).json({ error: 'variationId required' })

    const VALID = ['draft', 'review', 'approved', 'published', 'rejected']
    if (status && !VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    try {
      const updates = []
      const params = []
      let paramIdx = 1

      if (status) {
        updates.push(`status = $${paramIdx++}`)
        params.push(status)
      }
      if (feedback !== undefined) {
        updates.push(`feedback = $${paramIdx++}`)
        params.push(feedback)
      }
      if (content_json) {
        updates.push(`content_json = $${paramIdx++}`)
        params.push(JSON.stringify(content_json))
      }

      if (!updates.length && !deploy) return res.status(400).json({ error: 'Nothing to update' })

      let variation
      if (updates.length) {
        params.push(variationId)
        const rows = await query(
          `UPDATE ad_variations SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
          params
        )
        if (!rows.length) return res.status(404).json({ error: 'Variation not found' })
        variation = rows[0]
      } else {
        const rows = await query(`SELECT * FROM ad_variations WHERE id = $1`, [variationId])
        if (!rows.length) return res.status(404).json({ error: 'Variation not found' })
        variation = rows[0]
      }

      const result = { variation }

      // If all variations for this facility are approved, update facility status
      if (status === 'approved') {
        const fid = variation.facility_id
        const pending = await query(
          `SELECT COUNT(*) as cnt FROM ad_variations WHERE facility_id = $1 AND status NOT IN ('approved', 'published', 'rejected')`,
          [fid]
        )
        if (parseInt(pending[0].cnt) === 0) {
          await query(`UPDATE facilities SET status = 'approved' WHERE id = $1`, [fid])
        } else {
          await query(`UPDATE facilities SET status = 'review' WHERE id = $1`, [fid])
        }
      }

      // ── Deploy actions — wire approved content to live systems ──
      if (deploy === 'landing_page' && variation.platform === 'landing_page') {
        const lpContent = typeof variation.content_json === 'string'
          ? JSON.parse(variation.content_json)
          : variation.content_json
        const fac = (await query(`SELECT * FROM facilities WHERE id = $1`, [variation.facility_id]))[0]
        if (!fac) return res.status(404).json({ error: 'Facility not found' })

        // Generate a unique slug from facility name
        const baseSlug = (fac.name || 'storage')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        let slug = baseSlug
        let attempt = 0
        while (true) {
          const exists = await query(`SELECT id FROM landing_pages WHERE slug = $1`, [slug])
          if (!exists.length) break
          attempt++
          slug = `${baseSlug}-${attempt}`
        }

        // Create the landing page
        const pageRows = await query(
          `INSERT INTO landing_pages (facility_id, slug, title, meta_title, meta_description, variation_ids, storedge_widget_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            variation.facility_id,
            slug,
            lpContent.meta_title || `${fac.name} - Self Storage`,
            lpContent.meta_title || null,
            lpContent.meta_description || null,
            [variation.id],
            fac.website || null,
          ]
        )
        const page = pageRows[0]

        // Insert sections
        const sections = lpContent.sections || []
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i]
          await query(
            `INSERT INTO landing_page_sections (landing_page_id, sort_order, section_type, config)
             VALUES ($1, $2, $3, $4)`,
            [page.id, s.sort_order ?? i, s.section_type, s.config || {}]
          )
        }

        // Mark variation as published
        await query(`UPDATE ad_variations SET status = 'published' WHERE id = $1`, [variation.id])
        variation.status = 'published'

        result.landingPage = { id: page.id, slug: page.slug, url: `/lp/${slug}` }
      }

      if (deploy === 'email_drip' && variation.platform === 'email_drip') {
        const dripContent = typeof variation.content_json === 'string'
          ? JSON.parse(variation.content_json)
          : variation.content_json
        const sequence = dripContent.sequence || []
        if (sequence.length === 0) return res.status(400).json({ error: 'No email sequence in variation' })

        // Store the custom sequence as a drip_sequence_templates row
        await query(
          `INSERT INTO drip_sequence_templates (facility_id, variation_id, name, steps)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (facility_id, variation_id) DO UPDATE SET steps = $4, updated_at = NOW()`,
          [
            variation.facility_id,
            variation.id,
            'AI-Generated Drip',
            JSON.stringify(sequence.map((e, i) => ({
              step: i,
              delayDays: e.delayDays,
              subject: e.subject,
              preheader: e.preheader,
              body: e.body,
              ctaText: e.ctaText,
              ctaUrl: e.ctaUrl,
              label: e.label,
            }))),
          ]
        )

        // Mark variation as published
        await query(`UPDATE ad_variations SET status = 'published' WHERE id = $1`, [variation.id])
        variation.status = 'published'

        result.dripActivated = true
      }

      return res.status(200).json(result)
    } catch (err) {
      console.error('facility-creatives PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update variation' })
    }
  }

  // ── DELETE — remove a variation ──
  if (req.method === 'DELETE') {
    const { variationId } = req.body || {}
    if (!variationId) return res.status(400).json({ error: 'variationId required' })

    try {
      await query(`DELETE FROM ad_variations WHERE id = $1`, [variationId])
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('facility-creatives DELETE failed:', err.message)
      return res.status(500).json({ error: 'Failed to delete variation' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
