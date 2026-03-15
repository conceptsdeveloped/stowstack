/**
 * IMPLEMENTATION EXAMPLES
 *
 * Real-world examples of how to integrate UTM and conversion tracking
 * into StowStack landing pages and components.
 *
 * Copy and adapt these examples to your use cases.
 */

import { useEffect, useState } from 'react'
import {
  initUtmTracking,
  getUtmParams,
  getVisitorId,
  getFirstTouchUtm,
  getLastTouchUtm,
} from './utm'

import {
  trackConversion,
  setupEventQueueProcessing,
  getQueuedEvents,
  type PageViewEvent,
  type UnitSelectedEvent,
  type ReservationCompletedEvent,
  type ReservationStartedEvent,
  type FormSubmittedEvent,
  type CtaClickedEvent,
  type PhoneCallClickedEvent,
} from './events'

import {
  getAttributionDataBundle,
  getAttributionChannelBreakdown,
  isRetargetingVisitor,
  getDaysSinceFirstTouch,
  getAttributionSummary,
  buildAttributionChain,
} from './attribution'

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Initialize Tracking on App Load
// ═══════════════════════════════════════════════════════════════════════════

export function AppInitializationExample() {
  useEffect(() => {
    // Step 1: Initialize UTM capture
    initUtmTracking()

    // Step 2: Set up automatic event queue processing
    setupEventQueueProcessing()

    // Step 3: Log for debugging
    if (import.meta.env.DEV) {
      console.log('Tracking initialized')
      console.log('Visitor ID:', getVisitorId())
      console.log('UTM Params:', getUtmParams())
    }
  }, [])

  return <div>App loaded with tracking</div>
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Landing Page with Page View Tracking
// ═══════════════════════════════════════════════════════════════════════════

export function LandingPageExample() {
  const [utmParams, setUtmParams] = useState<Record<string, string>>({})

  useEffect(() => {
    // Track page view
    const event: PageViewEvent = {
      type: 'page_view',
      page_url: window.location.href,
      page_title: document.title,
      timestamp: Date.now(),
    }

    trackConversion(event)

    // Get and display UTM data
    const params = getUtmParams()
    setUtmParams(params)

    // In dev, log attribution
    if (import.meta.env.DEV) {
      console.log('[Page View]', {
        url: window.location.href,
        utm: params,
        visitor_id: getVisitorId(),
      })
    }
  }, [])

  return (
    <div>
      <h1>Welcome to {utmParams.utm_campaign || 'StowStack'}</h1>
      <p>Coming from: {utmParams.utm_source || 'Direct'}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Unit Selection with Tracking
// ═══════════════════════════════════════════════════════════════════════════

interface Unit {
  id: string
  size: string // e.g., "5x10"
  type: string // e.g., "climate_controlled"
  monthlyPrice: number // in cents
  facilityId: string
}

interface UnitCardProps {
  unit: Unit
  onSelect: (unit: Unit) => void
}

export function UnitCardExample({ unit, onSelect }: UnitCardProps) {
  const handleSelectUnit = async () => {
    // Track the selection
    const event: UnitSelectedEvent = {
      type: 'unit_selected',
      unit_id: unit.id,
      unit_size: unit.size,
      unit_type: unit.type,
      price: unit.monthlyPrice,
      facility_id: unit.facilityId,
      timestamp: Date.now(),
    }

    try {
      await trackConversion(event)

      if (import.meta.env.DEV) {
        console.log('[Unit Selected]', event)
      }

      // Now proceed with selection
      onSelect(unit)
    } catch (error) {
      console.error('Tracking error:', error)
      // Still proceed even if tracking fails
      onSelect(unit)
    }
  }

  return (
    <div className="unit-card">
      <h3>{unit.size} {unit.type}</h3>
      <p className="price">${(unit.monthlyPrice / 100).toFixed(2)}/month</p>
      <button onClick={handleSelectUnit}>Select Unit</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Reservation Flow with Multiple Events
// ═══════════════════════════════════════════════════════════════════════════

interface ReservationFormData {
  email: string
  phone: string
  moveInDate: string
  unitId: string
  unitSize: string
  unitType: string
  monthlyPrice: number
  facilityId: string
}

export function ReservationFormExample({ unit }: { unit: Unit }) {
  const [step, setStep] = useState<'details' | 'confirmation'>('details')

  const handleStartReservation = () => {
    // Track start of reservation flow
    const event: ReservationStartedEvent = {
      type: 'reservation_started',
      unit_id: unit.id,
      unit_size: unit.size,
      unit_type: unit.type,
      facility_id: unit.facilityId,
      timestamp: Date.now(),
    }

    trackConversion(event)
    setStep('confirmation')
  }

  const handleCompleteReservation = async (formData: ReservationFormData) => {
    // Track reservation completion
    const event: ReservationCompletedEvent = {
      type: 'reservation_completed',
      unit_id: formData.unitId,
      unit_size: formData.unitSize,
      unit_type: formData.unitType,
      price: formData.monthlyPrice,
      facility_id: formData.facilityId,
      customer_email: formData.email,
      customer_phone: formData.phone,
      move_in_date: formData.moveInDate,
      timestamp: Date.now(),
    }

    try {
      await trackConversion(event)

      if (import.meta.env.DEV) {
        // Log attribution data
        const attribution = getAttributionDataBundle()
        console.log('[Reservation Completed]', {
          event,
          attribution,
        })
      }

      // Submit to backend
      await submitReservation(formData)
    } catch (error) {
      console.error('Reservation tracking error:', error)
      // Still submit even if tracking fails
      await submitReservation(formData)
    }
  }

  return (
    <div>
      {step === 'details' && (
        <button onClick={handleStartReservation}>Start Reservation</button>
      )}
      {step === 'confirmation' && (
        <ReservationForm onSubmit={handleCompleteReservation} />
      )}
    </div>
  )
}

async function submitReservation(data: ReservationFormData) {
  // Implementation
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Form Submission Tracking
// ═══════════════════════════════════════════════════════════════════════════

interface AuditFormData {
  facilityName: string
  numberOfUnits: number
  averageOccupancy: number
  email: string // Will be hashed before tracking
}

export function AuditFormExample() {
  const handleSubmitAuditForm = async (formData: AuditFormData) => {
    // Track form submission (without sensitive PII)
    const event: FormSubmittedEvent = {
      type: 'form_submitted',
      form_name: 'audit_intake',
      form_fields: {
        facility_name: formData.facilityName,
        number_of_units: formData.numberOfUnits.toString(),
        average_occupancy: formData.averageOccupancy.toString(),
        // NOTE: Never include raw email, phone, or other sensitive data
      },
      timestamp: Date.now(),
    }

    try {
      await trackConversion(event)

      // Submit form data to backend
      const response = await fetch('/api/audit-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          visitor_id: getVisitorId(),
          utm_params: getUtmParams(),
          attribution: getAttributionDataBundle(),
        }),
      })

      if (!response.ok) throw new Error('Form submission failed')

      if (import.meta.env.DEV) {
        console.log('[Form Submitted]', event)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      // Show error to user
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        handleSubmitAuditForm({
          facilityName: formData.get('facilityName') as string,
          numberOfUnits: parseInt(formData.get('numberOfUnits') as string),
          averageOccupancy: parseFloat(formData.get('averageOccupancy') as string),
          email: formData.get('email') as string,
        })
      }}
    >
      <input name="facilityName" placeholder="Facility name" required />
      <input name="numberOfUnits" type="number" placeholder="Number of units" required />
      <input name="averageOccupancy" type="number" placeholder="Average occupancy %" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Request Audit</button>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: CTA Button Tracking
// ═══════════════════════════════════════════════════════════════════════════

interface CTAButtonProps {
  text: string
  section: string
  action: string
  onClick?: () => void
  facilityId?: string
}

export function CTAButtonExample({
  text,
  section,
  action,
  onClick,
  facilityId,
}: CTAButtonProps) {
  const handleCtaClick = () => {
    // Track CTA click
    const event: CtaClickedEvent = {
      type: 'cta_clicked',
      cta_text: text,
      cta_section: section,
      cta_action: action,
      facility_id: facilityId,
      timestamp: Date.now(),
    }

    trackConversion(event)

    // Execute custom handler
    onClick?.()
  }

  return <button onClick={handleCtaClick}>{text}</button>
}

// Usage:
export function HeroSectionExample() {
  const handleStartAudit = () => {
    window.location.href = '/audit'
  }

  return (
    <div className="hero">
      <h1>Fill Your Units Faster</h1>
      <CTAButtonExample
        text="Start Your Audit"
        section="hero"
        action="start_audit"
        onClick={handleStartAudit}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 7: Phone Click Tracking
// ═══════════════════════════════════════════════════════════════════════════

interface PhoneButtonProps {
  phoneNumber: string
  context: string
  facilityId?: string
}

export function PhoneButtonExample({
  phoneNumber,
  context,
  facilityId,
}: PhoneButtonProps) {
  const handlePhoneClick = () => {
    // Track phone call click
    const event: PhoneCallClickedEvent = {
      type: 'phone_call_clicked',
      phone_number: phoneNumber,
      context,
      facility_id: facilityId,
      timestamp: Date.now(),
    }

    trackConversion(event)

    // The actual call happens after tracking
  }

  return (
    <a href={`tel:${phoneNumber}`} onClick={handlePhoneClick}>
      {phoneNumber}
    </a>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 8: Attribution Data Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export function AttributionDashboardExample() {
  const [attribution, setAttribution] = useState<ReturnType<typeof getAttributionDataBundle>>(null)
  const [channels, setChannels] = useState<ReturnType<typeof getAttributionChannelBreakdown> | null>(null)

  useEffect(() => {
    const data = getAttributionDataBundle()
    const channelData = getAttributionChannelBreakdown()

    setAttribution(data)
    setChannels(channelData)
  }, [])

  if (!attribution || !channels) {
    return <div>Loading attribution data...</div>
  }

  return (
    <div className="attribution-dashboard">
      <h2>Attribution Analysis</h2>

      <section>
        <h3>Channel Journey</h3>
        <p>First Touch: <strong>{channels.first_touch_channel}</strong></p>
        <p>Last Touch: <strong>{channels.last_touch_channel}</strong></p>
        <p>Current: <strong>{channels.current_channel}</strong></p>
      </section>

      <section>
        <h3>Time Data</h3>
        <p>Days Since First: {getDaysSinceFirstTouch()}</p>
        <p>Remarketing: {isRetargetingVisitor() ? 'Yes' : 'No'}</p>
      </section>

      <section>
        <h3>Session Details</h3>
        <details>
          <summary>View Full Data</summary>
          <pre>{JSON.stringify(attribution, null, 2)}</pre>
        </details>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 9: Attribution Chain Building (for backend reporting)
// ═══════════════════════════════════════════════════════════════════════════

export function BuildAttributionChainExample() {
  const handleReportConversion = (conversionType: string) => {
    // Build the complete attribution chain
    const chain = buildAttributionChain(conversionType, Date.now())

    if (!chain) {
      console.warn('No attribution data available')
      return
    }

    // Structure:
    // {
    //   visitor_id: 'abc123...',
    //   first_touch: { timestamp, utm_params, landing_page_url, referrer },
    //   last_touch: { timestamp, utm_params, landing_page_url, referrer },
    //   touch_count: 2,
    //   session_duration_ms: 1800000,
    //   events_triggered: ['page_view', 'unit_selected', 'reservation_completed'],
    //   conversion_event_type: 'reservation_completed',
    //   conversion_timestamp: 1234567890
    // }

    console.log('Attribution Chain:', chain)

    // Send to analytics/reporting service
    return chain
  }

  return (
    <button onClick={() => handleReportConversion('reservation_completed')}>
      Report Conversion
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 10: Debug Panel (for development)
// ═══════════════════════════════════════════════════════════════════════════

export function DebugPanelExample() {
  const [summary, setSummary] = useState<ReturnType<typeof getAttributionSummary> | null>(null)
  const [queued, setQueued] = useState<ReturnType<typeof getQueuedEvents>>([])

  const handleRefresh = () => {
    setSummary(getAttributionSummary())
    setQueued(getQueuedEvents())
  }

  useEffect(() => {
    handleRefresh()
  }, [])

  if (!import.meta.env.DEV) {
    return null // Only show in development
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: '400px',
      maxHeight: '400px',
      background: '#1a1a1a',
      color: '#0f0',
      padding: '1rem',
      fontSize: '12px',
      fontFamily: 'monospace',
      overflow: 'auto',
      zIndex: 9999,
      border: '2px solid #0f0',
    }}>
      <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>
        [DEBUG]
        <button
          onClick={handleRefresh}
          style={{
            float: 'right',
            background: '#0f0',
            color: '#000',
            border: 'none',
            padding: '2px 6px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Refresh
        </button>
      </h4>

      <section>
        <strong>Attribution Summary:</strong>
        <pre style={{ margin: 0, fontSize: '10px' }}>
          {JSON.stringify(summary, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <strong>Queued Events ({queued.length}):</strong>
        <pre style={{ margin: 0, fontSize: '10px' }}>
          {JSON.stringify(queued.map(q => ({ id: q.id, type: q.event.event.type, retries: q.retry_count })), null, 2)}
        </pre>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT HELPER: Use with StrictMode for Testing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Safe tracking wrapper that catches errors
 */
export const safeTrackConversion = async (event: any) => {
  try {
    await trackConversion(event)
    return true
  } catch (error) {
    console.error('[Tracking] Error:', error)
    return false
  }
}

/**
 * Mock tracking for testing
 */
export const mockTrackConversion = vi?.fn(async () => {})

/**
 * Verify tracking is working
 */
export async function verifyTracking() {
  const visitorId = getVisitorId()
  const params = getUtmParams()
  const attribution = getAttributionDataBundle()

  return {
    isInitialized: !!visitorId,
    hasParams: Object.keys(params).length > 0,
    hasAttribution: !!attribution,
    summary: {
      visitor_id: visitorId,
      params,
      attribution,
    },
  }
}

// Module declaration (to avoid TypeScript errors in tests)
declare const vi: any
