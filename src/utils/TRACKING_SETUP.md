# StowStack Tracking Setup Guide

This guide explains how to integrate and use the comprehensive UTM parameter capture and conversion tracking system.

## Overview

The tracking system consists of three integrated modules:

1. **utm.ts** - UTM parameter capture and visitor identification
2. **events.ts** - Conversion event taxonomy and tracking
3. **attribution.ts** - Attribution mapping and multi-touch attribution

## Installation & Initialization

### 1. Initialize UTM Tracking on App Load

In your main App component (e.g., `App.tsx`), initialize tracking on mount:

```tsx
import { useEffect } from 'react'
import { initUtmTracking } from '@/utils/utm'
import { setupEventQueueProcessing } from '@/utils/events'

export default function App() {
  useEffect(() => {
    // Initialize UTM parameter capture
    initUtmTracking()

    // Setup automatic event queue processing
    setupEventQueueProcessing()
  }, [])

  return (
    // Your app content
  )
}
```

## Usage

### UTM Parameters (utm.ts)

#### Get Current Session UTM Parameters

```tsx
import { getUtmParams, getVisitorId } from '@/utils/utm'

export function MyComponent() {
  useEffect(() => {
    const utmParams = getUtmParams()
    const visitorId = getVisitorId()

    console.log('UTM Params:', utmParams)
    console.log('Visitor ID:', visitorId)
    // Output:
    // UTM Params: {
    //   utm_source: 'facebook',
    //   utm_medium: 'paid_social',
    //   utm_campaign: 'summer_move_2024',
    //   stow_ad_id: 'ad_123',
    //   stow_lp_id: 'lp_landing_page_v1'
    // }
    // Visitor ID: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
  }, [])

  return <div>Component</div>
}
```

#### Get First-Touch and Last-Touch Attribution

```tsx
import { getFirstTouchUtm, getLastTouchUtm } from '@/utils/utm'

export function AttributionDebug() {
  const firstTouch = getFirstTouchUtm()
  const lastTouch = getLastTouchUtm()

  return (
    <div>
      <h3>First Touch (Original Ad)</h3>
      <pre>{JSON.stringify(firstTouch, null, 2)}</pre>

      <h3>Last Touch (Most Recent Ad)</h3>
      <pre>{JSON.stringify(lastTouch, null, 2)}</pre>
    </div>
  )
}
```

### Conversion Events (events.ts)

#### Track Page Views

```tsx
import { trackConversion, type PageViewEvent } from '@/utils/events'

export function HomePage() {
  useEffect(() => {
    const pageViewEvent: PageViewEvent = {
      type: 'page_view',
      page_url: window.location.href,
      page_title: document.title,
      timestamp: Date.now(),
    }

    trackConversion(pageViewEvent)
  }, [])

  return <div>Home Page</div>
}
```

#### Track Unit Selection

```tsx
import { trackConversion, type UnitSelectedEvent } from '@/utils/events'

export function UnitCard({ unit }) {
  const handleSelectUnit = () => {
    const event: UnitSelectedEvent = {
      type: 'unit_selected',
      unit_id: unit.id,
      unit_size: '5x10',
      unit_type: 'climate_controlled',
      price: 9999, // in cents
      facility_id: 'facility_123',
      timestamp: Date.now(),
    }

    trackConversion(event)
  }

  return <button onClick={handleSelectUnit}>Select Unit</button>
}
```

#### Track Reservation Completion

```tsx
import { trackConversion, type ReservationCompletedEvent } from '@/utils/events'

export function ReservationSuccess({ reservation }) {
  useEffect(() => {
    const event: ReservationCompletedEvent = {
      type: 'reservation_completed',
      unit_id: reservation.unit_id,
      unit_size: '10x10',
      unit_type: 'standard',
      price: 15999, // monthly rent in cents
      facility_id: 'facility_123',
      customer_email: reservation.email,
      customer_phone: reservation.phone,
      move_in_date: reservation.move_in_date, // ISO 8601
      timestamp: Date.now(),
    }

    trackConversion(event)
  }, [reservation])

  return <div>Reservation confirmed!</div>
}
```

#### Track Form Submissions

```tsx
import { trackConversion, type FormSubmittedEvent } from '@/utils/events'

export function AuditForm() {
  const handleSubmit = (formData) => {
    const event: FormSubmittedEvent = {
      type: 'form_submitted',
      form_name: 'audit_intake',
      form_fields: {
        facility_name: formData.facility_name,
        number_of_units: formData.number_of_units,
        avg_occupancy: formData.avg_occupancy,
        // Note: Never include PII or sensitive data
      },
      timestamp: Date.now(),
    }

    trackConversion(event)

    // Submit form to server
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

#### Track CTA Clicks

```tsx
import { trackConversion, type CtaClickedEvent } from '@/utils/events'

export function CallToActionButton() {
  const handleCtaClick = () => {
    const event: CtaClickedEvent = {
      type: 'cta_clicked',
      cta_text: 'Start Your Audit',
      cta_section: 'hero',
      cta_action: 'start_audit',
      facility_id: 'facility_123',
      timestamp: Date.now(),
    }

    trackConversion(event)

    // Navigate to audit
    window.location.href = '/audit'
  }

  return <button onClick={handleCtaClick}>Start Your Audit</button>
}
```

#### Track Phone Call Clicks

```tsx
import { trackConversion, type PhoneCallClickedEvent } from '@/utils/events'

export function PhoneButton({ phone }) {
  const handlePhoneClick = () => {
    const event: PhoneCallClickedEvent = {
      type: 'phone_call_clicked',
      phone_number: phone,
      context: 'header',
      facility_id: 'facility_123',
      timestamp: Date.now(),
    }

    trackConversion(event)
  }

  return (
    <a href={`tel:${phone}`} onClick={handlePhoneClick}>
      {phone}
    </a>
  )
}
```

### Attribution Data (attribution.ts)

#### Get Complete Attribution Chain

```tsx
import { buildAttributionChain } from '@/utils/attribution'

export function ConversionReportingService() {
  const submitConversion = (conversionType: string) => {
    const chain = buildAttributionChain(conversionType, Date.now())

    if (!chain) {
      console.warn('No attribution data available yet')
      return
    }

    // Chain structure:
    // {
    //   visitor_id: 'a1b2c3d4-...',
    //   first_touch: {
    //     timestamp: 1234567890,
    //     utm_source: 'facebook',
    //     utm_medium: 'paid_social',
    //     utm_campaign: 'summer_move_2024',
    //     stow_ad_id: 'ad_123',
    //     landing_page_url: '...',
    //     referrer: '...'
    //   },
    //   last_touch: { ... },
    //   touch_count: 2,
    //   session_duration_ms: 1800000,
    //   events_triggered: ['unit_selected', 'reservation_started', 'reservation_completed'],
    //   conversion_event_type: 'reservation_completed',
    //   conversion_timestamp: 1234567920
    // }

    return chain
  }
}
```

#### Get Channel Breakdown

```tsx
import { getAttributionChannelBreakdown, getCampaignSequence, getAdSequence } from '@/utils/attribution'

export function AnalyticsDashboard() {
  const channels = getAttributionChannelBreakdown()
  const campaigns = getCampaignSequence()
  const ads = getAdSequence()

  return (
    <div>
      <p>First Touch Channel: {channels.first_touch_channel}</p>
      <p>Last Touch Channel: {channels.last_touch_channel}</p>
      <p>Current Channel: {channels.current_channel}</p>

      <p>Campaign Sequence: {campaigns.join(' → ')}</p>
      <p>Ad Sequence: {ads.join(' → ')}</p>
    </div>
  )
}
```

#### Get Attribution Summary for Debugging

```tsx
import { getAttributionSummary, logAttributionDebug } from '@/utils/attribution'

export function DebugPanel() {
  const handleDebug = () => {
    const summary = getAttributionSummary()
    console.log(summary)

    // Or use the logging utility in dev mode
    logAttributionDebug()
  }

  return <button onClick={handleDebug}>Log Attribution Debug</button>
}
```

## Event Queue & Offline Support

The system automatically queues events if the API endpoint fails and retries them when the page becomes visible again.

### Manual Queue Processing

```tsx
import { processEventQueue, getQueuedEvents } from '@/utils/events'

export function SyncButton() {
  const handleManualSync = async () => {
    const queued = getQueuedEvents()
    console.log(`Processing ${queued.length} queued events...`)

    await processEventQueue()
    console.log('Queue processed')
  }

  return <button onClick={handleManualSync}>Sync Events</button>
}
```

## API Integration

The tracking system sends conversion data to `/api/track-conversion` endpoint with the following structure:

```json
{
  "event": {
    "type": "reservation_completed",
    "unit_id": "unit_123",
    "unit_size": "10x10",
    "unit_type": "standard",
    "price": 15999,
    "facility_id": "facility_123",
    "customer_email": "customer@example.com",
    "customer_phone": "555-0100",
    "move_in_date": "2024-04-01T00:00:00Z",
    "timestamp": 1234567890
  },
  "visitor_id": "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6",
  "utm_params": {
    "utm_source": "facebook",
    "utm_medium": "paid_social",
    "utm_campaign": "summer_move_2024",
    "utm_content": "carousel_ad_1",
    "stow_ad_id": "ad_123",
    "stow_lp_id": "lp_landing_page_v1"
  },
  "session_timestamp": 1234567890
}
```

### Create the API Endpoint

Create `/api/track-conversion.ts` in Vercel serverless:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { event, visitor_id, utm_params, session_timestamp } = req.body

  try {
    // Store in database
    // await db.conversions.create({
    //   visitor_id,
    //   event_type: event.type,
    //   event_data: JSON.stringify(event),
    //   utm_params: JSON.stringify(utm_params),
    //   created_at: new Date(session_timestamp),
    // })

    // Send to analytics
    // await analytics.track(visitor_id, event.type, event)

    // Send to third-party service
    // await sendToWebhook(...)

    res.status(200).json({
      success: true,
      visitor_id,
      event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    })
  } catch (error) {
    console.error('[track-conversion] Error:', error)
    res.status(500).json({ error: 'Failed to track conversion' })
  }
}
```

## Third-Party Integration

### Meta Pixel (Facebook Ads)

The system automatically fires events to Meta Pixel if `window.fbq` is available.

Add Meta Pixel to your HTML head:

```html
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  // ... Meta Pixel setup code
}(window, document, 'script', 'https://connect.facebook.net/...');
fbq('init', 'YOUR_PIXEL_ID');
</script>
```

### Google Analytics

The system automatically fires events to Google Analytics if `window.gtag` is available.

Add Google Analytics to your HTML head:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

## URL Structure for Testing

Test the system with URLs containing UTM parameters:

```
https://your-domain.com/landing-page
  ?utm_source=facebook
  &utm_medium=paid_social
  &utm_campaign=summer_move_2024
  &utm_content=carousel_ad_1
  &utm_term=moving+storage
  &stow_ad_id=ad_123456
  &stow_lp_id=lp_landing_v1
  &stow_facility_id=facility_123
```

## Data Privacy & GDPR

### Handling Sensitive Information

**DO NOT** track:
- Full email addresses in event properties (use hashed or truncated)
- Phone numbers in event properties
- Credit card or payment information
- Social security numbers or IDs
- Any personally identifiable information beyond email domain

**DO** track:
- Anonymous visitor_id (UUID)
- Campaign and ad IDs
- Unit type/size (not customer name)
- Form field names (not values)
- Event types and timestamps

### Clearing Data

```tsx
import { clearUtmTracking } from '@/utils/utm'
import { clearEventQueue } from '@/utils/events'

export function PrivacyConsent() {
  const handleOptOut = () => {
    clearUtmTracking()
    clearEventQueue()
    console.log('All tracking data cleared')
  }

  return <button onClick={handleOptOut}>Clear My Data</button>
}
```

## Debugging

### Enable Debug Logging

All modules log to console in development mode (`import.meta.env.DEV`).

### Check Current Tracking State

```tsx
import { getAttributionSummary } from '@/utils/attribution'
import { getQueuedEvents } from '@/utils/events'

export function DebugInfo() {
  const summary = getAttributionSummary()
  const queued = getQueuedEvents()

  return (
    <details>
      <summary>Tracking Debug</summary>
      <pre>{JSON.stringify({ summary, queued }, null, 2)}</pre>
    </details>
  )
}
```

## Common Patterns

### Wrap Conversions in Error Handling

```tsx
export const safeTrackConversion = async (event: ConversionEvent) => {
  try {
    await trackConversion(event)
  } catch (error) {
    console.error('[Tracking] Failed to track event:', error)
    // Event is automatically queued for retry
  }
}
```

### Track Multiple Events in Sequence

```tsx
export const trackFunnel = async (steps: ConversionEvent[]) => {
  for (const event of steps) {
    await trackConversion(event)
    // Small delay to prevent server flooding
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

### Conditional Attribution Reporting

```tsx
import { isRetargetingVisitor, getDaysSinceFirstTouch } from '@/utils/attribution'

export function ConditionalReporting() {
  const isRetargeting = isRetargetingVisitor()
  const daysSinceFirst = getDaysSinceFirstTouch()

  if (daysSinceFirst > 7) {
    console.log('Long attribution window detected')
  }

  if (isRetargeting) {
    console.log('This is a remarketing conversion')
  }
}
```

## Monitoring & Alerts

Set up monitoring for:
1. Event queue size (should stay < 10)
2. API response times (should be < 500ms)
3. Failed conversion tracking
4. UTM parameter capture rate

Create a monitoring component:

```tsx
export function TrackingMonitor() {
  useEffect(() => {
    const interval = setInterval(() => {
      const queued = getQueuedEvents()
      if (queued.length > 20) {
        console.warn(`[Tracking] High queue size: ${queued.length}`)
        // Alert team
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  return null
}
```

## Testing

### Mock Tracking in Tests

```tsx
import { vi } from 'vitest'
import * as utm from '@/utils/utm'
import * as events from '@/utils/events'

// Mock UTM tracking
vi.spyOn(utm, 'getUtmParams').mockReturnValue({
  utm_source: 'test',
  utm_medium: 'test',
})

// Mock event tracking
vi.spyOn(events, 'trackConversion').mockResolvedValue(undefined)

// Now test your components
```

## Performance Considerations

- Event tracking is non-blocking (async)
- UTM capture happens on initialization only
- Queue processing is throttled to prevent server flooding
- Sessions expire after 30 minutes of inactivity
- Visitor IDs persist for 1 year in localStorage

## Troubleshooting

**Q: Events are not being sent to Meta Pixel**
A: Ensure the Meta Pixel ID is initialized and `window.fbq` is available.

**Q: UTM parameters are not being captured**
A: Check that `initUtmTracking()` is called on app load and the URL contains query parameters.

**Q: Visitor ID is different on reload**
A: Check localStorage is enabled and not being cleared on page load.

**Q: Events are stuck in queue**
A: Check the `/api/track-conversion` endpoint is responding with 200 status.

## Next Steps

1. Implement the `/api/track-conversion` endpoint
2. Set up database schema for storing conversions
3. Configure Meta Pixel and Google Analytics IDs
4. Add StowStack custom parameter generation for landing pages
5. Set up attribution reporting dashboard
6. Test full funnel with sample data
