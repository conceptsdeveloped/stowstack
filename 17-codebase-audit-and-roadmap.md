# StowStack Codebase Audit & Improvement Roadmap

**Date:** March 16, 2026
**Auditor:** Claude (overnight cowork session)

---

## Audit Summary

The StowStack codebase is well-structured and type-safe. TypeScript strict mode is enabled, type checks pass with zero errors, and the separation between frontend (React/Vite) and backend (Vercel serverless functions) is clean. The database schema is solid with 25+ well-indexed PostgreSQL tables.

That said, there are several stability fixes, structural improvements, and professional upgrades worth making.

---

## Fixes Applied This Session

### 1. Silent Error Catches → Logged Warnings (ClientPortal.tsx)

**What:** Four `catch { /* silent */ }` blocks in ClientPortal.tsx were catching and discarding network errors, making failed API calls invisible.

**Fix:** Changed to `catch (err) { console.warn('[ClientPortal] Failed to ...:', err) }` — errors are now logged to console without breaking the UI.

**Files changed:** `src/components/ClientPortal.tsx` (lines 162, 174, 186, 207)

### 2. Hardcoded Emails → Environment Variable (audit-form.js)

**What:** Audit form notification emails were hardcoded to `blake@urkovro.resend.app` and `anna@storepawpaw.com`.

**Fix:** Added `NOTIFICATION_RECIPIENTS` constant that reads from `process.env.AUDIT_NOTIFICATION_EMAILS` with the current addresses as fallback defaults. The hardcoded `to:` array now uses this configurable constant.

**Files changed:** `api/audit-form.js`
**New env var:** `AUDIT_NOTIFICATION_EMAILS` (comma-separated, optional — defaults to current addresses)

### 3. Global Unhandled Rejection Handler (main.tsx)

**What:** The ErrorBoundary only catches React render errors. Async errors (failed fetch calls, unhandled promise rejections) were completely invisible.

**Fix:** Added `window.addEventListener('unhandledrejection', ...)` in main.tsx to log unhandled promise rejections to console.

**Files changed:** `src/main.tsx`

---

## Fixes Needed (Could Not Complete — Blocked by Environment)

### 4. Missing ESLint Plugin

**Issue:** `eslint.config.js` imports `eslint-plugin-react` but it's not in `devDependencies`. Linting cannot run.

**Fix:** Run `npm install eslint-plugin-react --save-dev`

**Status:** BLOCKED — npm registry not accessible from this environment. Blake needs to run this locally.

### 5. Rate Limiting on Audit Form

**Issue:** `api/audit-form.js` has a TODO comment on line 22: "Add rate limiting — Vercel KV or Upstash Redis (3 submissions per IP per hour)"

**Recommendation:** Implement with Vercel KV or Upstash Redis. Rate limit to 3 submissions per IP per hour. This prevents spam submissions.

---

## Codebase Health Assessment

### Strengths

- **TypeScript strict mode** — Zero type errors, `noUnusedLocals`, `noUnusedParameters` enabled
- **Solid database schema** — 25+ tables with strategic indexes, foreign keys, JSONB flexibility
- **97 serverless API routes** — Comprehensive coverage of auth, data, integrations, analytics
- **Plugin architecture** — 10 optional integrations loaded conditionally
- **Security headers** — CORS, CSP, X-Frame-Options configured in vercel.json
- **Dual-layer tracking** — Browser pixel + server CAPI with deduplication
- **Good type definitions** — 500+ line types.ts with comprehensive interface coverage

### Areas for Improvement

#### Large Component Files

Several components exceed recommended size:

| Component | Lines | Recommendation |
|-----------|-------|----------------|
| BillingView.tsx | 2,051 | Extract sub-tabs into separate components |
| WhatsNew.tsx | 1,825 | Extract changelog entries into data file |
| SeasonalPlaybookTab.tsx | 1,495 | Extract season cards and calendar logic |
| PartnerPortal.tsx | 1,477 | Extract portfolio table and facility cards |
| RevenueIntelligence.tsx | 1,414 | Extract chart components and data transforms |
| App.tsx | ~3,500+ | Extract page data constants, navigation logic |

**When to split:** Per the DECISIONS.md guidance, split when a file hits 2,000+ lines or has clear sub-sections. BillingView and App.tsx qualify now.

#### Auth Token Security

The organization auth token in `api/organizations.js` uses Base64 encoding (not encryption):
```
Authorization: `Basic ${btoa(orgId + ':' + email)}`
```
This is fine over HTTPS but should eventually move to signed JWTs with expiration.

#### Environment Variable Documentation

Some env vars are used in code but missing from `.env.example`:
- `GOOGLE_GBP_CLIENT_ID` / `GOOGLE_GBP_CLIENT_SECRET` (used in gbp-sync.js, gbp-posts.js)
- `AUDIT_NOTIFICATION_EMAILS` (newly added)

---

## Structural Improvements Roadmap

### Phase 1: Quick Wins (1-2 hours)

- [ ] Install `eslint-plugin-react` and verify lint passes
- [ ] Add `AUDIT_NOTIFICATION_EMAILS` to `.env.example`
- [ ] Add missing GBP env vars to `.env.example`
- [ ] Add rate limiting to audit-form.js (Vercel KV)

### Phase 2: Component Organization (4-6 hours)

- [ ] Extract BillingView sub-tabs into `src/components/dashboard/billing/` directory
- [ ] Extract App.tsx data constants into `src/data/` files (TEAM, STATS, PROBLEMS, etc.)
- [ ] Extract App.tsx navigation logic into a `useNavigation` hook
- [ ] Create `src/components/shared/` for reusable UI components (StatCard, StatusBadge, etc.)

### Phase 3: API Hardening (4-6 hours)

- [ ] Add rate limiting to all public-facing endpoints (audit-form, client-messages)
- [ ] Audit all error handling — replace remaining silent catches with logged errors
- [ ] Add request validation middleware (shared across endpoints)
- [ ] Add health check endpoint (`/api/health`)
- [ ] Add structured logging (JSON format for Vercel logs)

### Phase 4: Testing Foundation (8-12 hours)

- [ ] Set up Vitest (aligns with Vite ecosystem)
- [ ] Write unit tests for utility functions (ab-testing.ts, attribution.ts, utm.ts)
- [ ] Write integration tests for critical API routes (audit-form, meta-capi)
- [ ] Add test to CI pipeline

### Phase 5: Developer Experience (2-3 hours)

- [ ] Add pre-commit hooks (husky + lint-staged) for lint/typecheck on commit
- [ ] Create `CONTRIBUTING.md` with coding standards and PR process
- [ ] Add `.env.example` comments explaining each variable
- [ ] Set up path aliases for `@/api/` and `@/db/` (currently only `@/` → `src/`)

---

## Additional High-Value Tasks (Beyond Codebase)

### Product/Business

1. **Blog content pipeline** — The 12-seo-keyword-map.md has 20 keyword targets. Write the first 3-4 blog posts targeting the highest-intent keywords.

2. **Facility audit automation** — The audit generation uses Claude API. Build a quality score benchmark and auto-generate comparison reports across facilities.

3. **Client portal improvements** — The ClientPortal has basic messaging. Add notification system (email when new report is ready, when campaign goes live).

4. **Onboarding automation** — The onboarding checklist (13-onboarding-checklist.md) could be built into the admin dashboard as a tracked workflow.

5. **A/B test results page** — Build a public-facing results page that dynamically shows test winners (headline A vs B with real conversion data). This is both a product feature and a sales tool.

### Marketing/Sales

6. **LinkedIn publishing schedule** — The 11 LinkedIn posts are ready. Set up a 3-week publishing cadence.

7. **Cold email campaign** — Load the 5-email sequence into Apollo or similar tool. Target ICP from Apollo prospecting.

8. **Conference prep** — FSSA and SSA shows are key. Build a conference playbook: booth design, swag, talk submissions, networking strategy.

9. **Video testimonials** — After first 2-3 clients see results, capture 60-second video testimonials. These are worth 10x written case studies.

10. **Referral program** — The BillingView already has referral tracking. Build a formal referral program: $500 credit per referred facility that signs.

---

## Summary of Changes Made

| File | Change | Risk |
|------|--------|------|
| `src/components/ClientPortal.tsx` | Silent catches → logged warnings | Low — logging only |
| `api/audit-form.js` | Hardcoded emails → env var with fallback | Low — defaults to existing behavior |
| `src/main.tsx` | Added global unhandled rejection handler | Low — logging only |

All changes are backward-compatible. TypeScript check passes clean. No functional behavior changes — only improved observability and configurability.
