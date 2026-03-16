/**
 * Cookie consent management for GDPR/CCPA compliance.
 *
 * Gates all tracking pixels (Meta, Google) behind user consent.
 * Persists consent state in localStorage.
 */

const CONSENT_KEY = 'stowstack_tracking_consent'
const CONSENT_EXPIRY_KEY = 'stowstack_tracking_consent_at'
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

export type ConsentStatus = 'granted' | 'denied' | 'pending'

/**
 * Get the current consent status.
 * Returns 'pending' if the user hasn't made a choice yet.
 */
export function getConsentStatus(): ConsentStatus {
  try {
    const status = localStorage.getItem(CONSENT_KEY)
    if (!status) return 'pending'

    // Check if consent has expired (re-prompt after 1 year)
    const consentedAt = localStorage.getItem(CONSENT_EXPIRY_KEY)
    if (consentedAt && Date.now() - Number(consentedAt) > CONSENT_TTL_MS) {
      localStorage.removeItem(CONSENT_KEY)
      localStorage.removeItem(CONSENT_EXPIRY_KEY)
      return 'pending'
    }

    return status === 'granted' ? 'granted' : 'denied'
  } catch {
    // localStorage unavailable (incognito, SSR, etc.)
    return 'pending'
  }
}

/**
 * Check if tracking is allowed.
 */
export function hasTrackingConsent(): boolean {
  return getConsentStatus() === 'granted'
}

/**
 * Record the user's consent choice.
 */
export function setConsent(status: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, status)
    localStorage.setItem(CONSENT_EXPIRY_KEY, String(Date.now()))
  } catch {
    // localStorage unavailable
  }

  // Notify listeners
  window.dispatchEvent(new CustomEvent('stowstack:consent', { detail: { status } }))
}

/**
 * Revoke consent and clear tracking data.
 */
export function revokeConsent(): void {
  setConsent('denied')

  // Clear tracking identifiers
  try {
    sessionStorage.removeItem('stowstack_gclid')
    sessionStorage.removeItem('stowstack_fbclid')
  } catch {
    // ignore
  }
}

/**
 * Listen for consent changes.
 */
export function onConsentChange(callback: (status: ConsentStatus) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail
    callback(detail.status)
  }
  window.addEventListener('stowstack:consent', handler)
  return () => window.removeEventListener('stowstack:consent', handler)
}
