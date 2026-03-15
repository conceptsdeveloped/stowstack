import { query } from './_db.js'

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return req.headers['x-admin-key'] === ADMIN_KEY
}

async function getValidToken(connection) {
  if (connection.access_token && connection.token_expires_at && new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token
  }
  if (!connection.refresh_token) return null
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
      await query(
        `UPDATE gbp_connections SET access_token = $1, token_expires_at = $2, status = 'connected', updated_at = NOW() WHERE id = $3`,
        [data.access_token, expiresAt, connection.id]
      )
      return data.access_token
    }
  } catch (err) {
    console.error('GBP token refresh failed:', err.message)
  }
  return null
}

/** Generate an AI answer for a GBP question */
async function generateAIAnswer(question, facilityName) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 250,
          messages: [{
            role: 'user',
            content: `Write a helpful answer to a question posted on the Google Business Profile of a self-storage facility called "${facilityName}".

Question from "${question.author_name || 'a customer'}": "${question.question_text}"

Guidelines:
- Keep it under 100 words
- Be helpful, friendly, and specific
- If you don't know specifics (prices, hours), suggest they call or visit
- Include a brief mention of the facility name
- Write only the answer text, no labels or quotes`,
          }],
        }),
      })
      const data = await res.json()
      if (data.content?.[0]?.text) return data.content[0].text
    } catch (err) {
      console.error('AI answer generation failed:', err.message)
    }
  }

  // Template fallback
  return `Great question! At ${facilityName}, we'd be happy to help. Please give us a call or stop by our office and our team can provide you with the most up-to-date information. We look forward to assisting you!`
}

/** Sync Q&A from GBP API */
async function syncQuestionsFromGBP(facilityId, connection) {
  const token = await getValidToken(connection)
  if (!token) throw new Error('Unable to authenticate with Google Business Profile')

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${connection.location_id}/questions?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `GBP API error ${res.status}`)
  }

  const data = await res.json()
  const questions = data.questions || []
  let synced = 0

  for (const q of questions) {
    const externalId = q.name
    const existing = await query(`SELECT id FROM gbp_questions WHERE external_question_id = $1`, [externalId])

    if (existing.length === 0) {
      const topAnswer = q.topAnswers?.[0]
      await query(
        `INSERT INTO gbp_questions (facility_id, gbp_connection_id, external_question_id, author_name, question_text, question_time, answer_text, answer_status, upvote_count, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          facilityId, connection.id, externalId,
          q.author?.displayName || 'Anonymous',
          q.text || '',
          q.createTime || new Date().toISOString(),
          topAnswer?.text || null,
          topAnswer ? 'published' : 'pending',
          q.totalAnswerCount || 0,
        ]
      )
      synced++
    }
  }
  return { synced, total: questions.length }
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list questions
  if (req.method === 'GET') {
    const { facilityId, status: filterStatus } = req.query
    if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

    let sql = `SELECT * FROM gbp_questions WHERE facility_id = $1`
    const params = [facilityId]
    if (filterStatus) { sql += ` AND answer_status = $2`; params.push(filterStatus) }
    sql += ` ORDER BY question_time DESC`

    const questions = await query(sql, params)
    const statsRow = await query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE answer_status = 'published') as answered FROM gbp_questions WHERE facility_id = $1`,
      [facilityId]
    )
    const stats = statsRow[0] || {}

    return res.json({
      questions,
      stats: {
        total: parseInt(stats.total) || 0,
        answered: parseInt(stats.answered) || 0,
        unanswered: (parseInt(stats.total) || 0) - (parseInt(stats.answered) || 0),
      },
    })
  }

  // POST — sync, generate answer, or approve+publish answer
  if (req.method === 'POST') {
    const { action } = req.query

    if (action === 'sync') {
      const { facilityId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })
      const conn = await query(`SELECT * FROM gbp_connections WHERE facility_id = $1 AND status = 'connected'`, [facilityId])
      if (!conn.length) return res.status(400).json({ error: 'No GBP connection' })
      try {
        const result = await syncQuestionsFromGBP(facilityId, conn[0])
        return res.json({ ok: true, ...result })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    if (action === 'generate-answer') {
      const { questionId } = req.body
      if (!questionId) return res.status(400).json({ error: 'questionId required' })
      const rows = await query(`SELECT q.*, f.name as facility_name FROM gbp_questions q JOIN facilities f ON q.facility_id = f.id WHERE q.id = $1`, [questionId])
      if (!rows.length) return res.status(404).json({ error: 'Question not found' })
      const aiDraft = await generateAIAnswer(rows[0], rows[0].facility_name)
      await query(`UPDATE gbp_questions SET ai_draft = $1, answer_status = 'ai_drafted' WHERE id = $2`, [aiDraft, questionId])
      return res.json({ aiDraft })
    }

    if (action === 'approve-answer') {
      const { questionId, answerText } = req.body
      if (!questionId || !answerText) return res.status(400).json({ error: 'questionId and answerText required' })

      const rows = await query(
        `SELECT q.*, c.access_token, c.refresh_token, c.token_expires_at, c.location_id, c.id as conn_id
         FROM gbp_questions q LEFT JOIN gbp_connections c ON q.gbp_connection_id = c.id WHERE q.id = $1`,
        [questionId]
      )
      if (!rows.length) return res.status(404).json({ error: 'Question not found' })

      const question = rows[0]
      if (question.access_token && question.external_question_id) {
        try {
          const token = await getValidToken({ id: question.conn_id, access_token: question.access_token, refresh_token: question.refresh_token, token_expires_at: question.token_expires_at })
          if (token) {
            await fetch(`https://mybusiness.googleapis.com/v4/${question.external_question_id}/answers`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: answerText }),
            })
          }
        } catch (err) {
          console.error('Failed to publish answer to GBP:', err.message)
        }
      }

      await query(
        `UPDATE gbp_questions SET answer_text = $1, answer_status = 'published', answered_at = NOW() WHERE id = $2`,
        [answerText, questionId]
      )
      return res.json({ ok: true })
    }

    if (action === 'bulk-generate') {
      const { facilityId } = req.body
      if (!facilityId) return res.status(400).json({ error: 'facilityId required' })

      const pending = await query(
        `SELECT q.*, f.name as facility_name FROM gbp_questions q JOIN facilities f ON q.facility_id = f.id WHERE q.facility_id = $1 AND q.answer_status = 'pending'`,
        [facilityId]
      )

      let generated = 0
      for (const q of pending) {
        const aiDraft = await generateAIAnswer(q, q.facility_name)
        await query(`UPDATE gbp_questions SET ai_draft = $1, answer_status = 'ai_drafted' WHERE id = $2`, [aiDraft, q.id])
        generated++
      }
      return res.json({ ok: true, generated })
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
