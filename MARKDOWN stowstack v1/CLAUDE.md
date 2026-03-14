# StowStack

## What This Is
StowStack is a full-funnel acquisition and conversion system for self-storage operators. Not an agency, not a SaaS platform. Domain: stowstack.co. This repo contains the public website, form backend, API layer, internal tools, and client dashboard.

The business helps independent self-storage operators (1-20 facilities) fill vacant units through ad-specific landing pages with embedded online reservation/move-in functionality, full-funnel attribution, and A/B testing based on revenue outcomes. The founder (Blake Burkett) is an active self-storage operator with 7 years in storage and U-Haul operations in Michigan.

**Core document:** See `STOWSTACK_CORE.md` for the complete product architecture, competitive positioning, pricing framework, and strategic vision.

## Tech Stack
- **Frontend:** Vite 6+ / React 19+ / Tailwind CSS 4+ / React Router v7
- **Icons:** Lucide React (import only what's used — tree shake)
- **Animations:** Framer Motion (subtle, not flashy)
- **Backend:** Cloudflare Workers / D1 (SQLite) / KV (rate limiting)
- **Email:** Resend API
- **Deployment:** Cloudflare Pages (site) + Cloudflare Workers (API)
- **Analytics:** Google Analytics 4 + Meta Pixel (both optional, fail silently if not configured)

## Commands
- `npm run dev` — start Vite dev server (localhost:5173)
- `npm run build` — production build to dist/
- `npm run preview` — preview production build locally
- `npm run lint` — ESLint check
- `npx wrangler dev` — run Cloudflare Workers locally (from workers/ subdirectory)
- `npx wrangler d1 migrations apply DB` — run D1 database migrations

## Project Structure
```
stowstack-app/
├── CLAUDE.md                    ← you are here
├── src/
│   ├── components/
│   │   ├── forms/               # AuditIntakeForm.jsx — the main conversion form
│   │   ├── layout/              # Navbar.jsx, Footer.jsx, MobileMenu.jsx, PageLayout.jsx
│   │   ├── sections/            # All homepage sections (Hero, Problem, Pricing, CTA, etc.)
│   │   └── ui/                  # Button, Badge, Card, Input, Select, SectionWrapper
│   ├── hooks/
│   │   └── useAuditForm.js      # Form state, validation, submission logic
│   ├── lib/
│   │   ├── constants.js         # ALL site copy, pricing, FAQ answers, comparison data
│   │   ├── formData.js          # Form field options (reused in frontend + backend validation)
│   │   ├── analytics.js         # GA4 + Meta Pixel helpers (no-op if env vars missing)
│   │   └── utils.js             # cn(), formatCurrency(), scrollToSection()
│   ├── pages/
│   │   ├── Home.jsx             # Assembles all sections in order
│   │   ├── Guide.jsx            # Meta ads educational content
│   │   └── Dashboard.jsx        # Client-facing metrics dashboard
│   ├── App.jsx                  # React Router setup
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind directives + global styles
├── workers/
│   ├── audit-form/              # POST /api/audit-form — form submission, email, D1 storage
│   ├── lead-pipeline/           # Lead management API (internal, API key auth)
│   └── client-dashboard/        # Client dashboard API (dashboard code auth)
├── migrations/                  # D1 SQL migration files
├── public/                      # Static assets, favicon, robots.txt
├── scripts/                     # Build/deploy/utility scripts
├── .env.example                 # Environment variable reference
├── vite.config.js
├── tailwind.config.js
├── wrangler.toml
└── package.json
```

## Brand System
Primary color is green. Tailwind config maps the green scale to "brand":
- brand-50 through brand-950 = Tailwind green-50 through green-950
- brand-600 (#16a34a) is the primary action color
- Dark sections use slate-900 or slate-950
- Light sections alternate white and slate-50
- Error/warning: red and amber from Tailwind defaults

## Homepage Section Order
Sections render top to bottom in this exact order. Background colors alternate for visual rhythm:
1. Hero — gradient slate-50 to white
2. Timeline — brand-600 (green)
3. Problem — slate-900 (dark) — id="problem"
4. Comparison — white
5. Calculator — slate-50
6. Founder — white — id="founder"
7. Advantages — slate-50
8. Targeting — slate-900 (dark)
9. Services — white — id="services"
10. Engine — slate-50 — id="engine"
11. BestFit — white
12. Reporting — slate-50
13. GuideBanner — brand-600 (green)
14. Pricing — white — id="pricing"
15. CaseStudy — slate-50
16. FAQ — white — id="faq"
17. CTA — slate-900 (dark) — id="cta"

## Environment Variables
```
# Frontend (must be prefixed with VITE_)
VITE_FORM_ENDPOINT=/api/audit-form
VITE_GA_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXX

# Workers
RESEND_API_KEY=re_xxxxxxxxxxxx
INTERNAL_API_KEY=sk-stowstack-xxxxxxxx
GOOGLE_SERVICE_ACCOUNT_JSON={}
GOOGLE_SHEET_ID=spreadsheet-id-here

# Client Dashboard
META_ACCESS_TOKEN=EAAG...
CALENDLY_URL=https://calendly.com/blake-stowstack/audit-review
```

## Voice and Copy Rules
All copy in this project must follow these rules:
- Direct, specific, grounded, operator-native, anti-corporate
- Use "I" not "we" — founder-led voice
- Lead with outcomes (occupancy, move-ins, revenue) not mechanisms (ads, targeting)
- Use operator vocabulary: occupancy, move-ins, vacancy, unit mix, concessions, lease-up, rate pressure, recurring revenue, speed-to-lead
- NEVER use: leverage, synergy, optimize (in marketing context), holistic, cutting-edge, unlock, empower, seamless, robust, game-changer
- Short sentences. Short paragraphs. No fluff.

## Pricing Data
- Starter: $1,200/mo — single location, 2 ad sets, monthly report
- Growth: $2,200/mo — full-funnel, retargeting, conversion strategy, bi-weekly calls (most popular)
- Multi-Site: Custom — 3+ locations, centralized reporting, dedicated management
- Ad spend separate, paid directly to Meta. Minimum recommended: $1,000/mo

## API Design
- Public endpoints: no auth, rate limited by IP
- Internal endpoints: X-API-Key header matching INTERNAL_API_KEY env var
- Client dashboard endpoints: dashboard_code (unique 8-char code per client) in query param or header
- All responses are JSON: { success: true, data: {} } or { success: false, error: "message", details: {} }
- CORS: allow stowstack.co and localhost:5173

## Database (D1 / SQLite)
Primary tables:
- `leads` — form submissions and pipeline tracking
- `lead_events` — timestamped activity log per lead
- `lead_tags` — tags for categorization
- `clients` — converted leads with campaign data
- `campaign_metrics` — daily performance snapshots per client
- `lead_entries` — individual leads generated by ad campaigns per client

## Key Patterns
- All site copy lives in src/lib/constants.js — sections import from there, never hardcode copy in components
- Form field options (dropdowns) live in src/lib/formData.js — shared between frontend validation and backend validation so they stay in sync
- Analytics calls are wrapped in helpers that no-op silently when env vars are missing — never break the site because analytics aren't configured
- All internal links use relative paths or scrollToSection() — never hardcode localhost or full domain URLs
- Sections use a SectionWrapper component for consistent padding (py-20), max-width (max-w-7xl mx-auto), and responsive horizontal padding (px-4 sm:px-6 lg:px-8)
- The FAQ accordion only allows one item open at a time
- The vacancy calculator uses React state with range inputs and live-calculated output
- The audit intake form is the single most important component — it is the entire top of the sales funnel, treat it accordingly

## Existing Site Reference
The current live site at stowstack.co has these elements already built (as a single-page React app):
- Fixed top navbar with logo, nav links, green CTA button, mobile hamburger
- Hero with badge, H1 with green accent text, dual CTA buttons, 5 credential badges
- 4-step timeline on green background
- 6-card problem section on dark background
- 8-row comparison table (Generic Agency vs StowStack)
- Interactive vacancy cost calculator with 3 sliders and live calculation
- Founder bio section with avatar placeholder, tags, bio paragraphs
- 6-card advantages section
- 9-card demand trigger targeting section on dark background
- 8-card services grid
- 6-step occupancy engine flow
- 5-card best-fit clients section
- Example reporting dashboard with 6 metrics
- Guide banner CTA on green background
- 3-tier pricing section (Starter/Growth/Multi-Site)
- Illustrative case study card with 3 stats
- 9-question FAQ accordion (questions visible, answers need to be wired up)
- CTA section with left column (copy + trust signals) and right column (audit intake form)
- Footer with logo, links, copyright

All of this content must be preserved exactly during the component refactor. Copy is in the HTML — extract it to constants.js.

## Deployment
- Site deploys to Cloudflare Pages from the dist/ directory
- Workers deploy via wrangler from the workers/ subdirectory
- _redirects file handles SPA fallback: /* to /index.html 200
- D1 migrations run via wrangler CLI before worker deployment

## What NOT to Do
- Don't use localStorage or sessionStorage in components
- Don't add dependencies without checking if Tailwind/Lucide/Framer Motion already covers it
- Don't create separate CSS/JS files for components — single-file components with Tailwind classes
- Don't use generic stock copy — everything must be self-storage specific and operator-native
- Don't hardcode any URLs — use env vars or relative paths
- Don't add auth libraries yet — dashboard uses simple code-based access, internal APIs use API key header
- Don't over-engineer — this is not a SaaS platform. Simple beats clever every time.
- Don't use semicolons inconsistently — pick one style (no semicolons preferred) and stick with it
- Don't import entire icon libraries — import individual icons: import { Search } from "lucide-react"

## Build Priority
When building features, follow this order (matches the actual sales motion):
1. Audit intake form component + form submission API with email notifications
2. Lead storage in D1 + Google Sheets backup
3. Site component refactor (break monolithic HTML into React components preserving all content)
4. Client dashboard backend + frontend
5. Analytics and tracking (Meta Pixel, GA4, conversion events)
6. SEO, structured data, deployment config
7. Guide page content
8. Everything else
