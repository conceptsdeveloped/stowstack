# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

StowStack is a full-funnel acquisition and conversion system for self-storage operators — not an agency, not a SaaS platform. The product helps independent self-storage operators (1-20 facilities) fill vacant units through ad-specific landing pages with embedded reservation/move-in functionality, full-funnel attribution, and revenue-based A/B testing. Domain: stowstack.co.

## Repository Layout

The Vite + React app lives at the project root. Key top-level paths:

- **`src/`** — React application source code
- **`api/`** — Vercel serverless functions (API routes)
- **`public/`** — Static assets served as-is
- **`workers/`** — Cloudflare Worker experiments (not deployed)
- **`MARKDOWN stowstack v1/`** — Markdown templates for sales campaigns, audit reports, lead scoring, and business operations (not code). Core founding document: `STOWSTACK_CORE.md`

## Commands

```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run lint       # ESLint
```

## Tech Stack

- **React 18** with TypeScript
- **Vite 5** as build tool
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (configured in `vite.config.ts`, theme in `src/index.css` using `@theme`)
- **Lucide React** for icons
- **Recharts** for dashboard charts
- **Vercel** for deployment (see `vercel.json` for SPA rewrites and API routing)
- **Resend** for transactional email (notification + auto-reply on form submission)

## Architecture

The app uses **client-side view switching via React state** — no router. `App.jsx` manages a `view` state string (`'website'`, `'dashboard'`, `'guide'`, `'library'`, `'login'`) and conditionally renders the corresponding view component.

### Key files

- `src/App.tsx` — Top-level view switcher with floating nav toggle (top-right corner)
- `src/components/DemoDashboard.tsx` — Simulated facility analytics dashboard
- `src/components/AdminDashboard.tsx` — Internal lead pipeline and ops dashboard
- `src/components/ClientPortal.tsx` — Client-facing analytics portal
- `src/components/OnboardingWizard.tsx` — Multi-step client onboarding flow
- `src/components/LandingPageView.tsx` — Ad-specific landing page renderer
- `src/components/ErrorBoundary.tsx` — React error boundary (catches render crashes)
- `src/components/dashboard/` — Dashboard tab components (leads, landing pages, UTM, assets, creatives, publishing)
- `src/utils/pixel.ts` — Unified Meta + Google conversion tracking (client + server CAPI)
- `src/utils/ab-testing.ts` — Deterministic A/B testing with chi-square significance
- `src/hooks/useAuditForm.js` — Form state, validation, and submission hook
- `src/lib/formData.js` — Form field options as constants (shared between frontend and API)
- `api/audit-form.js` — Vercel serverless function: validates, emails via Resend, returns JSON

### Styling patterns

- Tailwind CSS 4 with custom `@theme` tokens: `brand-*` (green palette), `accent-*` (indigo), `slate-750`
- Custom CSS utility classes in `index.css`: `.glass`, `.glass-dark`, `.gradient-hero`, `.gradient-brand`, `.gradient-accent`, `.gradient-mesh`
- Animation classes: `.animate-fade-up`, `.animate-fade-left`, `.animate-fade-right`, `.animate-scale-in`, `.animate-float`, `.animate-shimmer`, `.stagger-children`
- View components are large single files with inline data, section components, and helper functions — not heavily decomposed

### Important notes

- Database is PostgreSQL (connection via `api/_db.js`, schema in `db/migrate.js`)
- No test framework is configured
- CI runs lint, typecheck, and build on PRs via GitHub Actions (`.github/workflows/ci.yml`)
