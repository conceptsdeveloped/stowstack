# UTM & Conversion Tracking - Quick Reference

## Quick Start

### 1. Initialize on App Load

```tsx
import { initUtmTracking } from '@/utils/utm'
import { setupEventQueueProcessing } from '@/utils/events'

useEffect(() => {
  initUtmTracking()
  setupEventQueueProcessing()
}, [])
```

### 2. Track Events

```tsx
import { trackConversion } from '@/utils/events'

// Page view
trackConversion({ type: 'page_view', page_url, page_title, timestamp })

// Unit selected
trackConversion({ type: 'unit_selected', unit_id, unit_size, unit_type, price, facility_id, timestamp })

// Reservation completed
trackConversion({ type: 'reservation_completed', unit_id, price, facility_id, timestamp })

// Form submitted
trackConversion({ type: 'form_submitted', form_name, timestamp })

// Phone click
trackConversion({ type: 'phone_call_clicked', phone_number, context, timestamp })

// CTA click
trackConversion({ type: 'cta_clicked', cta_text, cta_section, cta_action, timestamp })
```

### 3. Get Attribution Data

```tsx
import { getUtmParams, getVisitorId } from '@/utils/utm'
import { getAttributionSummary } from '@/utils/attribution'

const utmParams = getUtmParams()
const visitorId = getVisitorId()
const summary = getAttributionSummary()
```

## Key Functions

### utm.ts

| Function | Returns | Purpose |
|----------|---------|---------|
| `initUtmTracking()` | void | Initialize tracking on page load |
| `getUtmParams()` | `UtmParams` | Get current session UTM params |
| `getVisitorId()` | string | Get unique visitor ID |
| `getFirstTouchUtm()` | `FirstTouchAttribution \| null` | Get original ad data |
| `getLastTouchUtm()` | `LastTouchAttribution \| null` | Get most recent ad data |
| `getCurrentSession()` | `UtmSession \| null` | Get full session data |
| `getAttributionData()` | `AttributionData \| null` | Get complete attribution bundle |
| `clearUtmTracking()` | void | Clear all tracking data |
| `resetSession()` | void | Start new session |
| `updateSessionUtmParams()` | void | Update params if re-landing with new UTM |

### events.ts

| Function | Returns | Purpose |
|----------|---------|---------|
| `trackConversion(event)` | `Promise<void>` | Track any conversion event |
| `processEventQueue()` | `Promise<void>` | Process queued events |
| `getQueuedEvents()` | `QueuedEvent[]` | Get offline queue |
| `removeQueuedEvent(id)` | void | Remove from queue |
| `setupEventQueueProcessing()` | void | Enable auto queue processing |
| `clearEventQueue()` | void | Clear all queued events |

### attribution.ts

| Function | Returns | Purpose |
|----------|---------|---------|
| `buildAttributionChain(type, timestamp)` | `AttributionChain \| null` | Build complete journey |
| `calculateAttributionCredits()` | `AttributionCredit \| null` | Multi-touch credit split |
| `getAttributionChannelBreakdown()` | object | Group by source/medium |
| `getCampaignSequence()` | string[] | Campaign order |
| `getAdSequence()` | string[] | Ad ID order |
| `isRetargetingVisitor()` | boolean | Check if retargeting context |
| `getDaysSinceFirstTouch()` | number | Days between first and now |
| `getSecondsSinceLastTouch()` | number | Seconds since last visit |
| `getAttributionSummary()` | object | Debug-friendly summary |
| `logAttributionDebug()` | void | Log full data to console |

## Event Types

### Supported Events

```
page_view
unit_selected
reservation_started
reservation_completed
move_in_completed
form_submitted
phone_call_clicked
cta_clicked
```

### Event Properties

All events have:
- `type` - The event type
- `timestamp` - Date.now()

Specific properties:
```tsx
// page_view
{ page_url, page_title }

// unit_selected
{ unit_id, unit_size, unit_type, price, facility_id }

// reservation_started
{ unit_id, unit_size, unit_type, facility_id }

// reservation_completed
{ unit_id, unit_size, unit_type, price, facility_id, customer_email?, customer_phone?, move_in_date? }

// move_in_completed
{ unit_id, facility_id, customer_id, actual_move_in_date, monthly_rent }

// form_submitted
{ form_name, form_fields? }

// phone_call_clicked
{ phone_number, context?, facility_id? }

// cta_clicked
{ cta_text, cta_section?, cta_action, facility_id? }
```

## UTM Parameters Captured

### Standard
- utm_source (e.g., "facebook", "google")
- utm_medium (e.g., "paid_social", "search")
- utm_campaign (e.g., "summer_move_2024")
- utm_content (e.g., "carousel_ad_1")
- utm_term (e.g., "moving+storage")

### Custom StowStack
- stow_ad_id (specific ad ID)
- stow_lp_id (landing page variant)
- stow_facility_id (specific facility)

## Data Flow

```
URL Parameters
    ↓
initUtmTracking() → sessionStorage/localStorage
    ↓
getUtmParams() / getVisitorId()
    ↓
trackConversion(event)
    ↓
┌─────────────────────────────────────┐
│ Meta Pixel (fbq) - if available     │
│ Google Analytics (gtag) - if avail  │
│ Custom API (/api/track-conversion)  │
└─────────────────────────────────────┘
    ↓
✓ Success → Continue
✗ Failure → Queue for retry
```

## Common Patterns

### Track on Interaction
```tsx
const handleClick = () => {
  trackConversion({ type: 'cta_clicked', ... })
  // Then navigate
}
```

### Track with Form Data (Scrubbed)
```tsx
const handleSubmit = (data) => {
  trackConversion({
    type: 'form_submitted',
    form_name: 'audit_intake',
    form_fields: {
      number_of_units: data.units, // OK
      // email: data.email, // ✗ Never raw PII
    }
  })
}
```

### Get Full Attribution for API
```tsx
const bundle = getAttributionDataBundle()
// Send to server with conversion data
await fetch('/api/save-conversion', {
  method: 'POST',
  body: JSON.stringify({ bundle, conversion })
})
```

## Storage Breakdown

### localStorage (Persistent)
- `stowstack_visitor_id` - Unique visitor UUID
- `stowstack_first_touch` - Original campaign data
- `stowstack_last_touch` - Most recent campaign data

### sessionStorage (Per Tab)
- `stowstack_current_session` - Current visit UTM data
- `stowstack_event_queue` - Offline event queue
- `stowstack_event_dedup` - Duplicate prevention timestamps

## Debugging

### Dev Console
```js
// Check current tracking state
import { getAttributionSummary } from '@/utils/attribution'
getAttributionSummary()

// Log everything
logAttributionDebug()

// Check queued events
import { getQueuedEvents } from '@/utils/events'
getQueuedEvents()
```

### Check if Initialized
```js
// Visitor ID exists?
localStorage.getItem('stowstack_visitor_id')

// UTM data captured?
sessionStorage.getItem('stowstack_current_session')

// Events queued?
sessionStorage.getItem('stowstack_event_queue')
```

## Testing URLs

```
/landing?utm_source=facebook&utm_medium=paid_social&utm_campaign=test&stow_ad_id=ad_123&stow_lp_id=lp_1
/landing?utm_source=google&utm_medium=search&utm_campaign=test&utm_term=climate+storage
/landing?stow_facility_id=facility_456 (direct traffic tracking)
```

## Monitoring Checklist

- [ ] Events are being queued (check sessionStorage)
- [ ] Queue size stays < 10 items
- [ ] API endpoint returns 200 status
- [ ] Meta Pixel initialized (fbq in console)
- [ ] Google Analytics initialized (gtag in console)
- [ ] No JavaScript errors in console
- [ ] Visitor ID persists across page loads
- [ ] UTM params captured from URL

## Privacy

**Never track:**
- Raw email addresses
- Phone numbers
- Payment information
- SSN/IDs
- Customer names

**Safe to track:**
- Campaign/ad IDs
- Unit type/size
- Form field presence (not values)
- Event types
- Timestamps

**To clear data:**
```tsx
import { clearUtmTracking } from '@/utils/utm'
import { clearEventQueue } from '@/utils/events'

clearUtmTracking()
clearEventQueue()
```

## File Locations

- `/src/utils/utm.ts` - UTM parameter capture
- `/src/utils/events.ts` - Event tracking
- `/src/utils/attribution.ts` - Attribution mapping
- `/src/utils/TRACKING_SETUP.md` - Full guide
- `/src/utils/TRACKING_QUICK_REFERENCE.md` - This file
