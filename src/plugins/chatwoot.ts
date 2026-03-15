/**
 * Chatwoot — Open source live chat widget
 * Free self-hosted, free cloud tier available
 * https://chatwoot.com
 */

let initialized = false

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot?: {
      toggle: (state?: 'open' | 'close') => void
      setUser: (id: string, data: Record<string, unknown>) => void
      setCustomAttributes: (attrs: Record<string, unknown>) => void
      setLabel: (label: string) => void
      removeLabel: (label: string) => void
      reset: () => void
    }
  }
}

export function initChatwoot() {
  const token = import.meta.env.VITE_CHATWOOT_TOKEN
  const baseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://app.chatwoot.com'

  if (!token || initialized) return
  initialized = true

  window.chatwootSettings = {
    position: 'right',
    type: 'standard',
    launcherTitle: 'Chat with us',
  }

  const script = document.createElement('script')
  script.src = `${baseUrl}/packs/js/sdk.js`
  script.async = true
  script.defer = true
  script.onload = () => {
    window.chatwootSDK?.run({ websiteToken: token, baseUrl })
  }
  document.head.appendChild(script)
}

// ── Identity ──

export function setChatwootUser(userId: string, data: { email?: string; name?: string; phone?: string }) {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.setUser(userId, {
    email: data.email,
    name: data.name,
    phone_number: data.phone,
  })
}

export function setChatwootFacility(facilityId: string, facilityName: string) {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.setCustomAttributes({
    facility_id: facilityId,
    facility_name: facilityName,
  })
}

// ── Labels (for routing conversations) ──

export function addChatwootLabel(label: string) {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.setLabel(label)
}

// ── Widget Control ──

export function openChat() {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.toggle('open')
}

export function closeChat() {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.toggle('close')
}

export function resetChat() {
  if (!initialized || !window.$chatwoot) return
  window.$chatwoot.reset()
}
