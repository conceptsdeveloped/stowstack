/**
 * DEPRECATED: This endpoint is superseded by /api/facility-creatives (POST).
 * Use facility-creatives with { platform: 'meta_feed' } for the same functionality
 * plus onboarding data enrichment and multi-platform support.
 *
 * This endpoint is kept for backwards compatibility with any external callers.
 * It proxies the request to facility-creatives internally.
 */

import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req) {
  const origin = req.headers['origin'] || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

const SYSTEM_PROMPT = `You are an expert Meta (Facebook/Instagram) ad copywriter specializing in self-storage facilities. You write high-converting ad copy for independent storage operators targeting local customers.

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
}`

export default async function handler(req, res) {
  const cors = getCorsHeaders(req)
  Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error: missing API key' })

  const { facilityName, location, occupancyRange, biggestIssue, facilityData } = req.body || {}

  if (!facilityName?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'facilityName and location are required' })
  }

  // Build context string from whatever data we have
  const lines = [`Facility: ${facilityName.trim()}`, `Location: ${location.trim()}`]

  if (facilityData) {
    if (facilityData.rating) lines.push(`Google Rating: ${facilityData.rating} stars (${facilityData.reviewCount} reviews)`)
    if (facilityData.address) lines.push(`Full Address: ${facilityData.address}`)
    if (facilityData.reviews?.length) {
      const snippets = facilityData.reviews
        .slice(0, 3)
        .map((r) => `"${r.text.slice(0, 120)}"`)
        .join('\n')
      lines.push(`Top Customer Reviews:\n${snippets}`)
    }
    if (facilityData.photos?.length) lines.push(`Photos available: ${facilityData.photos.length}`)
  }

  if (occupancyRange) lines.push(`Current occupancy: ${occupancyRange}`)
  if (biggestIssue) lines.push(`Operator's biggest challenge: ${biggestIssue}`)

  const userMessage = `Generate 4 Meta ad variations for this self-storage facility. Use the real data provided — especially the rating and review snippets — to make the copy specific and credible.

${lines.join('\n')}

Return the JSON object with the "variations" array. Nothing else.`

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0].text.trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Attempt to extract JSON if model added any surrounding text
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse ad copy response')
      parsed = JSON.parse(match[0])
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Copy generation failed:', err.message)
    return res.status(500).json({ error: 'Copy generation failed', details: err.message })
  }
}
