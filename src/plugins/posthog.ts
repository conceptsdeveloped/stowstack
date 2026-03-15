/**
 * PostHog — Product analytics, session replay, feature flags, A/B testing
 * Free tier: 1M events/mo, 5K sessions, unlimited feature flags
 * https://posthog.com
 */

import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key || initialized) return
  initialized = true

  posthog.init(key, {
    api_host: host,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.debug()
      }
    },
  })
}

// ── Identity ──

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

// ── Events ──

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function capturePageView(url?: string) {
  if (!initialized) return
  posthog.capture('$pageview', url ? { $current_url: url } : undefined)
}

// ── Feature Flags ──

export function isFeatureEnabled(flag: string): boolean {
  if (!initialized) return false
  return posthog.isFeatureEnabled(flag) ?? false
}

export function getFeatureFlag(flag: string): string | boolean | undefined {
  if (!initialized) return undefined
  return posthog.getFeatureFlag(flag)
}

export function onFeatureFlags(callback: (flags: string[]) => void) {
  if (!initialized) return
  posthog.onFeatureFlags(callback)
}

// ── A/B Testing (supplements existing ab-testing.ts) ──

export function getExperimentVariant(experimentKey: string): string | undefined {
  if (!initialized) return undefined
  const variant = posthog.getFeatureFlag(experimentKey)
  return typeof variant === 'string' ? variant : undefined
}

// ── Session Replay ──

export function startSessionRecording() {
  if (!initialized) return
  posthog.startSessionRecording()
}

export function stopSessionRecording() {
  if (!initialized) return
  posthog.stopSessionRecording()
}

// ── Groups (for facility-level analytics) ──

export function setFacilityGroup(facilityId: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.group('facility', facilityId, properties)
}

// ── Revenue tracking ──

export function trackRevenue(event: string, amount: number, currency = 'USD', properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, {
    ...properties,
    revenue: amount,
    currency,
  })
}

export { posthog }
