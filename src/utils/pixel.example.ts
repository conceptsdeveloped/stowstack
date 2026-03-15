/**
 * EXAMPLE: How to use StowStack pixel tracking
 *
 * This file shows practical examples of pixel tracking in different scenarios.
 * Delete this file when implementing in your actual components.
 */

import {
  initializePixel,
  getPixel,
  trackConversion,
  trackLead,
  trackMoveIn,
  type StowStackEvent,
} from './pixel'

// ═══════════════════════════════════════════════════════
// EXAMPLE 1: Initialize pixel on app startup
// ═══════════════════════════════════════════════════════

export function exampleInitializePixel() {
  // Call this in useEffect in your main App component
  initializePixel({
    metaPixelId: process.env.REACT_APP_META_PIXEL_ID || '',
    googleConversionId: process.env.REACT_APP_GOOGLE_CONVERSION_ID,
    googleConversionLabel: process.env.REACT_APP_GOOGLE_CONVERSION_LABEL,
    debug: true, // Enable debug logs during development
    capiEndpoint: '/api/meta-capi',
    googleConversionEndpoint: '/api/google-conversion',
  })
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 2: Track a form submission (Lead)
// ═══════════════════════════════════════════════════════

export async function exampleTrackFormSubmission(formData: {
  name: string
  email: string
  phone: string
  facilityLocation: string
}) {
  try {
    // Submit form to API
    const response = await fetch('/api/audit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) {
      throw new Error('Form submission failed')
    }

    // Extract first and last name
    const [firstName, ...lastNameParts] = formData.name.split(' ')
    const lastName = lastNameParts.join(' ')

    // Track lead conversion to both Meta & Google
    const result = await trackLead(
      {
        email: formData.email,
        phone: formData.phone,
        firstName,
        lastName,
        city: formData.facilityLocation,
      },
      100 // Lead value: $100
    )

    console.log('Lead tracked:', result)
    return { success: true, result }
  } catch (error) {
    console.error('Error tracking lead:', error)
    // Don't let tracking errors break the user experience
    return { success: false, error }
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 3: Track a reservation started event
// ═══════════════════════════════════════════════════════

export async function exampleTrackReservationStart(userData: {
  email: string
  phone: string
  firstName: string
}, unitPrice: number) {
  try {
    const pixel = getPixel()
    const result = await pixel.trackReservationStart(userData, unitPrice)
    console.log('Reservation start tracked:', result)
  } catch (error) {
    console.error('Error tracking reservation:', error)
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 4: Track a move-in completion (Purchase)
// ═══════════════════════════════════════════════════════

export async function exampleTrackMoveInCompleted(customer: {
  email: string
  phone: string
  firstName?: string
  lastName?: string
}, moveInRevenue: number) {
  try {
    const result = await trackMoveIn(customer, moveInRevenue)
    console.log('Move-in tracked:', result)
    return result
  } catch (error) {
    console.error('Error tracking move-in:', error)
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 5: Track a unit view (ViewContent)
// ═══════════════════════════════════════════════════════

export async function exampleTrackUnitViewed(unit: {
  id: string
  size: string
  type: 'climate' | 'standard' | 'outdoor'
  monthlyPrice: number
}, customer?: { email: string; phone: string }) {
  try {
    const pixel = getPixel()
    const unitTypeName = {
      climate: 'Climate Controlled',
      standard: 'Standard',
      outdoor: 'Outdoor',
    }[unit.type]

    const result = await pixel.trackUnitViewed(
      customer,
      {
        unit_id: unit.id,
        unit_size: unit.size,
        unit_type: unitTypeName,
        price: unit.monthlyPrice,
      }
    )

    console.log('Unit view tracked:', result)
    return result
  } catch (error) {
    console.error('Error tracking unit view:', error)
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 6: Custom event tracking
// ═══════════════════════════════════════════════════════

export async function exampleTrackCustomEvent() {
  try {
    const event: StowStackEvent = {
      event_name: 'CustomEvent',
      user_data: {
        email: 'customer@example.com',
        phone: '5551234567',
        firstName: 'John',
        lastName: 'Doe',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
      },
      custom_data: {
        value: 50,
        currency: 'USD',
        content_name: 'VIP Webinar Registration',
        content_type: 'webinar',
        custom_field: 'custom_value', // You can add custom fields
      },
    }

    const result = await trackConversion(event)
    console.log('Custom event tracked:', result)
  } catch (error) {
    console.error('Error tracking custom event:', error)
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 7: Batch tracking multiple events
// ═══════════════════════════════════════════════════════

export async function exampleBatchTracking(events: StowStackEvent[]) {
  try {
    // Fire all conversions in parallel
    const results = await Promise.all(
      events.map((event) => trackConversion(event))
    )
    console.log('Batch tracking complete:', results)
    return results
  } catch (error) {
    console.error('Error in batch tracking:', error)
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 8: Track with error handling
// ═══════════════════════════════════════════════════════

export async function exampleTrackWithErrorHandling(formData: any) {
  try {
    // Submit form
    await fetch('/api/audit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    // Track conversion
    const { meta, google } = await trackLead(
      {
        email: formData.email,
        phone: formData.phone,
      },
      100
    )

    // Check individual platform responses
    if (meta?.success) {
      console.log('✓ Meta conversion tracked')
    } else {
      console.warn('✗ Meta conversion failed:', meta?.error)
      // You might want to retry or log this
    }

    if (google?.success) {
      console.log('✓ Google conversion tracked')
    } else {
      console.warn('✗ Google conversion failed:', google?.error)
    }

    // Show success to user regardless
    return { success: true }
  } catch (error) {
    console.error('Tracking error:', error)
    // Still return success to user — pixel failure shouldn't break UX
    return { success: true, trackingError: error }
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 9: Debug mode for troubleshooting
// ═══════════════════════════════════════════════════════

export function exampleEnableDebugMode() {
  const pixel = getPixel()
  pixel.setDebug(true)

  // Now all pixel operations will log to console
  // Example output:
  // [Pixel] Sending conversion: Lead
  // [Pixel] Meta client event: Lead {...}
  // [Pixel] Google client event: Lead {...}
  // [Pixel] Meta CAPI response: { success: true, ... }
  // [Pixel] Google Conversion response: { success: true, ... }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 10: React Hook for form submission tracking
// ═══════════════════════════════════════════════════════

export function useTrackableForm(onSubmit?: (data: any) => Promise<void>) {
  return async function handleSubmit(formData: any) {
    try {
      // Call parent submit handler if provided
      if (onSubmit) {
        await onSubmit(formData)
      }

      // Extract user data for tracking
      const userData = {
        email: formData.email,
        phone: formData.phone,
        firstName: formData.name?.split(' ')[0],
        lastName: formData.name?.split(' ').slice(1).join(' '),
      }

      // Determine event type based on form name
      let trackingPromise
      if (formData.facilityName) {
        // Audit form
        trackingPromise = trackLead(userData, 100)
      } else if (formData.reservationDate) {
        // Reservation form
        trackingPromise = getPixel().trackReservationStart(userData, formData.price)
      } else {
        // Generic lead
        trackingPromise = trackLead(userData)
      }

      // Fire tracking in background (don't wait for it)
      trackingPromise.catch((error) =>
        console.error('Tracking error:', error)
      )

      return { success: true }
    } catch (error) {
      console.error('Form submission error:', error)
      throw error
    }
  }
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 11: Conditional tracking based on user consent
// ═══════════════════════════════════════════════════════

export async function exampleConsentBasedTracking(
  userData: any,
  userHasConsent: boolean
) {
  if (!userHasConsent) {
    console.log('User has not consented to tracking')
    return
  }

  // Only track if user gave consent
  await trackLead(userData, 100)
}

// ═══════════════════════════════════════════════════════
// EXAMPLE 12: Track page views on navigation
// ═══════════════════════════════════════════════════════

export function exampleTrackPageViews() {
  const pixel = getPixel()

  // In a useEffect that runs on route change:
  // pixel.trackPageView()

  // Or in your router's onChange callback:
  // function onRouteChange(route) {
  //   pixel.trackPageView()
  // }
}

// ═══════════════════════════════════════════════════════
// NOTES ON IMPLEMENTATION
// ═══════════════════════════════════════════════════════

/*
1. INITIALIZATION
   - Call initializePixel() once in App.tsx useEffect
   - Should happen before any tracking calls

2. TRACKING CALLS
   - trackLead() for form submissions
   - trackMoveIn() for completed reservations
   - trackConversion() for custom events
   - All calls are async and fire in background

3. ERROR HANDLING
   - Always wrap tracking in try/catch
   - Failed tracking should NOT break user experience
   - Log errors but continue user flow

4. USER DATA
   - email and phone are required for matching
   - firstName, lastName, city, state, zip help improve matching
   - Data is hashed on server before sending to Meta/Google

5. GCLID & FBCLID
   - Auto-captured from URL params
   - Stored in sessionStorage for later use
   - Used for cross-platform attribution

6. DEBUG MODE
   - Enable debug: getPixel().setDebug(true)
   - Check console for [Pixel] log messages
   - Helpful for troubleshooting setup

7. PERFORMANCE
   - Pixel tracking is fire-and-forget (async)
   - Both Meta & Google fire simultaneously
   - ~2KB request payload, very lightweight

8. PRIVACY
   - User data is hashed with SHA-256
   - Never send card numbers, SSN, passwords
   - Respect user consent/privacy settings
*/
