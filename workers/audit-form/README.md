# StowStack Audit Form Worker

Cloudflare Worker that handles audit intake form submissions. Validates input, stores leads in D1, rate-limits by IP via KV, and sends emails through Resend.

## Setup

### 1. Install dependencies

```bash
cd workers/audit-form
npm install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create stowstack-leads
```

Copy the `database_id` from the output into `wrangler.toml` under `[[d1_databases]]`.

### 3. Create the KV namespace

```bash
npx wrangler kv namespace create RATE_LIMITS
```

Copy the `id` from the output into `wrangler.toml` under `[[kv_namespaces]]`.

### 4. Run migrations

Local:

```bash
npm run migrate:local
```

Production:

```bash
npm run migrate:prod
```

### 5. Configure Resend API key

```bash
npx wrangler secret put RESEND_API_KEY
```

Paste your Resend API key when prompted. You'll also need to verify the `stowstack.co` domain in Resend's dashboard to send from `blake@stowstack.co` and `notifications@stowstack.co`.

### 6. Local development

```bash
npm run dev
```

The worker runs at `http://localhost:8787`. Test with:

```bash
curl -X POST http://localhost:8787/api/audit-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "5551234567",
    "facilityName": "Test Storage",
    "location": "Austin, TX",
    "occupancyRange": "60-75",
    "totalUnits": "100-300",
    "biggestIssue": "standard-units",
    "notes": ""
  }'
```

### 7. Deploy

```bash
npm run deploy
```

## Frontend integration

Set the `VITE_FORM_ENDPOINT` env var in the Vite app:

```
VITE_FORM_ENDPOINT=https://stowstack-audit-form.<your-subdomain>.workers.dev/api/audit-form
```

## API

### POST /api/audit-form

**Success (200):**
```json
{ "success": true, "leadId": "uuid" }
```

**Validation error (400):**
```json
{ "error": "Validation failed", "fields": { "email": "Invalid email format" } }
```

**Rate limited (429):**
```json
{ "error": "Too many submissions. Please try again in an hour." }
```
