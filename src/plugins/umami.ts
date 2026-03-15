/**
 * Umami — Privacy-friendly, cookie-free analytics
 * Free tier: 10K events/mo on Umami Cloud (unlimited self-hosted)
 * https://umami.is
 */

let initialized = false

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

export function initUmami() {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
  const src = import.meta.env.VITE_UMAMI_SRC || 'https://cloud.umami.is/script.js'

  if (!websiteId || initialized) return
  initialized = true

  const script = document.createElement('script')
  script.defer = true
  script.src = src
  script.setAttribute('data-website-id', websiteId)

  // Respect DNT if needed
  if (import.meta.env.VITE_UMAMI_RESPECT_DNT === 'true') {
    script.setAttribute('data-do-not-track', 'true')
  }

  document.head.appendChild(script)
}

// ── Custom Events ──

export function trackUmamiEvent(event: string, data?: Record<string, unknown>) {
  if (!initialized || !window.umami) return
  window.umami.track(event, data)
}

// ── Convenience wrappers for StowStack events ──

export function trackUmamiPageView(path: string) {
  trackUmamiEvent('pageview', { url: path })
}

export function trackUmamiFormSubmission(formName: string, facilityId?: string) {
  trackUmamiEvent('form_submitted', { form: formName, facility_id: facilityId })
}

export function trackUmamiReservation(facilityId: string, unitType?: string) {
  trackUmamiEvent('reservation_started', { facility_id: facilityId, unit_type: unitType })
}

export function trackUmamiMoveIn(facilityId: string, value?: number) {
  trackUmamiEvent('move_in_completed', { facility_id: facilityId, value })
}
