/**
 * Formbricks — Open source surveys & feedback
 * Free tier: 500 responses/mo
 * https://formbricks.com
 */

import formbricks from '@formbricks/js'

let initialized = false

export function initFormbricks() {
  const envId = import.meta.env.VITE_FORMBRICKS_ENV_ID
  const apiHost = import.meta.env.VITE_FORMBRICKS_API_HOST || 'https://app.formbricks.com'

  if (!envId || initialized) return
  initialized = true

  formbricks.init({
    environmentId: envId,
    apiHost,
  })
}

// ── User Identity ──

export function setFormbricksUser(userId: string, attributes?: Record<string, string>) {
  if (!initialized) return
  formbricks.setUserId(userId)
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      formbricks.setAttribute(key, value)
    })
  }
}

// ── Custom Attributes (for targeting surveys) ──

export function setFormbricksAttribute(key: string, value: string) {
  if (!initialized) return
  formbricks.setAttribute(key, value)
}

export function setFormbricksFacility(facilityId: string, facilityName: string) {
  if (!initialized) return
  formbricks.setAttribute('facilityId', facilityId)
  formbricks.setAttribute('facilityName', facilityName)
}

// ── Events (trigger surveys based on user actions) ──

export function trackFormbricksAction(action: string) {
  if (!initialized) return
  formbricks.track(action)
}

// Pre-built action triggers for StowStack flows
export const formbricksActions = {
  auditFormSubmitted: () => trackFormbricksAction('audit_form_submitted'),
  reservationCompleted: () => trackFormbricksAction('reservation_completed'),
  moveInCompleted: () => trackFormbricksAction('move_in_completed'),
  dashboardViewed: () => trackFormbricksAction('dashboard_viewed'),
  landingPageViewed: () => trackFormbricksAction('landing_page_viewed'),
  exitIntentTriggered: () => trackFormbricksAction('exit_intent_triggered'),
  pricingViewed: () => trackFormbricksAction('pricing_viewed'),
} as const

// ── Lifecycle ──

export function logoutFormbricks() {
  if (!initialized) return
  formbricks.logout()
}
