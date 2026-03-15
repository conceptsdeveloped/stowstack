import { useEffect, useRef, useCallback } from 'react'

/**
 * usePartialCapture — Tracks visitor behavior on landing pages and sends
 * partial lead data to the server on field blur, scroll, and exit intent.
 *
 * Captures: field values, scroll depth, time on page, exit intent.
 * Sends data to POST /api/partial-lead for recovery drip enrollment.
 */

interface PartialCaptureConfig {
  landingPageId?: string
  facilityId?: string
  enabled?: boolean
}

interface FieldData {
  email?: string
  phone?: string
  name?: string
  unitSize?: string
}

function generateSessionId(): string {
  const stored = sessionStorage.getItem('stowstack_session_id')
  if (stored) return stored
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  sessionStorage.setItem('stowstack_session_id', id)
  return id
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmContent: params.get('utm_content') || undefined,
  }
}

function getClickIds() {
  return {
    fbclid: sessionStorage.getItem('stowstack_fbclid') || undefined,
    gclid: sessionStorage.getItem('stowstack_gclid') || undefined,
  }
}

function getPrefillParams(): FieldData {
  const params = new URLSearchParams(window.location.search)
  return {
    name: params.get('prefill_name') || undefined,
    email: params.get('prefill_email') || undefined,
    phone: params.get('prefill_phone') || undefined,
  }
}

export function usePartialCapture(config: PartialCaptureConfig = {}) {
  const { landingPageId, facilityId, enabled = true } = config

  const sessionId = useRef<string>('')
  const startTime = useRef<number>(Date.now())
  const maxScroll = useRef<number>(0)
  const fieldData = useRef<FieldData>({})
  const fieldsCompleted = useRef<number>(0)
  const totalFields = useRef<number>(0)
  const exitIntentFired = useRef<boolean>(false)
  const lastSentAt = useRef<number>(0)
  const hasSent = useRef<boolean>(false)

  // Debounced send to server
  const sendPartialData = useCallback(async (extra: Partial<{ exitIntent: boolean }> = {}) => {
    // Throttle: don't send more than once per 5 seconds
    const now = Date.now()
    if (now - lastSentAt.current < 5000 && hasSent.current) return
    lastSentAt.current = now
    hasSent.current = true

    const timeOnPage = Math.round((Date.now() - startTime.current) / 1000)
    const utm = getUtmParams()
    const clickIds = getClickIds()

    try {
      await fetch('/api/partial-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.current,
          landingPageId: landingPageId || null,
          facilityId: facilityId || null,
          ...fieldData.current,
          fieldsCompleted: fieldsCompleted.current,
          totalFields: totalFields.current,
          scrollDepth: maxScroll.current,
          timeOnPage,
          exitIntent: extra.exitIntent || exitIntentFired.current,
          ...utm,
          ...clickIds,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
        }),
        keepalive: true, // ensures request completes even if page unloads
      })
    } catch {
      // Silent fail — don't break the user experience
    }
  }, [landingPageId, facilityId])

  // Track field blur events
  const onFieldBlur = useCallback((fieldName: string, value: string) => {
    if (!enabled || !value?.trim()) return

    if (fieldName === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      fieldData.current.email = value.trim().toLowerCase()
    } else if (fieldName === 'phone' && value.replace(/\D/g, '').length >= 10) {
      fieldData.current.phone = value.trim()
    } else if (fieldName === 'name') {
      fieldData.current.name = value.trim()
    } else if (fieldName === 'unitSize' || fieldName === 'unit_size') {
      fieldData.current.unitSize = value.trim()
    }

    fieldsCompleted.current++
    sendPartialData()
  }, [enabled, sendPartialData])

  // Set total field count for scoring
  const setTotalFields = useCallback((count: number) => {
    totalFields.current = count
  }, [])

  useEffect(() => {
    if (!enabled) return

    sessionId.current = generateSessionId()

    // Check for prefill params (returning from recovery email)
    const prefill = getPrefillParams()
    if (prefill.name) fieldData.current.name = prefill.name
    if (prefill.email) fieldData.current.email = prefill.email
    if (prefill.phone) fieldData.current.phone = prefill.phone

    // Track recovery attribution
    const params = new URLSearchParams(window.location.search)
    const recoveryId = params.get('recovery_id')
    if (recoveryId) {
      sessionStorage.setItem('stowstack_recovery_id', recoveryId)
    }

    // Scroll depth tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100)
        if (depth > maxScroll.current) {
          maxScroll.current = depth
        }
      }
    }

    // Exit intent detection (mouse leaves viewport from top)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentFired.current) {
        exitIntentFired.current = true
        sendPartialData({ exitIntent: true })
      }
    }

    // Send data on page unload (visibility change is more reliable than beforeunload)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendPartialData()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Send initial beacon after 10 seconds if user is still on page
    const timer = setTimeout(() => {
      if (maxScroll.current > 10 || fieldData.current.email) {
        sendPartialData()
      }
    }, 10000)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timer)
    }
  }, [enabled, sendPartialData])

  return {
    onFieldBlur,
    setTotalFields,
    exitIntentFired: exitIntentFired.current,
    sessionId: sessionId.current,
    prefillData: getPrefillParams(),
  }
}

/**
 * useExitIntent — Shows an exit-intent popup to capture email before bounce.
 * Returns showPopup state and a dismiss function.
 */
export function useExitIntent(enabled = true) {
  const shown = useRef(false)
  const dismissed = useRef(false)
  const callbackRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Don't show if already dismissed this session
    if (sessionStorage.getItem('stowstack_exit_dismissed')) {
      dismissed.current = true
      return
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !shown.current && !dismissed.current) {
        shown.current = true
        callbackRef.current?.()
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [enabled])

  const onExitIntent = useCallback((cb: () => void) => {
    callbackRef.current = cb
  }, [])

  const dismiss = useCallback(() => {
    dismissed.current = true
    sessionStorage.setItem('stowstack_exit_dismissed', '1')
  }, [])

  return { onExitIntent, dismiss }
}
