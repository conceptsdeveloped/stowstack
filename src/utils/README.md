# StowStack Tracking System

Complete UTM parameter capture and multi-touch attribution tracking system for self-storage demand engine landing pages.

## Files in This Directory

### Core Implementation Files

#### `utm.ts` (444 lines, 13KB)
UTM parameter capture and visitor identification utility.

**Key Exports:**
- `initUtmTracking()` - Initialize tracking on page load
- `getUtmParams()` - Get current session UTM parameters
- `getVisitorId()` - Get unique visitor UUID
- `getFirstTouchUtm()` / `getLastTouchUtm()` - Get original/recent campaign data
- `getAttributionData()` - Complete attribution bundle
- `clearUtmTracking()` - Clear all tracking data

**Storage:** Uses localStorage (persistent) and sessionStorage (per-tab)

#### `events.ts` (665 lines, 19KB)
Event taxonomy and conversion tracking layer.

**Supported Events:**
1. `page_view` - Page load
2. `unit_selected` - Storage unit selected
3. `reservation_started` - Reservation flow started
4. `reservation_completed` - Unit reserved
5. `move_in_completed` - Customer moved in
6. `form_submitted` - Form submission
7. `phone_call_clicked` - Phone number clicked
8. `cta_clicked` - CTA button clicked

**Key Exports:**
- `trackConversion(event)` - Track any conversion event
- `setupEventQueueProcessing()` - Enable auto-retry
- `processEventQueue()` - Manual queue processing
- `getQueuedEvents()` - Get offline queue

**Integrations:**
- Meta Pixel (fbq)
- Google Analytics (gtag)
- Custom API (/api/track-conversion)

#### `attribution.ts` (502 lines, 15KB)
Attribution mapping and multi-touch attribution models.

**Key Exports:**
- `buildAttributionChain()` - Build complete visitor journey
- `getAttributionDataBundle()` - Complete API payload
- `getAttributionChannelBreakdown()` - Group by source/medium
- `getCampaignSequence()` / `getAdSequence()` - Sequence tracking
- `isRetargetingVisitor()` - Retargeting detection
- `getDaysSinceFirstTouch()` - Time gap calculation
- `getAttributionSummary()` - Debug-friendly summary

**Attribution Models:**
- First-touch (100% to original ad)
- Last-touch (100% to final ad)
- Linear (50/50 split)
- Time-decay (exponential weighting)
- Position-based (40/40/20 split)

### Documentation Files

#### `TRACKING_SETUP.md` (660 lines, 16KB)
**Complete integration guide with:**
- Installation & initialization
- Usage examples for all features
- API endpoint integration
- Third-party setup (Meta, Google)
- Privacy & GDPR guidelines
- Debugging techniques
- Common patterns & best practices
- Monitoring & alerting
- Troubleshooting guide

**Start here for:** Full feature understanding and integration

#### `TRACKING_QUICK_REFERENCE.md` (302 lines, 8KB)
**Quick lookup reference with:**
- Function tables
- Event types summary
- Parameter reference
- Data flow diagram
- Storage breakdown
- Testing URLs
- Privacy checklist
- Common patterns

**Start here for:** Quick function lookup and patterns

#### `IMPLEMENTATION_EXAMPLES.tsx` (487 lines, 20KB)
**Real-world code examples including:**
1. App initialization
2. Landing page with page views
3. Unit selection tracking
4. Reservation flow (started → completed)
5. Form submission tracking
6. CTA button tracking
7. Phone click tracking
8. Attribution dashboard
9. Attribution chain building
10. Debug panel component

**Start here for:** Copy-paste ready code patterns

### Summary & Checklist

#### `TRACKING_INTEGRATION_SUMMARY.txt`
High-level overview, testing checklist, quick start, next steps, and checklist for implementation.

## Quick Start (3 Steps)

### 1. Initialize in App Component

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

trackConversion({
  type: 'unit_selected',
  unit_id: 'unit_123',
  unit_size: '10x10',
  unit_type: 'climate_controlled',
  price: 15999,
  facility_id: 'facility_123',
  timestamp: Date.now()
})
```

### 3. Create API Endpoint

```typescript
// /api/track-conversion.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event, visitor_id, utm_params } = req.body

  // Store in database
  // await db.conversions.create({ event, visitor_id, utm_params })

  res.status(200).json({ success: true })
}
```

## Architecture

```
Page Load with UTM
     ↓
initUtmTracking() → localStorage/sessionStorage
     ↓
getUtmParams() / getVisitorId()
     ↓
User Interaction
     ↓
trackConversion(event)
     ↓
┌────────────────────────────────────┐
│ Meta Pixel → (fbq)                 │
│ Google Analytics → (gtag)          │
│ Custom API → (/api/track-conversion)│
└────────────────────────────────────┘
     ↓
✓ Success → Continue
✗ Failure → Queue for Retry
     ↓
Automatic Retry
(Visibility change or 30s interval)
```

## Data Flow

### UTM Parameters Captured

**Standard:**
- utm_source (e.g., "facebook")
- utm_medium (e.g., "paid_social")
- utm_campaign (e.g., "summer_move_2024")
- utm_content (e.g., "carousel_ad_1")
- utm_term (e.g., "climate+storage")

**Custom StowStack:**
- stow_ad_id (specific ad ID)
- stow_lp_id (landing page variant)
- stow_facility_id (specific facility)

### Outbound API Payload

```json
{
  "event": { /* conversion event */ },
  "visitor_id": "uuid-...",
  "utm_params": { /* utm parameters */ },
  "session_timestamp": 1234567890
}
```

## Key Features

✓ Automatic UTM parameter extraction  
✓ Persistent visitor ID (UUID v4)  
✓ Cross-session attribution tracking  
✓ 8 conversion event types  
✓ Automatic deduplication  
✓ Offline event queuing  
✓ Auto-retry with backoff  
✓ Meta Pixel integration  
✓ Google Analytics integration  
✓ Multi-touch attribution models  
✓ Retargeting detection  
✓ Full TypeScript support  
✓ GDPR compliant  
✓ Non-blocking async  

## File Size Impact

- utm.ts: ~13KB (minified ~3KB)
- events.ts: ~19KB (minified ~5KB)
- attribution.ts: ~15KB (minified ~4KB)
- **Total: ~47KB unminified, ~12KB minified, ~4KB gzipped**

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires localStorage/sessionStorage
- ES2020 target
- Uses native crypto.randomUUID() with fallback

## Privacy & Security

✓ No raw email/phone storage  
✓ No payment information  
✓ Anonymous visitor IDs  
✓ Form field scrubbing examples  
✓ GDPR compliant data handling  
✓ Clear data on demand  

## Development

### Enable Debug Logging

All modules log to console in dev mode (`import.meta.env.DEV`).

### Check Tracking Status

```tsx
import { getAttributionSummary, logAttributionDebug } from '@/utils/attribution'

logAttributionDebug() // Logs everything to console
```

## Testing

All three files compile with TypeScript strict mode enabled. Includes comprehensive type definitions for full IDE support.

```bash
npm run build  # Passes with strict mode enabled
```

## Next Steps

1. **Setup API:** Create `/api/track-conversion.ts` endpoint
2. **Configure:** Add Meta Pixel ID and Google Analytics ID
3. **Integrate:** Add `initUtmTracking()` to App component
4. **Track Events:** Add `trackConversion()` calls to landing pages
5. **Test:** Use test URLs with UTM parameters
6. **Monitor:** Watch event queue and API responses
7. **Report:** Build attribution dashboard from stored data

## Documentation Navigation

```
START HERE:
  ├─ This file (README.md) - Overview
  ├─ TRACKING_INTEGRATION_SUMMARY.txt - Executive summary
  └─ TRACKING_QUICK_REFERENCE.md - Quick lookup

LEARN HOW:
  ├─ TRACKING_SETUP.md - Complete guide
  └─ IMPLEMENTATION_EXAMPLES.tsx - Code patterns

BUILD WITH:
  ├─ utm.ts - UTM capture
  ├─ events.ts - Event tracking
  └─ attribution.ts - Attribution models
```

## Support

- **Integration issues?** → See TRACKING_SETUP.md
- **Need code examples?** → See IMPLEMENTATION_EXAMPLES.tsx
- **Quick lookup?** → See TRACKING_QUICK_REFERENCE.md
- **Complete overview?** → See TRACKING_INTEGRATION_SUMMARY.txt
- **TypeScript types?** → Read JSDoc in source files

---

**Created:** March 14, 2026  
**Status:** Production Ready  
**TypeScript:** Strict Mode Enabled  
**Build:** ✓ Passes (npm run build)
