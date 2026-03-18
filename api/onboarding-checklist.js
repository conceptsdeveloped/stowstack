import { query, queryOne } from './_db.js'
import { isAdmin } from './_auth.js'

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

// The 10-step onboarding checklist per the sprint doc
const ONBOARDING_STEPS = [
  { id: 'facility_info', label: 'Facility info collected', description: 'Name, address, phone, hours, unit mix, pricing, current promos' },
  { id: 'storedge_verified', label: 'storEDGE account verified', description: 'Embed URL confirmed and tested' },
  { id: 'meta_access', label: 'Meta Business Manager access granted', description: 'Partner access to Facebook/Instagram ad accounts' },
  { id: 'google_access', label: 'Google Ads account access granted', description: 'If applicable — MCC or direct access' },
  { id: 'brand_assets', label: 'Brand assets received', description: 'Logo, photos, brand colors' },
  { id: 'landing_pages', label: 'Landing page(s) built and approved', description: 'Client has reviewed and approved the landing pages' },
  { id: 'call_tracking', label: 'Call tracking number provisioned', description: 'Forwarding tested and working' },
  { id: 'pixel_verified', label: 'Pixel/CAPI tracking verified', description: 'Test events firing correctly to Meta and Google' },
  { id: 'creative_approved', label: 'Ad creative approved by client', description: 'All ad images, copy, and videos signed off' },
  { id: 'campaigns_launched', label: 'Campaigns launched', description: 'Ads are live and serving impressions' },
]

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  const cors = getCorsHeaders(req.headers.origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // GET — Fetch onboarding checklist for a client
    if (req.method === 'GET') {
      const { clientId, accessCode, email } = req.query || {}

      // Admin can fetch by clientId
      if (clientId && isAdmin(req)) {
        const client = await queryOne('SELECT id, facility_id FROM clients WHERE id = $1', [clientId])
        if (!client) return res.status(404).json({ error: 'Client not found' })

        const row = await queryOne(
          `SELECT steps FROM client_onboarding WHERE client_id = $1`, [clientId]
        )

        const checklist = row?.steps?.checklist || {}
        const steps = ONBOARDING_STEPS.map(s => ({
          ...s,
          completed: !!checklist[s.id]?.completed,
          completedAt: checklist[s.id]?.completedAt || null,
          completedBy: checklist[s.id]?.completedBy || null,
        }))

        const completedCount = steps.filter(s => s.completed).length
        return res.json({
          success: true,
          steps,
          completedCount,
          totalSteps: ONBOARDING_STEPS.length,
          completionPct: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
        })
      }

      // Client can fetch by accessCode + email
      if (accessCode && email) {
        const client = await queryOne(
          'SELECT id FROM clients WHERE access_code = $1 AND LOWER(email) = LOWER($2)',
          [accessCode, email]
        )
        if (!client) return res.status(401).json({ error: 'Unauthorized' })

        const row = await queryOne(
          `SELECT steps FROM client_onboarding WHERE client_id = $1`, [client.id]
        )

        const checklist = row?.steps?.checklist || {}
        const steps = ONBOARDING_STEPS.map(s => ({
          ...s,
          completed: !!checklist[s.id]?.completed,
          completedAt: checklist[s.id]?.completedAt || null,
        }))

        const completedCount = steps.filter(s => s.completed).length

        // Figure out the next action for the client
        let nextAction = null
        for (const step of steps) {
          if (!step.completed) {
            if (step.id === 'meta_access') {
              nextAction = { step: step.id, label: step.label, instruction: 'We need your Meta Business Manager access. Go to business.facebook.com > Settings > Partners > Add Partner and enter our Business ID.' }
            } else if (step.id === 'google_access') {
              nextAction = { step: step.id, label: step.label, instruction: 'Grant us access to your Google Ads account. Go to Tools > Access > Add user and invite blake@storepawpaw.com.' }
            } else if (step.id === 'brand_assets') {
              nextAction = { step: step.id, label: step.label, instruction: 'Send us your logo (PNG preferred), facility photos, and brand colors. Reply to your welcome email or upload in the onboarding wizard.' }
            } else if (step.id === 'creative_approved') {
              nextAction = { step: step.id, label: step.label, instruction: 'Review the ad creative we sent you and let us know if it is approved or needs changes.' }
            } else if (step.id === 'landing_pages') {
              nextAction = { step: step.id, label: step.label, instruction: 'Review the landing pages we built for your facility. Let us know if anything needs to change.' }
            }
            break
          }
        }

        return res.json({
          success: true,
          steps,
          completedCount,
          totalSteps: ONBOARDING_STEPS.length,
          completionPct: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
          nextAction,
        })
      }

      return res.status(400).json({ error: 'Missing clientId or accessCode+email' })
    }

    // PATCH — Admin toggles a checklist step
    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

      const { clientId, stepId, completed, completedBy } = req.body
      if (!clientId || !stepId) return res.status(400).json({ error: 'Missing clientId or stepId' })

      const validStep = ONBOARDING_STEPS.find(s => s.id === stepId)
      if (!validStep) return res.status(400).json({ error: 'Invalid step ID' })

      // Get or create onboarding record
      let row = await queryOne('SELECT * FROM client_onboarding WHERE client_id = $1', [clientId])
      if (!row) {
        const client = await queryOne('SELECT id, access_code FROM clients WHERE id = $1', [clientId])
        if (!client) return res.status(404).json({ error: 'Client not found' })

        await query(
          'INSERT INTO client_onboarding (client_id, access_code, steps) VALUES ($1, $2, $3)',
          [clientId, client.access_code, JSON.stringify({})]
        )
        row = await queryOne('SELECT * FROM client_onboarding WHERE client_id = $1', [clientId])
      }

      const steps = row.steps || {}
      if (!steps.checklist) steps.checklist = {}

      steps.checklist[stepId] = {
        completed: completed !== false,
        completedAt: completed !== false ? new Date().toISOString() : null,
        completedBy: completedBy || 'admin',
      }

      const allDone = ONBOARDING_STEPS.every(s => steps.checklist[s.id]?.completed)

      await query(
        'UPDATE client_onboarding SET steps = $1, completed_at = $2, updated_at = NOW() WHERE client_id = $3',
        [JSON.stringify(steps), allDone ? new Date().toISOString() : null, clientId]
      )

      // Send notification email to client when a step is completed
      if (completed !== false) {
        const apiKey = process.env.RESEND_API_KEY
        const client = await queryOne('SELECT email, name, facility_name FROM clients WHERE id = $1', [clientId])

        if (apiKey && client) {
          const stepLabel = validStep.label
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: 'StowStack <notifications@stowstack.co>',
              to: client.email,
              subject: `Onboarding update: ${stepLabel}`,
              html: `
                <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="margin: 0 0 12px; color: #1a1a1a;">Your StowStack onboarding: ${esc(stepLabel)}</h2>
                  <p style="color: #666; margin: 0 0 20px;">Hey ${esc(client.name.split(' ')[0])}, just a quick update on your ${esc(client.facility_name || '')} campaign setup.</p>
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #16a34a; font-weight: 600;">✓ ${esc(stepLabel)}</p>
                  </div>
                  <p style="color: #666; margin: 0 0 20px;">Log in to your portal to see the full progress: <a href="https://stowstack.co/portal" style="color: #16a34a;">stowstack.co/portal</a></p>
                  <p style="color: #999; font-size: 12px; margin-top: 24px;">StowStack by StorageAds.com</p>
                </div>`,
            }),
          }).catch(err => console.error('Onboarding email error:', err.message))
        }
      }

      // Log activity
      query(
        'INSERT INTO activity_log (type, detail) VALUES ($1, $2)',
        ['onboarding_step', `${completed !== false ? 'Completed' : 'Unchecked'}: ${validStep.label} for client ${clientId}`]
      ).catch(() => {})

      const checklist = steps.checklist
      const stepsResult = ONBOARDING_STEPS.map(s => ({
        ...s,
        completed: !!checklist[s.id]?.completed,
        completedAt: checklist[s.id]?.completedAt || null,
        completedBy: checklist[s.id]?.completedBy || null,
      }))

      const completedCount = stepsResult.filter(s => s.completed).length
      return res.json({
        success: true,
        steps: stepsResult,
        completedCount,
        totalSteps: ONBOARDING_STEPS.length,
        completionPct: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('onboarding-checklist error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
