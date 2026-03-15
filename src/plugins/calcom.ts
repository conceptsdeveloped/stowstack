/**
 * Cal.com — Open source scheduling
 * Free for 1 user
 * https://cal.com
 *
 * Usage: Embed scheduling on landing pages for facility tours.
 * No SDK install needed — uses Cal.com embed snippet or direct links.
 */

let initialized = false

declare global {
  interface Window {
    Cal?: {
      (action: string, ...args: unknown[]): void
      ns?: Record<string, (...args: unknown[]) => void>
      loaded?: boolean
    }
  }
}

export function initCalcom() {
  const calLink = import.meta.env.VITE_CALCOM_LINK
  if (!calLink || initialized) return
  initialized = true

  // Load Cal.com embed script
  const script = document.createElement('script')
  script.src = 'https://app.cal.com/embed/embed.js'
  script.async = true
  script.onload = () => {
    window.Cal?.('init', { origin: 'https://app.cal.com' })
  }
  document.head.appendChild(script)
}

// ── Inline Embed ──

export function getCalEmbedUrl(eventSlug?: string): string {
  const base = import.meta.env.VITE_CALCOM_LINK || ''
  if (!base) return ''
  return eventSlug ? `${base}/${eventSlug}` : base
}

/**
 * Open Cal.com scheduling as a popup modal.
 * @param eventSlug - Optional specific event type (e.g., "facility-tour")
 */
export function openCalPopup(eventSlug?: string) {
  const calLink = import.meta.env.VITE_CALCOM_LINK
  if (!calLink || !window.Cal) return

  const link = eventSlug ? `${calLink}/${eventSlug}` : calLink
  window.Cal('ui', {
    calLink: link.replace('https://cal.com/', ''),
    styles: { branding: { brandColor: '#16a34a' } },
  })
}

/**
 * React component helper — returns props for an inline Cal.com embed iframe.
 */
export function getCalEmbedProps(eventSlug?: string) {
  const url = getCalEmbedUrl(eventSlug)
  if (!url) return null

  return {
    src: `${url}?embed=true&theme=light`,
    frameBorder: '0',
    style: { width: '100%', height: '600px', border: 'none' } as React.CSSProperties,
    allow: 'payment',
    loading: 'lazy' as const,
  }
}
