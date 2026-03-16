import { query, queryOne } from './_db.js'
import { requireAdmin, isAdmin } from './_auth.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

/**
 * Generate a layman's summary from the commit subject, body, and optional dev note.
 * Uses Anthropic API if available, otherwise returns a simplified version.
 */
async function generateSummaries(subject, body, devNote) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fallback: clean up the commit subject as a basic summary
    const cleaned = subject
      .replace(/^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i, '')
      .replace(/([A-Z])/g, ' $1').trim()
    return {
      laymans: devNote || `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`,
      technical: body || subject,
    }
  }

  try {
    const context = [
      `Commit: ${subject}`,
      body ? `Details: ${body}` : '',
      devNote ? `Dev's intention: ${devNote}` : '',
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are summarizing a code commit for a self-storage SaaS called StowStack. Two audiences read this:

1. LAYMAN'S SUMMARY: For non-technical stakeholders. One sentence, plain English, no jargon. Focus on what changed for users or the business. Start with a verb.
2. TECHNICAL SUMMARY: For developers. 1-2 sentences, concise, mention specific systems/components affected.

${context}

Respond in exactly this JSON format (no markdown):
{"laymans": "...", "technical": "..."}`
        }],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const parsed = JSON.parse(text)
      return { laymans: parsed.laymans, technical: parsed.technical }
    }
  } catch (err) {
    console.error('AI summary generation failed:', err.message)
  }

  // Fallback if AI fails
  return {
    laymans: devNote || subject,
    technical: body || subject,
  }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(200).json({})
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch all enrichments (bulk load for frontend)
  if (req.method === 'GET') {
    try {
      const enrichments = await query(`SELECT * FROM commit_enrichments ORDER BY created_at DESC`)
      // Return as a map keyed by commit_hash for easy frontend lookup
      const byHash = {}
      for (const e of enrichments) byHash[e.commit_hash] = e
      return res.json({ enrichments: byHash })
    } catch (err) {
      console.error('Commit notes GET error:', err)
      return res.status(500).json({ error: 'Failed to fetch enrichments' })
    }
  }

  // POST — create or update a dev note + generate summaries
  if (req.method === 'POST') {
    const { commitHash, devNote, devName, subject, body } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })
    if (!devName) return res.status(400).json({ error: 'devName is required' })

    try {
      // Generate AI summaries
      const { laymans, technical } = await generateSummaries(
        subject || '',
        body || '',
        devNote || ''
      )

      // Upsert
      const existing = await queryOne(
        `SELECT * FROM commit_enrichments WHERE commit_hash = $1`,
        [commitHash]
      )

      let enrichment
      if (existing) {
        const rows = await query(
          `UPDATE commit_enrichments
           SET dev_note = $1, dev_name = $2, laymans_summary = $3, technical_summary = $4, updated_at = NOW()
           WHERE commit_hash = $5
           RETURNING *`,
          [devNote || existing.dev_note, devName, laymans, technical, commitHash]
        )
        enrichment = rows[0]
      } else {
        const rows = await query(
          `INSERT INTO commit_enrichments (commit_hash, dev_note, dev_name, laymans_summary, technical_summary)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [commitHash, devNote || '', devName, laymans, technical]
        )
        enrichment = rows[0]
      }

      return res.json({ enrichment })
    } catch (err) {
      console.error('Commit notes POST error:', err)
      return res.status(500).json({ error: 'Failed to save enrichment' })
    }
  }

  // PATCH — update just the dev note (re-generates summaries)
  if (req.method === 'PATCH') {
    const { commitHash, devNote, devName, subject, body } = req.body || {}
    if (!commitHash) return res.status(400).json({ error: 'commitHash is required' })

    try {
      const { laymans, technical } = await generateSummaries(
        subject || '',
        body || '',
        devNote || ''
      )

      const rows = await query(
        `UPDATE commit_enrichments
         SET dev_note = COALESCE($1, dev_note), laymans_summary = $2, technical_summary = $3, updated_at = NOW()
         WHERE commit_hash = $4
         RETURNING *`,
        [devNote, laymans, technical, commitHash]
      )

      if (rows.length === 0) return res.status(404).json({ error: 'Enrichment not found' })
      return res.json({ enrichment: rows[0] })
    } catch (err) {
      console.error('Commit notes PATCH error:', err)
      return res.status(500).json({ error: 'Failed to update enrichment' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
