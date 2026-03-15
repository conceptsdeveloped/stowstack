# StowStack Pixel & Conversion Tracking Integration Guide

This guide documents the Meta Conversions API (CAPI) and Google Ads conversion tracking implementation for StowStack.

## Overview

The system consists of three components:

1. **`/api/meta-capi.js`** — Vercel serverless function for Meta Conversions API (server-side tracking)
2. **`/api/google-conversion.js`** — Vercel serverless function for Google Ads offline conversions (server-side tracking)
3. **`/src/utils/pixel.ts`** — Client-side pixel manager for browser tracking + API calls

### Key Features

- **Server-side event firing** to Meta CAPI and Google Ads API for better event matching and attribution
- **Browser pixel firing** (Meta fbq, Google gtag) for immediate real-time tracking
- **Event deduplication** using `event_id` to prevent double-counting
- **User data hashing** (SHA-256) as required by Meta and Google
- **GCLID/FBCLID capture** from URL parameters for cross-platform attribution
- **Unified interface** for firing conversions across both platforms simultaneously
- **Debug mode** for development and troubleshooting

---

## Setup

### 1. Environment Variables

Add these to your `.env.local` (development) and Vercel deployment (production):

```bash
# Meta Conversions API
META_PIXEL_ID=YOUR_PIXEL_ID_HERE
META_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE

# Google Ads Conversion Tracking
GOOGLE_CONVERSION_ID=AW-XXXXXXXXX
GOOGLE_CONVERSION_LABEL=YOUR_LABEL_HERE
GOOGLE_ADS_CUSTOMER_ID=XXX-XXX-XXXX  # Optional, for API-based reporting
```

#### Getting These Values

**Meta Pixel ID & Access Token:**
1. Go to [Facebook Events Manager](https://business.facebook.com/events)
2. Find your pixel
3. Get your Pixel ID from the pixel setup
4. Generate an access token: Settings → API Access
5. Use an API token with `ads_management` scope

**Google Conversion ID & Label:**
1. Go to [Google Ads](https://ads.google.com)
2. Tools & Settings → Conversions
3. Create a new conversion action (or use existing)
4. Conversion ID is shown as `AW-XXXXXXXXX`
5. Conversion label is shown on the conversion settings page

### 2. Initialize Pixel in Your App

In your main app component (`src/App.tsx`), initialize the pixel on load:

```tsx
import { initializePixel } from '@/utils/pixel'

// In your component useEffect or at app root:
useEffect(() => {
  initializePixel({
    metaPixelId: process.env.REACT_APP_META_PIXEL_ID || 'YOUR_PIXEL_ID',
    googleConversionId: process.env.REACT_APP_GOOGLE_CONVERSION_ID,
    googleConversionLabel: process.env.REACT_APP_GOOGLE_CONVERSION_LABEL,
    debug: process.env.NODE_ENV === 'development', // Enable debug logs in dev
    capiEndpoint: '/api/meta-capi',
    googleConversionEndpoint: '/api/google-conversion',
  })
}, [])
```

**Note:** Make sure env vars are prefixed with `REACT_APP_` for Vite/CRA to expose them.

---

## Usage

### Basic Conversion Tracking

```typescript
import { trackConversion } from '@/utils/pixel'

// Track any event
await trackConversion({
  event_name: 'Lead',
  user_data: {
    email: 'customer@example.com',
    phone: '1234567890',
    firstName: 'John',
    lastName: 'Doe',
    city: 'Detroit',
    state: 'MI',
    zip: '48201',
  },
  custom_data: {
    value: 150, // Lead value
    currency: 'USD',
    content_name: 'Audit Form Submission',
  },
})
```

### High-Level Tracking Methods

```typescript
import { trackLead, trackMoveIn, getPixel } from '@/utils/pixel'

// Track a lead from form submission
await trackLead({
  email: body.email,
  phone: body.phone,
  firstName: body.name.split(' ')[0],
  lastName: body.name.split(' ')[1],
  city: body.location,
}, 100) // Optional: lead value

// Track a move-in completion
await trackMoveIn({
  email: 'customer@example.com',
  phone: '1234567890',
}, 1250) // Move-in value

// Track a unit view
const pixel = getPixel()
await pixel.trackUnitViewed(
  { email: 'customer@example.com' },
  {
    unit_id: 'UNIT-001',
    unit_size: '10x10',
    unit_type: 'Climate Controlled',
    price: 250,
  }
)

// Track reservation started
await pixel.trackReservationStart(
  { email: 'customer@example.com' },
  250 // Reservation value
)
```

### In Form Submission (AuditIntakeForm)

Example integration in `src/components/forms/AuditIntakeForm.jsx`:

```jsx
import { trackLead } from '@/utils/pixel'

async function handleSubmit(data) {
  try {
    // Submit form to your API
    const response = await fetch('/api/audit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      // Fire conversion to Meta & Google
      await trackLead(
        {
          email: data.email,
          phone: data.phone,
          firstName: data.name.split(' ')[0],
          lastName: data.name.split(' ')[1],
          city: data.location,
        },
        100 // Lead value in dollars
      )

      // Show success message
      setSuccess(true)
    }
  } catch (error) {
    console.error('Submission error:', error)
  }
}
```

### Custom Events

For events not covered by the preset methods, use `trackConversion()`:

```typescript
import { trackConversion } from '@/utils/pixel'

await trackConversion({
  event_name: 'CustomEvent',
  user_data: {
    email: 'customer@example.com',
  },
  custom_data: {
    value: 50,
    currency: 'USD',
    custom_field: 'custom_value',
  },
})
```

---

## Supported Events

### Event Names

The system maps StowStack event names to both Meta and Google standards:

| StowStack Event | Meta Event | Google Event | Use Case |
|---|---|---|---|
| `PageView` | PageView | page_view | Page visit tracking |
| `Lead` | Lead | lead | Form submission (audit, contact, etc.) |
| `InitiateCheckout` / `reservation_started` | InitiateCheckout | initiate_checkout | User starts reservation process |
| `Purchase` / `move_in_completed` | Purchase | purchase | Move-in completed / lease signed |
| `ViewContent` / `unit_selected` | ViewContent | view_content | User views unit details |

### Custom Data Fields

Standard `custom_data` fields (used by both Meta and Google):

```typescript
custom_data: {
  value?: number,           // Conversion value
  currency?: string,        // e.g., 'USD'
  content_name?: string,    // e.g., 'Audit Form Lead'
  content_category?: string,
  content_type?: string,    // e.g., 'product', 'lead'
  content_id?: string,      // e.g., unit ID
  num_items?: number,
}
```

---

## Event Deduplication

The system prevents double-counting conversions when firing both client-side pixel and server-side API:

1. **Client-side pixel** fires immediately to Meta/Google for real-time visibility
2. **Server-side API** fires simultaneously with a dedup event_id
3. Meta/Google match `event_id` and count as one conversion (not two)

This is handled automatically:

```typescript
// Both client & server fires with same event_id
const result = await trackConversion({
  event_name: 'Lead',
  // ... user_data, custom_data
  // event_id auto-generated if not provided
})
```

To track a specific event_id (for debugging/reconciliation):

```typescript
const eventId = `evt_${Date.now()}_custom123`
await trackConversion({
  event_name: 'Lead',
  event_id: eventId,
  // ... user_data, custom_data
})
```

---

## User Data Hashing

User data is automatically hashed using SHA-256 as required by Meta and Google:

- Email: lowercased, trimmed, hashed
- Phone: digits only, hashed
- First/Last Name: lowercased, trimmed, hashed
- City, State, Zip, Country: lowercased, trimmed, hashed

**Note:** Hashing happens on the server (in the API endpoints), not the client. The client sends plain text, the server hashes before sending to Meta/Google.

```typescript
// Client sends plain text:
await trackLead({
  email: 'JOHN@EXAMPLE.COM',  // Will be lowercased, hashed
  phone: '(123) 456-7890',     // Will remove non-digits, hash
})
```

---

## GCLID & FBCLID Capture

The system automatically captures `gclid` (Google Ads) and `fbclid` (Facebook Ads) from URL parameters:

```
https://stowstack.co/?gclid=CjwKCAiA... → auto-captured, stored in sessionStorage
https://stowstack.co/?fbclid=IwAR3... → auto-captured, stored in sessionStorage
```

These are automatically added to conversion requests for proper attribution linking.

To manually pass them:

```typescript
await trackConversion({
  event_name: 'Lead',
  user_data: { email: 'customer@example.com' },
  gclid: 'CjwKCAiA...',
  fbclid: 'IwAR3...',
})
```

---

## Debug Mode

Enable debug logging to troubleshoot pixel firing:

```typescript
import { getPixel } from '@/utils/pixel'

// Enable debug
getPixel().setDebug(true)

// Now all pixel operations log to console
await trackLead(userData)
// Console output:
// [Pixel] Sending conversion: Lead
// [Pixel] Meta client event: Lead { ... }
// [Pixel] Google client event: Lead { ... }
// [Pixel] Meta CAPI response: { success: true, ... }
// [Pixel] Google Conversion response: { success: true, ... }
```

Or auto-enable in dev mode (see Setup section above).

---

## API Endpoint Details

### Meta CAPI Endpoint (`/api/meta-capi.js`)

**Request:**
```bash
POST /api/meta-capi
Content-Type: application/json

{
  "event_name": "Lead",
  "event_time": 1710437800,
  "event_id": "evt_1710437800_abc123",
  "user_data": {
    "email": "customer@example.com",
    "phone": "1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "city": "Detroit",
    "state": "MI",
    "zip": "48201"
  },
  "custom_data": {
    "value": 100,
    "currency": "USD",
    "content_name": "Audit Lead"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "event_id": "evt_1710437800_abc123",
  "meta_response": {
    "events_received": 1,
    "fbp": "fb.1.1234567890.987654321"
  }
}
```

**Response (Error):**
```json
{
  "error": "Validation failed",
  "details": {
    "event_name": "event_name is required"
  }
}
```

### Google Conversion Endpoint (`/api/google-conversion.js`)

**Request:**
```bash
POST /api/google-conversion
Content-Type: application/json

{
  "event_name": "Lead",
  "event_time": 1710437800,
  "user_data": {
    "email": "customer@example.com",
    "phone": "1234567890"
  },
  "gclid": "CjwKCAiA...",
  "conversion_value": 100,
  "conversion_currency": "USD"
}
```

**Response (Success):**
```json
{
  "success": true,
  "event_name": "Lead",
  "conversion_id": "AW-XXXXXXXXX",
  "google_response": {
    "status": 200,
    "success": true
  }
}
```

---

## Error Handling

All tracking calls return Promise<{meta: response, google: response}>. Handle errors gracefully:

```typescript
try {
  const result = await trackLead(userData, 100)

  if (result.meta?.success) {
    console.log('Meta conversion tracked')
  } else {
    console.warn('Meta conversion failed:', result.meta)
  }

  if (result.google?.success) {
    console.log('Google conversion tracked')
  } else {
    console.warn('Google conversion failed:', result.google)
  }
} catch (error) {
  console.error('Tracking error:', error)
  // Still show success to user, failed tracking shouldn't break UX
}
```

---

## Verification & Testing

### Development

1. Enable debug mode: `getPixel().setDebug(true)`
2. Open browser DevTools Console
3. Look for `[Pixel]` log messages
4. Verify both client & server events fire

### Meta Pixel

1. Install [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/gdebplngdicnfkdadhbjdgcblfbkkoed) browser extension
2. When events fire, extension shows green checkmark
3. Check [Events Manager](https://business.facebook.com/events) for real data

### Google Ads

1. Check [Google Ads](https://ads.google.com) → Tools & Settings → Conversions
2. Look for conversion data in the conversion action
3. Verify value/currency are correct

### Network Tab

Monitor network requests:
1. Open DevTools → Network tab
2. Filter for `meta-capi` and `google-conversion`
3. Verify 200 responses with correct data

---

## Troubleshooting

### Events not firing

1. **Check env vars** are set correctly in Vercel & dev .env.local
2. **Verify pixel ID** in Meta Events Manager
3. **Check browser console** for errors
4. **Enable debug mode** to see what's happening
5. **Check CORS headers** — requests must be from allowed origin

### Meta CAPI errors

| Error | Cause | Solution |
|---|---|---|
| `Invalid access token` | Bad token or expired | Regenerate token in Facebook Events Manager |
| `Invalid pixel ID` | Wrong or non-existent pixel | Verify pixel ID in Events Manager |
| `User data error` | Hashing or format issue | Ensure email/phone are valid |
| `Rate limit` | Too many requests | Implement request throttling |

### Google Conversion not recording

1. **Verify conversion ID** format (should be `AW-XXXXXXXXX`)
2. **Check gclid is captured** — look for URL param or sessionStorage
3. **Verify conversion label** matches the conversion action
4. **Check date range** in Google Ads (might be delayed 24h)

---

## Production Checklist

Before deploying to production:

- [ ] Meta Pixel ID & Access Token set in Vercel env vars
- [ ] Google Conversion ID & Label set in Vercel env vars
- [ ] Pixel initialized in App.tsx with correct env vars
- [ ] At least one conversion event tracked and tested
- [ ] Meta Events Manager shows test events
- [ ] Google Ads shows test conversions
- [ ] Debug mode disabled in production
- [ ] CORS origins whitelist reviewed (prod domains added)
- [ ] Error handling in place (failed tracking doesn't break UX)
- [ ] User privacy/consent handled (if using consent banners)

---

## Privacy & Compliance

### GDPR & CCPA Compliance

When collecting user data for tracking, ensure:

1. **Consent obtained** before sending PII to third parties
2. **Privacy policy** clearly states Meta/Google tracking
3. **User can opt-out** (consider consent banner integration)
4. **Data is hashed** on server before sending (done automatically)

Example with consent:

```typescript
if (consentGiven) {
  await trackLead(userData)
} else {
  console.log('Tracking declined by user')
}
```

### Sensitive Data

Never send these in `custom_data`:
- Payment card numbers
- Bank account numbers
- Passwords
- SSN / ID numbers
- Health information

---

## Performance Considerations

- Pixel tracking is fire-and-forget (async)
- Does not block user actions or page navigation
- All requests are POST with small payloads (~2KB)
- Use `Promise.all()` to fire both platforms simultaneously

```typescript
// Both fire at same time, wait for both to finish
const result = await Promise.all([
  trackLead(userData)
])
```

---

## Example Integrations

### Audit Form Submission

```typescript
// In AuditIntakeForm.jsx handleSubmit()
const handleSubmit = async (data) => {
  try {
    // 1. Submit form to API
    const response = await fetch('/api/audit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      // 2. Track lead conversion
      await trackLead(
        {
          email: data.email,
          phone: data.phone,
          firstName: data.name.split(' ')[0],
          lastName: data.name.split(' ')[1],
          city: data.location,
        },
        100 // Lead value
      )

      // 3. Show success
      setSuccess(true)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
```

### Reservation Flow

```typescript
// When user starts reservation
const handleReservationStart = async (userData, unitPrice) => {
  await getPixel().trackReservationStart(userData, unitPrice)
}

// When move-in completes
const handleMoveInComplete = async (userData, moveInValue) => {
  await trackMoveIn(userData, moveInValue)
}
```

### Dynamic Unit Selection

```typescript
// When user selects a unit
const handleUnitSelected = async (unit) => {
  await getPixel().trackUnitViewed(
    getCurrentUserData(), // If logged in
    {
      unit_id: unit.id,
      unit_size: unit.size,
      unit_type: unit.type,
      price: unit.monthlyPrice,
    }
  )
}
```

---

## Support & Troubleshooting

For issues:
1. Check console logs (enable debug mode)
2. Verify env vars in Vercel dashboard
3. Test with Meta Pixel Helper & Google Tag Assistant
4. Check API response in Network tab
5. Review error messages in Vercel function logs

---

## References

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Google Ads API Docs](https://developers.google.com/google-ads/api)
- [Meta Pixel Events](https://developers.facebook.com/docs/facebook-pixel/reference)
- [Google Analytics 4 Events](https://support.google.com/analytics/answer/9267744)
