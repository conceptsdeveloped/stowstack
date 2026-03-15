# StowStack: Tracking Configuration Guide

Complete setup for Meta Pixel, Meta CAPI, Google Ads conversion tracking, and UTM attribution.

## Overview: Why Double Tracking?

StowStack uses **two-layer tracking:**

1. **Browser pixel** (Facebook & Google tags) — Immediate reporting in ad platforms
2. **Server-side API** (Meta CAPI, Google Conversion API) — Accurate, deduped, privacy-compliant

Both fire simultaneously. Deduplication prevents double-counting.

Why both?
- **Browser pixel alone:** Fast but block-able by privacy tools. Can miss 10-30% of conversions.
- **Server API alone:** Accurate but slower (1-2 second delay). Good for reporting but not real-time ad optimization.
- **Both together:** Real-time optimization + accurate final reporting. Industry standard.

---

## Part 1: Meta Pixel Setup

### Step 1: Create/Find Pixel ID

**If the facility already has a Meta Ads account:**

1. Go to [Facebook Events Manager](https://business.facebook.com/events)
2. Click "Connect Data Sources" (top right)
3. Select "Web" → "Pixel"
4. If they have existing pixel: Select it. Copy the Pixel ID.
   - ID format: 12-digit number (e.g., `123456789012`)
5. If no pixel: Click "Create New Pixel"
   - Name: `[Facility Name] - StowStack`
   - Copy the Pixel ID once created

**If they don't have a Meta Ads account:**

1. Go to [facebook.com/business](https://facebook.com/business)
2. Click "Create Account"
3. Business name: Facility name
4. Email: Facility manager's email
5. Follow wizard → Creates pixel automatically
6. Copy Pixel ID

### Step 2: Install Browser Pixel

Add to landing page `<head>` section (before `</head>` closing tag):

```html
<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID_HERE');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=PIXEL_ID_HERE&ev=PageView&noscript=1" /></noscript>
<!-- End Facebook Pixel -->
```

**Replace `PIXEL_ID_HERE` with actual Pixel ID** (e.g., `fbq('init', '123456789012');`)

### Step 3: Set Up Meta CAPI (Server-Side)

Meta Conversions API sends events server-to-server. More accurate, not blocked by privacy tools.

**Get required credentials:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app (or create one: Apps → Create)
3. Get **Access Token:**
   - Settings → Basic → Copy App ID and App Secret
   - Go to Business Settings → Users → System Users
   - Create new system user (if not present)
   - Assign role: Admin
   - Create access token with `ads_management` scope
   - Token format: 100+ character string starting with `EAAB...`
4. Test token validity: Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select your app from dropdown
   - Paste token into Token field
   - Run query: `/{PIXEL_ID}` should return pixel details

**Environment Variables:**

Store in Vercel dashboard (or `.env.local` for development):

```
META_PIXEL_ID=123456789012
META_ACCESS_TOKEN=EAABqW...xyz (your full token)
```

**Vercel Setup:**

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select StowStack project
3. Settings → Environment Variables
4. Add:
   - Name: `META_PIXEL_ID`, Value: `123456789012`
   - Name: `META_ACCESS_TOKEN`, Value: `EAABqW...xyz`
5. Apply to: Development, Preview, Production
6. Deploy (or it auto-applies)

**Test the endpoint:**

```bash
curl -X POST https://stowstack.co/api/meta-capi \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "event_time": '$(date +%s)',
    "event_id": "test_'$(date +%s)'",
    "user_data": {
      "email": "test@example.com",
      "phone": "5551234567"
    }
  }'
```

Expected response:
```json
{
  "events_received": 1,
  "fbtrace_id": "xyz123..."
}
```

If error: Check access token validity, pixel ID format, network connection.

---

## Part 2: Google Ads Conversion Tracking

### Step 1: Create Conversion Action

1. Go to [Google Ads](https://ads.google.com)
2. Tools & Settings → Conversions → Conversion Actions
3. Click "+" (New conversion action)
4. Select "Website"
5. Configure:
   - **Conversion name:** `Lead - [Facility Name]` (e.g., `Lead - Paw Paw Storage`)
   - **Category:** Choose "Leads" or "Purchase/Sale" (depending on what you're tracking)
   - **Value:** Enter typical lead value in USD (e.g., $50 estimated value per lead)
   - **Count conversions:** "Every" (count every form submission)
   - **Attribution model:** "Last-click" (simplest) or "Data-driven" (if enough volume)
6. Click "Create and Continue"
7. **Skip "Install conversion tracking tag"** (we do this server-side)
8. Copy the **Conversion ID** and **Conversion Label**
   - ID format: `AW-XXXXXXXXX` (e.g., `AW-123456789`)
   - Label: Unique code (e.g., `abc123def456`)

### Step 2: Install Google Tag

Add to landing page `<head>`:

```html
<!-- Google Tag Manager -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
<!-- End Google Tag Manager -->
```

**Replace `GA_ID`** with your Google Analytics or Google Ads tracking ID.

### Step 3: Set Up Server-Side Conversion Tracking

Google Conversion API sends conversions server-to-server.

**Get required credentials:**

1. Go to [Google Ads](https://ads.google.com)
2. Tools & Settings → Conversions → Conversion Actions
3. Select your conversion
4. Copy **Conversion ID** (format: `AW-XXXXXXXXX`)
5. Copy **Conversion Label** (unique code)
6. Tools & Settings → API Center → Create new API token (if needed)

**Environment Variables:**

Store in Vercel:

```
GOOGLE_CONVERSION_ID=AW-123456789
GOOGLE_CONVERSION_LABEL=abc123def456
GOOGLE_ADS_CUSTOMER_ID=123-456-7890  # Optional: for API access
```

**Test the endpoint:**

```bash
curl -X POST https://stowstack.co/api/google-conversion \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "event_time": '$(date +%s)',
    "user_data": {
      "email": "test@example.com",
      "phone": "5551234567"
    },
    "conversion_value": 50,
    "conversion_currency": "USD"
  }'
```

Expected response:
```json
{
  "conversion_id": "test_123...",
  "success": true,
  "timestamp": 1710437800
}
```

If error: Check Conversion ID format, credentials valid, endpoint URL correct.

---

## Part 3: Event Taxonomy

Every conversion fires the same data structure:

```json
{
  "event_name": "Lead" | "InitiateCheckout" | "Purchase" | "ViewContent",
  "event_time": 1710437800,              // Unix timestamp
  "event_id": "evt_1710437800_abc123",   // Deduplication ID
  "user_data": {
    "email": "john@example.com",         // Email (required or phone)
    "phone": "5551234567",               // Phone (required or email)
    "firstName": "John",                 // Optional
    "lastName": "Doe",                   // Optional
    "city": "Paw Paw",                   // Optional
    "state": "MI",                       // Optional
    "zip": "49079",                      // Optional
    "country": "US"                      // Optional
  },
  "custom_data": {
    "value": 100,                        // Conversion value (USD)
    "currency": "USD",                   // Currency code
    "content_name": "Lead Form",         // Description
    "content_id": "form_audit",          // Internal ID
    "content_type": "product"            // Meta standard
  }
}
```

### Event Types

**Lead** — Form submission or contact request
- When: User submits audit intake form, contact form, newsletter signup
- Value: Estimated value of that lead (often $50-100)
- Example:
  ```json
  {
    "event_name": "Lead",
    "user_data": { "email": "john@example.com", "phone": "5551234567" },
    "custom_data": { "value": 50, "content_name": "Audit Form" }
  }
  ```

**InitiateCheckout** — Reservation process started
- When: User clicks "Reserve Now", selects a unit in storEDGE
- Value: Unit monthly rent (e.g., $125 for a 10x10)
- Example:
  ```json
  {
    "event_name": "InitiateCheckout",
    "user_data": { "email": "john@example.com" },
    "custom_data": {
      "value": 125,
      "content_name": "10x10 Unit",
      "content_id": "unit_1010_standard"
    }
  }
  ```

**Purchase** — Reservation completed / Move-in confirmed
- When: Tenant moves in, lease signed, payment processed
- Value: Move-in fee or first month's rent
- Example:
  ```json
  {
    "event_name": "Purchase",
    "user_data": { "email": "john@example.com", "phone": "5551234567" },
    "custom_data": {
      "value": 125,
      "content_name": "10x10 Unit Move-In",
      "content_id": "unit_1010_standard"
    }
  }
  ```

**ViewContent** — Unit page viewed
- When: User clicks on a unit listing, opens unit details
- Value: Unit monthly rent (or NULL)
- Example:
  ```json
  {
    "event_name": "ViewContent",
    "user_data": { "email": "john@example.com" },
    "custom_data": {
      "value": 125,
      "content_name": "10x10 Unit",
      "content_id": "unit_1010_standard",
      "content_type": "product"
    }
  }
  ```

**PageView** — Landing page viewed
- Fires automatically on page load
- No custom data needed
- Example:
  ```json
  {
    "event_name": "PageView",
    "user_data": {},
    "custom_data": {}
  }
  ```

---

## Part 4: UTM Parameter Structure

Every link must include UTM parameters for attribution. Use this standardized structure:

### Standard Format

```
?utm_source=PLATFORM&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=VARIANT
```

### Glossary

| Parameter | Values | Example | Purpose |
|-----------|--------|---------|---------|
| **utm_source** | `google`, `facebook`, `email`, `organic`, `direct` | `utm_source=facebook` | Where traffic comes from |
| **utm_medium** | `cpc`, `cpm`, `organic`, `email`, `social` | `utm_medium=cpc` | How traffic arrives (paid click, paid impression, free) |
| **utm_campaign** | Campaign ID/name | `utm_campaign=paw_paw_summer` | Which campaign group |
| **utm_content** | Ad/creative variant | `utm_content=video_1` | Which specific ad/design |

### Examples

**Google Ads - Branded Search**
```
stowstack.co/paw-paw-storage/reserve?utm_source=google&utm_medium=cpc&utm_campaign=branded&utm_content=headline_1
```

**Meta Ads - Summer Promotion**
```
stowstack.co/paw-paw-storage/summer-special?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_2025&utm_content=carousel_v2
```

**Retargeting Campaign**
```
stowstack.co/paw-paw-storage/cart-recovery?utm_source=facebook&utm_medium=cpc&utm_campaign=abandon&utm_content=testimonial_vid
```

**Google Local Services**
```
stowstack.co/paw-paw-storage/lsa?utm_source=google&utm_medium=cpc&utm_campaign=local_services&utm_content=primary
```

### Naming Convention

**utm_campaign naming:**
- Pattern: `[facility]_[offer]_[period]`
- Example: `paw_paw_summer_2025`, `paw_paw_branded_ongoing`, `paw_paw_competitor_q1`

**utm_content naming:**
- Pattern: `[format]_[variant]`
- Example: `video_1`, `image_carousel`, `testimonial_v2`, `text_only`

---

## Part 5: GCLID & FBCLID Capture

Google and Meta auto-append click IDs to URLs for attribution. Capture these.

### GCLID (Google Click ID)

Google automatically appends `?gclid=xyz123...` when user clicks a Google Ads ad.

**Landing page should:**
1. Detect GCLID in URL
2. Store in sessionStorage
3. Send with every conversion event

**JavaScript to capture:**

```javascript
function captureGCLID() {
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get('gclid');
  if (gclid) {
    sessionStorage.setItem('stowstack_gclid', gclid);
    console.log('[Pixel] GCLID captured:', gclid);
  }
}

function getGCLID() {
  return sessionStorage.getItem('stowstack_gclid') || null;
}

// Call on page load
document.addEventListener('DOMContentLoaded', captureGCLID);
```

**When sending conversions to Google, include GCLID:**

```javascript
const gclid = getGCLID();
await fetch('/api/google-conversion', {
  method: 'POST',
  body: JSON.stringify({
    event_name: 'Lead',
    gclid: gclid,  // Include this
    user_data: { email: 'john@example.com' },
    // ... rest of data
  })
});
```

### FBCLID (Facebook Click ID)

Meta automatically appends `?fbclid=xyz123...` when user clicks a Meta ad.

**JavaScript to capture:**

```javascript
function captureFBCLID() {
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) {
    sessionStorage.setItem('stowstack_fbclid', fbclid);
    console.log('[Pixel] FBCLID captured:', fbclid);
  }
}

function getFBCLID() {
  return sessionStorage.getItem('stowstack_fbclid') || null;
}

// Call on page load
document.addEventListener('DOMContentLoaded', captureFBCLID);
```

**When sending conversions to Meta, include FBCLID:**

```javascript
const fbclid = getFBCLID();
await fetch('/api/meta-capi', {
  method: 'POST',
  body: JSON.stringify({
    event_name: 'Lead',
    user_data: { email: 'john@example.com' },
    fbclid: fbclid,  // Include this
    // ... rest of data
  })
});
```

---

## Part 6: Testing & Verification

### Test 1: Browser Pixel Fires

1. Load landing page
2. Open DevTools (F12)
3. Go to Console tab
4. Look for `fbq` calls or `gtag` calls
   - Example: `fbq('track', 'PageView')`
   - If nothing: Check pixel code is in `<head>`, not blocked by ad blocker
5. Go to Network tab
6. Look for requests to `facebook.com` or `google-analytics.com`
   - If nothing: Pixel not loading, check pixel ID

### Test 2: Meta Events Manager

1. Go to [Facebook Events Manager](https://business.facebook.com/events)
2. Select your pixel
3. Should show "Online Conversions" with real-time events
4. Trigger a test event (submit form, click button)
5. Event should appear within 5 seconds
6. Check "Event Details" → should show user data

**If no events:**
- Pixel ID correct?
- Pixel code in page? (View source → search "fbq")
- Ad blocker blocking? (test in incognito mode)

### Test 3: Google Ads Conversions

1. Go to [Google Ads](https://ads.google.com)
2. Tools & Settings → Conversions
3. Select your conversion action
4. "Recent conversions" tab should show activity (24-hour delay)
5. Trigger a test event
6. Check after 24 hours

**If no conversions:**
- Conversion ID correct?
- GCLID being captured? (sessionStorage should have it)
- Tag code installed? (View page source → search "gtag")

### Test 4: Server-Side Events

**Meta CAPI:**

```bash
curl -X POST https://stowstack.co/api/meta-capi \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "event_time": '$(date +%s)',
    "event_id": "test_'$(date +%s)'",
    "user_data": {
      "email": "test@example.com",
      "phone": "5551234567"
    }
  }'
```

Check response: `{ "events_received": 1 }`

**Google Conversion API:**

```bash
curl -X POST https://stowstack.co/api/google-conversion \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "user_data": { "email": "test@example.com" },
    "conversion_value": 50
  }'
```

Check response: `{ "success": true }`

### Test 5: Deduplication

1. Submit form on landing page
2. Check Meta Events Manager: See 1 "Lead" event (not 2)
3. Check Google Ads conversions: See 1 conversion (not 2)
4. Verify event_id is same in both (check Network tab)

If seeing doubles: event_id not being set, dedup broken.

### Test 6: UTM Parameter Passing

1. Load page with UTM parameters:
   ```
   https://stowstack.co/paw-paw/reserve?utm_source=google&utm_campaign=test
   ```
2. Open DevTools → Application → Session Storage
3. Look for `utm_source`, `utm_campaign` (should be stored)
4. Submit form
5. Check Network → POST request to `/api/meta-capi`
6. Expand request body → should include utm parameters

If missing: UTM capture code not installed.

---

## Part 7: Troubleshooting

### "Events not appearing in Meta Events Manager"

**Checklist:**
1. Pixel ID correct? (check Events Manager → Settings)
   - Go to [Events Manager](https://business.facebook.com/events) → Select pixel → Check ID
   - Compare to pixel code on your page (fbq('init', 'PIXEL_ID'))
2. Pixel code installed? (View page source → search "fbq")
   - If not found: Add pixel code to landing page
3. Ad blocker blocking? (test in incognito mode, test in different browser)
4. Is pixel verified? (Events Manager should show green checkmark)
   - If not verified: Click "Verify Pixel" button, install confirmation code
5. Browser pixel firing first? (check Network tab for facebook.com requests)
   - If no requests: Pixel code not executing, check for JavaScript errors

**Server-side events (CAPI) not appearing:**
1. Access token valid?
   - Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Select app, paste token, run query `/{PIXEL_ID}`
   - If error: Token invalid or expired, generate new one
2. Pixel ID correct in API request?
3. Check Vercel function logs:
   - Go to Vercel Dashboard → Select project → Functions
   - Click `meta-capi` → view logs
   - Look for errors or confirmation messages
4. Test with cURL (see Test 4 above)

### "Google Ads not recording conversions"

**Checklist:**
1. Conversion ID correct?
   - Go to Google Ads → Conversions → Select action
   - Copy ID (format: AW-XXXXXXXXX)
   - Check `/api/google-conversion` env vars match
2. GCLID being captured?
   - Load ad click link with `?gclid=test123`
   - Check sessionStorage for `stowstack_gclid`
   - If missing: GCLID capture code not installed
3. Tag installed?
   - View page source → search "gtag" or "GA_ID"
   - If not found: Install Google Tag code
4. Conversion action enabled?
   - Go to Google Ads → Conversions → Check status
   - Should be "Recording conversions"
5. Wait 24 hours (Google has reporting delay)

**Server-side conversions not working:**
1. Conversion label correct?
2. Check Vercel logs for `google-conversion` function
   - Look for API errors, response codes
3. Test with cURL (see Test 4)
4. Is user data valid? (email or phone required)

### "Seeing double counts"

Deduplication not working.

**Check:**
1. Are event_ids being generated? (should be `evt_TIMESTAMP_UNIQUE`)
2. Are event_ids matching between browser pixel and server calls?
   - Browser: Check fbq call in console
   - Server: Check Vercel logs
   - Should be identical
3. Are both browser and server firing?
   - If only one: Good (no double count)
   - If both with same ID: Should deduplicate, check platform settings

**Fix:**
- Re-generate event_id for each conversion
- Ensure event_id sent to both Meta and Google
- In Meta: Should see "Deduplication" stat in Events Manager
- In Google: Multiple conversions with same gclid may show, but attribution model should dedupe

### "UTM parameters not passing through"

Conversions missing campaign/source data.

**Check:**
1. Are UTMs in original landing page URL?
   - Click ad → check browser address bar
   - Should show `?utm_source=...&utm_campaign=...`
2. Is sessionStorage capture working?
   - Open DevTools → Application → Session Storage
   - Should see `utm_source`, `utm_campaign`, etc.
   - If missing: Capture code not running
3. Are UTMs being sent to API?
   - Check Network tab → POST to `/api/meta-capi`
   - Expand request body → should include utm fields
4. Are UTMs being sent to storEDGE?
   - When redirect to storEDGE, check URL for utm params

**Fix:**
- Install UTM capture code on landing page
- Pass sessionStorage values to API endpoints
- Add utm params to storEDGE redirect URL

---

## Part 8: Pixel Health Checklist

Weekly verification:

- [ ] Browser pixel: Events appearing in Meta Events Manager (real-time)
- [ ] Server CAPI: Events logged to `/api/meta-capi` (check Vercel logs)
- [ ] Google tag: Loading and firing (Network tab check)
- [ ] Server Google API: Conversions hitting `/api/google-conversion`
- [ ] UTM parameters: Being captured and logged with conversions
- [ ] GCLID/FBCLID: Being captured from URLs
- [ ] Deduplication: Not seeing duplicate events in Meta
- [ ] Form submission: Triggering pixel events on success
- [ ] storEDGE: Passing data through properly

**If any check fails:** Debug using troubleshooting section above.

---

## Common Configurations by Facility Type

### Small Facility (1 location, 100+ units)

- Meta Pixel: 1
- Conversion actions: 3 (Lead, Reservation, Move-in)
- Google Ads account: 1
- A/B testing: UTM variants only (A/B testing at ad platform level)
- Reporting: Weekly summary (leads + move-ins)

### Medium Facility (2-5 locations)

- Meta Pixel: 1 shared (or 1 per location)
- Conversion actions: 5-7 (Lead, Reservation, Move-in, by location)
- Google Ads account: 1 (location-based campaigns)
- A/B testing: Landing page variants + ad creative + audience
- Reporting: Weekly by location + facility

### Enterprise (5+ locations)

- Meta Pixel: 1 per location (or 1 master + 1 per location)
- Conversion actions: 10+ (lead quality tiers, unit types, move-in types)
- Google Ads account: Multi-account structure (1 per brand region)
- A/B testing: Full multivariate (creative + copy + landing page + audience)
- Reporting: Real-time dashboard + daily synthesis

---

## Reference: API Endpoint Specs

### POST /api/meta-capi

**Request:**
```json
{
  "event_name": "Lead|InitiateCheckout|Purchase|ViewContent|PageView",
  "event_time": 1710437800,
  "event_id": "evt_1710437800_abc123",
  "user_data": {
    "email": "john@example.com",
    "phone": "5551234567",
    "firstName": "John",
    "lastName": "Doe",
    "city": "Paw Paw",
    "state": "MI",
    "zip": "49079"
  },
  "custom_data": {
    "value": 100,
    "currency": "USD",
    "content_name": "Lead Form",
    "content_id": "audit"
  },
  "fbclid": "Abc123..."
}
```

**Response:**
```json
{
  "events_received": 1,
  "fbtrace_id": "xyz123...",
  "event_id": "evt_1710437800_abc123"
}
```

### POST /api/google-conversion

**Request:**
```json
{
  "event_name": "Lead|InitiateCheckout|Purchase",
  "event_time": 1710437800,
  "user_data": {
    "email": "john@example.com",
    "phone": "5551234567"
  },
  "gclid": "CjwKCAiA...",
  "conversion_value": 50,
  "conversion_currency": "USD"
}
```

**Response:**
```json
{
  "conversion_id": "xyz123...",
  "success": true,
  "timestamp": 1710437800
}
```

---

**Updated:** 2026-03-14
