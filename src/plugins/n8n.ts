/**
 * n8n — Open source workflow automation (self-hosted Zapier)
 * Free self-hosted, community cloud trial available
 * https://n8n.io
 *
 * This module provides webhook helpers to trigger n8n workflows from StowStack.
 * Configure webhook URLs in your n8n instance and set them as env vars.
 */

const WEBHOOK_BASE = () => import.meta.env.VITE_N8N_WEBHOOK_URL || ''

interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

async function fireWebhook(path: string, data: Record<string, unknown>): Promise<boolean> {
  const base = WEBHOOK_BASE()
  if (!base) return false

  const payload: WebhookPayload = {
    event: path,
    timestamp: new Date().toISOString(),
    data,
  }

  try {
    const res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.warn(`[n8n] Webhook failed for "${path}":`, err)
    return false
  }
}

// ── Pre-built Workflow Triggers ──

/** Fires when a new lead submits the audit form */
export function n8nNewLead(lead: {
  name: string
  email: string
  phone: string
  facilityName: string
  location: string
  occupancy?: string
  totalUnits?: number
}) {
  return fireWebhook('new-lead', lead)
}

/** Fires when a reservation is started on a landing page */
export function n8nReservationStarted(data: {
  facilityId: string
  unitType: string
  visitorId: string
  landingPageSlug?: string
  utmSource?: string
}) {
  return fireWebhook('reservation-started', data)
}

/** Fires when a move-in is completed */
export function n8nMoveInCompleted(data: {
  facilityId: string
  revenue: number
  visitorId: string
  attributionSource?: string
}) {
  return fireWebhook('move-in-completed', data)
}

/** Fires when a campaign metric crosses a threshold (for Slack/email alerts) */
export function n8nCampaignAlert(data: {
  facilityId: string
  campaignId: string
  metric: string
  value: number
  threshold: number
  direction: 'above' | 'below'
}) {
  return fireWebhook('campaign-alert', data)
}

/** Fires when an A/B test reaches significance */
export function n8nTestSignificant(data: {
  testId: string
  testName: string
  winnerVariant: string
  lift: number
  confidence: number
}) {
  return fireWebhook('test-significant', data)
}

/** Fires when a partial lead is captured (exit intent, field blur) */
export function n8nPartialLead(data: {
  email?: string
  phone?: string
  facilityId: string
  scrollDepth: number
  timeOnPage: number
  exitIntent: boolean
}) {
  return fireWebhook('partial-lead', data)
}

/** Generic webhook for custom workflows */
export function n8nCustomWebhook(path: string, data: Record<string, unknown>) {
  return fireWebhook(path, data)
}
