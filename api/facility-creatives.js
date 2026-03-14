import { query } from './_db.js'
import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 30 }

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

const COPY_SYSTEM_PROMPT = `You are an expert Meta (Facebook/Instagram) ad copywriter specializing in self-storage facilities. You write high-converting ad copy for independent storage operators targeting local customers.

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
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  const facilityId = req.query.facilityId || req.body?.facilityId

  // GET — fetch all ad variations + briefs for a facility
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

  // POST — generate new ad variations for a facility
  if (req.method === 'POST') {
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })

    try {
      // Fetch facility data + places data
      const facilities = await query(
        `SELECT f.*, pd.photos, pd.reviews
         FROM facilities f
         LEFT JOIN LATERAL (
           SELECT photos, reviews FROM places_data
           WHERE facility_id = f.id ORDER BY fetched_at DESC LIMIT 1
         ) pd ON true
         WHERE f.id = $1`,
        [facilityId]
      )

      if (!facilities.length) return res.status(404).json({ error: 'Facility not found' })
      const f = facilities[0]

      // Build context for Claude
      const lines = [`Facility: ${f.name}`, `Location: ${f.location}`]
      if (f.google_rating) lines.push(`Google Rating: ${f.google_rating} stars (${f.review_count} reviews)`)
      if (f.google_address) lines.push(`Full Address: ${f.google_address}`)
      if (f.reviews?.length) {
        const snippets = f.reviews.slice(0, 3).map(r => `"${r.text.slice(0, 120)}"`).join('\n')
        lines.push(`Top Customer Reviews:\n${snippets}`)
      }
      if (f.photos?.length) lines.push(`Photos available: ${f.photos.length}`)
      if (f.occupancy_range) lines.push(`Current occupancy: ${f.occupancy_range}`)
      if (f.biggest_issue) lines.push(`Operator's biggest challenge: ${f.biggest_issue}`)
      if (f.total_units) lines.push(`Total units: ${f.total_units}`)

      // Include feedback from rejected variations if regenerating
      const { feedback: priorFeedback } = req.body || {}
      let feedbackNote = ''
      if (priorFeedback) {
        feedbackNote = `\n\nPREVIOUS FEEDBACK FROM REVIEWER (incorporate this):\n${priorFeedback}`
      }

      const userMessage = `Generate 4 Meta ad variations for this self-storage facility. Use the real data provided — especially the rating and review snippets — to make the copy specific and credible.${feedbackNote}

${lines.join('\n')}

Return the JSON object with the "variations" array. Nothing else.`

      const client = new Anthropic({ apiKey })
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: COPY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const raw = message.content[0].text.trim()
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Could not parse ad copy response')
        parsed = JSON.parse(match[0])
      }

      // Get latest brief or create one
      const existingBriefs = await query(
        `SELECT id, version FROM creative_briefs WHERE facility_id = $1 ORDER BY version DESC LIMIT 1`,
        [facilityId]
      )

      let briefId
      if (existingBriefs.length) {
        briefId = existingBriefs[0].id
      } else {
        const newBrief = await query(
          `INSERT INTO creative_briefs (facility_id, brief_json, platform_recommendation, status)
           VALUES ($1, $2, $3, 'draft') RETURNING id`,
          [facilityId, JSON.stringify({ facility: f.name, location: f.location, context: lines }), ['meta_feed']]
        )
        briefId = newBrief[0].id
      }

      // Determine version number
      const maxVersion = await query(
        `SELECT COALESCE(MAX(version), 0) as max_v FROM ad_variations WHERE facility_id = $1`,
        [facilityId]
      )
      const nextVersion = maxVersion[0].max_v + 1

      // Insert all variations
      const insertedVariations = []
      for (const v of parsed.variations) {
        const rows = await query(
          `INSERT INTO ad_variations
            (facility_id, brief_id, platform, format, angle, content_json, status, version)
           VALUES ($1, $2, 'meta_feed', 'static', $3, $4, 'draft', $5)
           RETURNING *`,
          [facilityId, briefId, v.angle, JSON.stringify(v), nextVersion]
        )
        insertedVariations.push(rows[0])
      }

      // Update facility status
      await query(`UPDATE facilities SET status = 'generating' WHERE id = $1 AND status IN ('intake', 'scraped', 'briefed')`, [facilityId])

      return res.status(200).json({ variations: insertedVariations, briefId })
    } catch (err) {
      console.error('Copy generation failed:', err.message)
      return res.status(500).json({ error: 'Copy generation failed', details: err.message })
    }
  }

  // PATCH — update a variation (approve, reject with feedback, edit content)
  if (req.method === 'PATCH') {
    const { variationId, status, feedback, content_json } = req.body || {}
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

      if (!updates.length) return res.status(400).json({ error: 'Nothing to update' })

      params.push(variationId)
      const rows = await query(
        `UPDATE ad_variations SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        params
      )

      if (!rows.length) return res.status(404).json({ error: 'Variation not found' })

      // If all variations for this facility are approved, update facility status
      if (status === 'approved') {
        const fid = rows[0].facility_id
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

      return res.status(200).json({ variation: rows[0] })
    } catch (err) {
      console.error('facility-creatives PATCH failed:', err.message)
      return res.status(500).json({ error: 'Failed to update variation' })
    }
  }

  // DELETE — remove a variation
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
