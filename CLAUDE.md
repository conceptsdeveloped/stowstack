# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

StowStack is a marketing website and internal dashboard for a Meta ads agency serving self-storage operators. The product helps independent self-storage operators (1-20 facilities) fill vacant units through targeted Facebook/Instagram ad campaigns. Domain: stowstack.com.

## Repository Layout

The repo contains two top-level directories (note the spaces in directory names):

- **`vite +react stowstack v1/`** — The main Vite + React web application (this is where all code lives)
- **`MARKDOWN stowstack v1/`** — Markdown templates for sales campaigns, audit reports, lead scoring, and business operations (not code)

All development commands must be run from inside `vite +react stowstack v1/`.

## Commands

```bash
cd "vite +react stowstack v1"
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run lint       # ESLint
```

## Tech Stack

- **React 18** with JSX (no TypeScript)
- **Vite 5** as build tool
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (configured in `vite.config.js`, theme in `src/index.css` using `@theme`)
- **Lucide React** for icons
- **Recharts** for dashboard charts
- **Deployed to Vercel** (see `vercel.json` for SPA rewrites and caching)

## Architecture

The app uses **client-side view switching via React state** — no router. `App.jsx` manages a `view` state string (`'website'`, `'dashboard'`, `'guide'`, `'library'`, `'login'`) and conditionally renders the corresponding view component.

### Key files

- `src/App.jsx` — Top-level view switcher with floating nav toggle (top-right corner)
- `src/views/Website.jsx` — Main marketing landing page (~86KB, single-file with all sections and data inline)
- `src/views/Dashboard.jsx` — Internal analytics dashboard with mock data
- `src/views/MetaAdsGuide.jsx` — Educational content about Meta ads for storage operators
- `src/views/Library.jsx` — Resource library
- `src/views/ClientLogin.jsx` / `ClientPortal.jsx` — Client auth (uses `localStorage` key `stowstack_client`)
- `src/data/mockData.js` — Mock client/facility data used by Dashboard
- `src/components/Chatbot.jsx` — Floating chatbot widget (present on all views)
- `src/components/ScrollReveal.jsx` — IntersectionObserver wrapper for scroll-triggered animations

### Styling patterns

- Tailwind CSS 4 with custom `@theme` tokens: `brand-*` (green palette), `accent-*` (indigo), `slate-750`
- Custom CSS utility classes in `index.css`: `.glass`, `.glass-dark`, `.gradient-hero`, `.gradient-brand`, `.gradient-accent`, `.gradient-mesh`
- Animation classes: `.animate-fade-up`, `.animate-fade-left`, `.animate-fade-right`, `.animate-scale-in`, `.animate-float`, `.animate-shimmer`, `.stagger-children`
- View components are large single files with inline data, section components, and helper functions — not heavily decomposed

### Important notes

- The `src/components/dashboard/` and `src/components/website/` directories exist but are empty — all component code is currently inline within the view files
- No backend/API — all data is mocked client-side
- No test framework is configured
