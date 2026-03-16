/*
 * A/B Testing API for StowStack
 *
 * Required database migration:
 *
 * CREATE TABLE IF NOT EXISTS ab_tests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   status TEXT NOT NULL DEFAULT 'active',
 *   variants JSONB NOT NULL,
 *   metrics JSONB NOT NULL,
 *   landing_page_ids UUID[],
 *   start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   end_date TIMESTAMPTZ,
 *   winner_variant_id TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE IF NOT EXISTS ab_test_events (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
 *   variant_id TEXT NOT NULL,
 *   visitor_id TEXT NOT NULL,
 *   event_name TEXT NOT NULL,
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_ab_tests_facility ON ab_tests(facility_id);
 * CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_id);
 * CREATE INDEX IF NOT EXISTS idx_ab_test_events_dedup ON ab_test_events(test_id, variant_id, visitor_id, event_name);
 */

import { query } from './_db.js'
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  }
}

function checkAuth(req) {
  return isAdmin(req)
}

// Chi-square critical value for 1 degree of freedom at 95% confidence
const CHI_SQUARE_95_THRESHOLD = 3.841

/**
 * Calculate chi-square significance between two variants.
 * Mirrors the client-side calculateSignificance() from src/utils/ab-testing.ts.
 */
function calculateSignificance(controlConversions, controlVisitors, treatmentConversions, treatmentVisitors) {
  if (
    controlVisitors < 1 ||
    treatmentVisitors < 1 ||
    controlConversions < 0 ||
    treatmentConversions < 0 ||
    controlConversions > controlVisitors ||
    treatmentConversions > treatmentVisitors
  ) {
    return { pValue: 1, isSignificant: false, confidence: 0, chiSquare: 0 }
  }

  const controlNonConversions = controlVisitors - controlConversions
  const treatmentNonConversions = treatmentVisitors - treatmentConversions

  const totalVisitors = controlVisitors + treatmentVisitors
  const totalConversions = controlConversions + treatmentConversions
  const totalNonConversions = controlNonConversions + treatmentNonConversions

  const expectedControlConversions = (controlVisitors / totalVisitors) * totalConversions
  const expectedControlNonConversions = (controlVisitors / totalVisitors) * totalNonConversions
  const expectedTreatmentConversions = (treatmentVisitors / totalVisitors) * totalConversions
  const expectedTreatmentNonConversions = (treatmentVisitors / totalVisitors) * totalNonConversions

  if (
    expectedControlConversions === 0 ||
    expectedControlNonConversions === 0 ||
    expectedTreatmentConversions === 0 ||
    expectedTreatmentNonConversions === 0
  ) {
    return { pValue: 1, isSignificant: false, confidence: 0, chiSquare: 0 }
  }

  const chiSquare =
    Math.pow(controlConversions - expectedControlConversions, 2) / expectedControlConversions +
    Math.pow(controlNonConversions - expectedControlNonConversions, 2) / expectedControlNonConversions +
    Math.pow(treatmentConversions - expectedTreatmentConversions, 2) / expectedTreatmentConversions +
    Math.pow(treatmentNonConversions - expectedTreatmentNonConversions, 2) / expectedTreatmentNonConversions

  const pValue = chiSquare > CHI_SQUARE_95_THRESHOLD ? 0.05 : 0.5
  const isSignificant = chiSquare > CHI_SQUARE_95_THRESHOLD

  return { pValue, isSignificant, confidence: 1 - pValue, chiSquare }
}

/**
 * Generate a short random ID for variant identifiers.
 */
function generateVariantId() {
  return 'v_' + Math.random().toString(36).slice(2, 10)
}

/**
 * Aggregate results for a test by querying ab_test_events.
 * Returns per-variant visitor counts, conversion counts, conversion rates,
 * and chi-square significance analysis.
 */
async function aggregateResults(test) {
  const primaryMetric = test.metrics?.primary || 'reservation_completed'

  // Unique visitors per variant
  const visitorRows = await query(
    `SELECT variant_id,
            COUNT(DISTINCT visitor_id) AS visitors
     FROM ab_test_events
     WHERE test_id = $1
     GROUP BY variant_id`,
    [test.id]
  )

  // Unique conversions per variant (visitors who triggered the primary metric)
  const conversionRows = await query(
    `SELECT variant_id,
            COUNT(DISTINCT visitor_id) AS conversions
     FROM ab_test_events
     WHERE test_id = $1 AND event_name = $2
     GROUP BY variant_id`,
    [test.id, primaryMetric]
  )

  // Secondary metric counts
  const secondaryMetrics = test.metrics?.secondary || []
  let secondaryRows = []
  if (secondaryMetrics.length > 0) {
    secondaryRows = await query(
      `SELECT variant_id, event_name,
              COUNT(DISTINCT visitor_id) AS count
       FROM ab_test_events
       WHERE test_id = $1 AND event_name = ANY($2)
       GROUP BY variant_id, event_name`,
      [test.id, secondaryMetrics]
    )
  }

  // Build a lookup from DB rows
  const visitorMap = {}
  for (const row of visitorRows) {
    visitorMap[row.variant_id] = parseInt(row.visitors, 10)
  }
  const conversionMap = {}
  for (const row of conversionRows) {
    conversionMap[row.variant_id] = parseInt(row.conversions, 10)
  }
  const secondaryMap = {}
  for (const row of secondaryRows) {
    if (!secondaryMap[row.variant_id]) secondaryMap[row.variant_id] = {}
    secondaryMap[row.variant_id][row.event_name] = parseInt(row.count, 10)
  }

  // Build variant results
  const variants = (test.variants || []).map((v) => {
    const visitors = visitorMap[v.id] || 0
    const conversions = conversionMap[v.id] || 0
    const conversionRate = visitors > 0 ? conversions / visitors : 0
    const secondary = {}
    if (secondaryMetrics.length > 0) {
      for (const metric of secondaryMetrics) {
        const count = secondaryMap[v.id]?.[metric] || 0
        secondary[metric] = visitors > 0 ? count / visitors : 0
      }
    }
    return {
      variantId: v.id,
      variantName: v.name,
      totalVisitors: visitors,
      conversions,
      conversionRate,
      secondaryMetrics: Object.keys(secondary).length > 0 ? secondary : undefined,
    }
  })

  // Statistical significance (compare first two variants as control vs treatment)
  let winner = undefined
  let statisticallySignificant = false

  if (variants.length >= 2) {
    const control = variants[0]
    const treatment = variants[1]

    const sig = calculateSignificance(
      control.conversions,
      control.totalVisitors,
      treatment.conversions,
      treatment.totalVisitors
    )

    if (sig.isSignificant) {
      statisticallySignificant = true
      const better = treatment.conversionRate > control.conversionRate ? treatment : control
      const worse = better === treatment ? control : treatment
      const lift = worse.conversionRate > 0
        ? (better.conversionRate - worse.conversionRate) / worse.conversionRate
        : 0

      winner = {
        variantId: better.variantId,
        variantName: better.variantName,
        confidence: sig.confidence,
        lift,
        pValue: sig.pValue,
      }
    }
  }

  return {
    testId: test.id,
    testName: test.name,
    variants,
    startDate: test.start_date,
    endDate: test.end_date,
    winner,
    statisticallySignificant,
  }
}

// --- Handler ---

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin || '')
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    // ─── PUBLIC TRACKING ENDPOINT (no auth) ───
    if (req.method === 'POST' && req.body?.action === 'track') {
      return await handleTrack(req, res)
    }

    // ─── All other endpoints require admin auth ───
    if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' })

    if (req.method === 'GET') return await handleGet(req, res)
    if (req.method === 'POST') return await handlePost(req, res)
    if (req.method === 'PATCH') return await handlePatch(req, res)
    if (req.method === 'DELETE') return await handleDelete(req, res)

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('ab-tests error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ─── GET ───

async function handleGet(req, res) {
  const { facilityId, testId, results } = req.query || {}

  // Single test
  if (testId) {
    const rows = await query('SELECT * FROM ab_tests WHERE id = $1', [testId])
    if (rows.length === 0) return res.status(404).json({ error: 'Test not found' })

    const test = rows[0]

    if (results === 'true') {
      const aggregated = await aggregateResults(test)
      return res.status(200).json({ test, results: aggregated })
    }

    return res.status(200).json({ test })
  }

  // List by facility
  if (facilityId) {
    const tests = await query(
      'SELECT * FROM ab_tests WHERE facility_id = $1 ORDER BY created_at DESC',
      [facilityId]
    )
    return res.status(200).json({ tests })
  }

  return res.status(400).json({ error: 'Provide facilityId or testId query parameter' })
}

// ─── POST (create test) ───

async function handlePost(req, res) {
  const { facilityId, name, description, variants, metrics, landingPageIds } = req.body || {}

  if (!facilityId || !name || !variants || !Array.isArray(variants) || variants.length < 2) {
    return res.status(400).json({ error: 'facilityId, name, and at least 2 variants are required' })
  }

  if (!metrics || !metrics.primary) {
    return res.status(400).json({ error: 'metrics.primary is required' })
  }

  // Validate variant weights sum to 100
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0)
  if (totalWeight !== 100) {
    return res.status(400).json({ error: `Variant weights must sum to 100 (got ${totalWeight})` })
  }

  // Auto-generate variant IDs
  const variantsWithIds = variants.map((v) => ({
    id: generateVariantId(),
    name: v.name,
    slug: v.slug,
    weight: v.weight,
  }))

  const rows = await query(
    `INSERT INTO ab_tests (facility_id, name, description, status, variants, metrics, landing_page_ids, start_date)
     VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW())
     RETURNING *`,
    [
      facilityId,
      name,
      description || null,
      JSON.stringify(variantsWithIds),
      JSON.stringify(metrics),
      landingPageIds || null,
    ]
  )

  return res.status(201).json({ test: rows[0] })
}

// ─── PATCH (update test) ───

async function handlePatch(req, res) {
  const { testId } = req.query || {}
  if (!testId) return res.status(400).json({ error: 'testId query parameter is required' })

  const { status, name, winnerVariantId } = req.body || {}

  // Build dynamic SET clause
  const sets = []
  const params = []
  let paramIdx = 1

  if (status !== undefined) {
    if (!['active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, paused, or completed' })
    }
    sets.push(`status = $${paramIdx++}`)
    params.push(status)
    if (status === 'completed') {
      sets.push(`end_date = NOW()`)
    }
  }

  if (name !== undefined) {
    sets.push(`name = $${paramIdx++}`)
    params.push(name)
  }

  if (winnerVariantId !== undefined) {
    sets.push(`winner_variant_id = $${paramIdx++}`)
    params.push(winnerVariantId)
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  params.push(testId)
  const rows = await query(
    `UPDATE ab_tests SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  )

  if (rows.length === 0) return res.status(404).json({ error: 'Test not found' })

  return res.status(200).json({ test: rows[0] })
}

// ─── DELETE ───

async function handleDelete(req, res) {
  const { testId } = req.query || {}
  if (!testId) return res.status(400).json({ error: 'testId query parameter is required' })

  // Events are cascade-deleted via ON DELETE CASCADE
  const rows = await query('DELETE FROM ab_tests WHERE id = $1 RETURNING id', [testId])
  if (rows.length === 0) return res.status(404).json({ error: 'Test not found' })

  return res.status(200).json({ deleted: true, testId: rows[0].id })
}

// ─── TRACK (public, no auth) ───

async function handleTrack(req, res) {
  const { testId, variantId, visitorId, eventName, metadata } = req.body || {}

  if (!testId || !variantId || !visitorId || !eventName) {
    return res.status(400).json({ error: 'testId, variantId, visitorId, and eventName are required' })
  }

  // Deduplication: skip if same visitor + same event within 5 seconds
  const dupeCheck = await query(
    `SELECT id FROM ab_test_events
     WHERE test_id = $1
       AND variant_id = $2
       AND visitor_id = $3
       AND event_name = $4
       AND created_at > NOW() - INTERVAL '5 seconds'
     LIMIT 1`,
    [testId, variantId, visitorId, eventName]
  )

  if (dupeCheck.length > 0) {
    return res.status(200).json({ tracked: false, reason: 'duplicate' })
  }

  await query(
    `INSERT INTO ab_test_events (test_id, variant_id, visitor_id, event_name, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [testId, variantId, visitorId, eventName, metadata ? JSON.stringify(metadata) : null]
  )

  return res.status(200).json({ tracked: true })
}

export const config = { maxDuration: 15 }
