import type {
  DeviceType, ViewportInfo, ScrollPosition, ConsoleError, NetworkError,
  BreadcrumbStep, EntryMetadata, EntryType, BetaPadStore, BetaPadSession,
  RecordedAction,
} from './types'

// ─── UUID generator ───

export function uuid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ─── Device detection ───

export function detectDevice(): DeviceType {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// ─── Viewport ───

export function getViewport(): ViewportInfo {
  return { width: window.innerWidth, height: window.innerHeight }
}

// ─── Scroll position ───

export function getScrollPosition(): ScrollPosition {
  const px = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  const percentage = docHeight > 0 ? Math.round((px / docHeight) * 100) : 0
  return { px, percentage }
}

// ─── Get first H1 ───

export function getH1(): string | null {
  const h1 = document.querySelector('h1')
  return h1?.textContent?.trim() ?? null
}

// ─── Get current route (pathname) ───

export function getRoute(): string {
  return window.location.pathname
}

// ─── CSS selector path for a DOM element ───

export function getCssSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    if (current.id) {
      selector += `#${current.id}`
      parts.unshift(selector)
      break
    }
    const parentEl: Element | null = current.parentElement
    if (parentEl) {
      const currentTag = current.tagName
      const siblings = Array.from(parentEl.children).filter(
        (c: Element) => c.tagName === currentTag
      )
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${idx})`
      }
    }
    if (current.className && typeof current.className === 'string') {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join('.')
      if (cls) selector += `.${cls}`
    }
    parts.unshift(selector)
    current = parentEl
  }
  return parts.join(' > ')
}

// ─── Timestamp helpers ───

export function isoTimestamp(): string {
  return new Date().toISOString()
}

export function humanTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Build metadata snapshot ───

export function captureMetadata(
  entryType: EntryType,
  sessionId: string,
  sequentialNumber: number,
  breadcrumb: BreadcrumbStep[],
  consoleErrors: ConsoleError[],
  networkErrors: NetworkError[],
  pageEnteredAt: number,
  referrerRoute: string,
): Omit<EntryMetadata, 'dom_selector' | 'screenshot_data'> {
  return {
    entry_id: uuid(),
    entry_type: entryType,
    session_id: sessionId,
    timestamp: isoTimestamp(),
    timestamp_human: humanTimestamp(),
    url: window.location.href,
    route: getRoute(),
    page_title: document.title,
    h1_content: getH1(),
    viewport: getViewport(),
    scroll_position: getScrollPosition(),
    device_type: detectDevice(),
    user_agent: navigator.userAgent,
    referrer_route: referrerRoute,
    time_on_page: Math.round((Date.now() - pageEnteredAt) / 1000),
    flow_breadcrumb: [...breadcrumb],
    console_errors: consoleErrors.slice(-10),
    network_errors: [...networkErrors],
    sequential_number: sequentialNumber,
  }
}

// ─── localStorage persistence ───

const STORAGE_KEY = 'betapad_store'
const WARN_SIZE = 4 * 1024 * 1024     // 4MB
const ARCHIVE_SIZE = 4.5 * 1024 * 1024 // 4.5MB

export function loadStore(): BetaPadStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BetaPadStore
  } catch (e) {
    console.warn('[BetaPad] Failed to load store:', e)
  }
  return { sessions: {} }
}

export function saveStore(store: BetaPadStore): { warning?: string; archived?: boolean } {
  const json = JSON.stringify(store)
  const size = new Blob([json]).size
  let result: { warning?: string; archived?: boolean } = {}

  if (size > ARCHIVE_SIZE) {
    // Archive oldest sessions
    const sessionIds = Object.keys(store.sessions).sort(
      (a, b) => new Date(store.sessions[a].started).getTime() - new Date(store.sessions[b].started).getTime()
    )
    const archived: BetaPadStore = { sessions: {} }
    while (sessionIds.length > 1) {
      const oldest = sessionIds.shift()!
      archived.sessions[oldest] = store.sessions[oldest]
      delete store.sessions[oldest]
      const newJson = JSON.stringify(store)
      if (new Blob([newJson]).size < WARN_SIZE) break
    }
    // Trigger download of archived sessions
    downloadJson(archived, `betapad-archive-${new Date().toISOString().slice(0, 10)}.json`)
    result.archived = true
  }

  const finalJson = JSON.stringify(store)
  const finalSize = new Blob([finalJson]).size
  if (finalSize > WARN_SIZE) {
    result.warning = `BetaPad storage at ${(finalSize / 1024 / 1024).toFixed(1)}MB — consider exporting old sessions`
  }

  try {
    localStorage.setItem(STORAGE_KEY, finalJson)
  } catch (e) {
    console.error('[BetaPad] Failed to save store:', e)
  }
  return result
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Screenshot capture via canvas ───

export async function captureScreenshot(_element?: Element | null): Promise<string | null> {
  // Use native getDisplayMedia for screenshot capture (no external dependencies)
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' } as MediaTrackConstraints })
    const track = stream.getVideoTracks()[0]
    // @ts-expect-error ImageCapture is available in modern browsers
    const imageCapture = new ImageCapture(track)
    const bitmap = await imageCapture.grabFrame()
    track.stop()

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    return canvas.toDataURL('image/png', 0.8)
  } catch {
    console.warn('[BetaPad] Screenshot capture cancelled or unsupported')
    return null
  }
}

// ─── Format duration ───

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// ─── Session recording helpers ───

export function describeRecordedAction(action: RecordedAction): string {
  switch (action.type) {
    case 'click': return `Clicked ${action.target || 'element'}${action.coordinates ? ` at (${action.coordinates.x}, ${action.coordinates.y})` : ''}`
    case 'scroll': return `Scrolled to ${action.value || 'position'}`
    case 'route-change': return `Navigated to ${action.value || 'page'}`
    case 'form-input': return `Input on ${action.target || 'field'}`
    case 'keypress': return `Key: ${action.value || 'unknown'}`
    default: return `Action: ${action.type}`
  }
}

// ─── Create empty session ───

export function createSession(sessionId: string): BetaPadSession {
  return {
    session_id: sessionId,
    started: isoTimestamp(),
    ended: null,
    device: detectDevice(),
    entries: [],
    flow_breadcrumb: [],
    total_pages_visited: 0,
    total_time: 0,
  }
}
