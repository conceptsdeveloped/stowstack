# StowStack: Architectural Decisions

Why we built it this way. Reference doc for understanding the system design rationale.

---

## Technology Stack

### Decision: Vite + React instead of Next.js

**What we chose:** Vite (build tool) + React 18 (UI) + Vercel (deployment)

**Alternatives considered:**
1. Next.js + API routes
2. Astro (static generation)
3. Remix (server-side routing)

**Why Vite + React:**

1. **Speed for the dev experience**
   - Vite HMR is instant (< 100ms)
   - Build to production is < 5 seconds
   - Faster iteration = faster learning for a young product
   - Next.js adds 10-15 second builds, not worth it pre-product-market-fit

2. **Simplicity of architecture**
   - No database on every request (like RSCs would require)
   - No middleware/server logic pollution
   - Clear separation: frontend (React) + backend (Vercel Functions)
   - Easier to understand for new engineers (smaller surface area)

3. **Client-side view switching without router**
   - We control all state in one place (`App.jsx`)
   - No route-based code splitting (simpler during exploration)
   - Faster page transitions (no server request)
   - Easier to implement floating nav (shared across all views)
   - Makes landing page experiments simpler (same base, swap views)

4. **Vercel Functions as natural API layer**
   - We already use Vercel for deployment
   - Functions integrate seamlessly
   - No need for Next.js server logic (we don't need SSR)
   - Can migrate to Next.js API routes later if needed (backwards compatible)

5. **Cost**
   - Smaller bundle size (Vite tree-shakes better than Next.js)
   - Fewer Vercel function invocations (only on conversion events)
   - No server rendering = no origin server costs

**Trade-offs we accept:**
- No server-side rendering (SEO lighter, but fine for a SaaS tool)
- No automatic API route organization (we use `/api/` folder convention)
- Have to manage data fetching manually (useEffect, not server components)
- No built-in image optimization (Tailwind handles this)

**When we'd switch to Next.js:**
- Need SSR for better SEO (unlikely for StowStack, it's a tool)
- Need real-time server-side features (unlikely, we're event-driven)
- Team grows and wants opinionated structure (possible future)

**Conclusion:** Vite + React is the right speed for exploring the product. Low cost, fast feedback. Can upgrade to Next.js without rearchitecting if needed.

---

### Decision: Tailwind CSS 4 with @theme Custom Tokens

**What we chose:** Tailwind CSS 4 using `@theme` for custom brand colors

**Alternatives considered:**
1. CSS Modules
2. Styled Components
3. Tailwind default colors only
4. CSS-in-JS (Emotion, Styled-Components)

**Why Tailwind + @theme:**

1. **Zero runtime cost**
   - All styling is static CSS (no JS overhead)
   - Builds to pure CSS file (~40KB minified)
   - Fastest possible page loads

2. **Brand colors are consistent**
   - Define once in `@theme`, use everywhere
   - `bg-brand-500` means consistent green across all pages
   - Easy to change brand color globally (one line change)
   - No prop-drilling for theme colors

3. **Naming clarity**
   - `brand-*` colors = our brand (green palette)
   - `accent-*` colors = secondary (indigo for CTAs, highlights)
   - `slate-*` = neutral grays
   - Self-documenting color usage across codebase

4. **Maintainability for non-CSS engineers**
   - Tail classes are readable (no "what does this class do?" mystery)
   - Constraints prevent bad design decisions (limited spacing, color options)
   - Can't accidentally use 47 different shades of gray

5. **Component animation/effects are built-in**
   - Custom classes like `.gradient-hero`, `.animate-float`
   - Reusable across views without prop drilling
   - Easy to adjust animation timing globally

**Trade-offs we accept:**
- Can't create fully dynamic themes at runtime (fine, we have brand guidelines)
- Larger class names in HTML (acceptable, cleaner code)
- No component library paradigm (but our components are mostly inline, fine)

**Implementation:**
```css
/* src/index.css */
@theme {
  --color-brand-50: #f0fdf4;   /* Lightest green */
  --color-brand-500: #16a34a;  /* Main brand green */
  --color-brand-950: #14532d;  /* Darkest green */

  --color-accent-500: #4f46e5; /* Indigo for CTAs */

  --color-slate-750: #1f2937;  /* In-between gray */
}
```

**Conclusion:** Tailwind @theme is the right choice for a focused product with clear branding. Constraints are good. Move to CSS-in-JS only if we need runtime theming (unlikely).

---

## Data & Attribution

### Decision: Server-Side CAPI Instead of Browser-Only Tracking

**What we chose:** Dual-layer tracking (browser pixel + server API)

**Alternatives considered:**
1. Browser pixel only (Meta fbq, Google gtag)
2. Server API only (no client pixel)
3. Custom event queue to Postgres

**Why server-side CAPI:**

1. **Privacy compliance**
   - iOS privacy features block browser pixels 30-50% of the time
   - CAPI (server-to-server) bypasses these blocks
   - Can hash user data before sending (GDPR compliant)
   - Works even if user blocks third-party cookies

2. **Conversion accuracy**
   - Browser pixels miss conversions when: ad blocker, privacy tools, network error, page unload
   - Server API ensures event reaches Meta/Google even if browser pixel fails
   - Deduplication prevents double-counting (same event_id sent both ways)
   - Final reporting is more accurate with server data

3. **Attribution control**
   - We hash email/phone on the server (not on browser)
   - More control over what data we send where
   - Can validate conversion data before forwarding
   - Can implement custom attribution logic if needed

4. **Real-time optimization**
   - Browser pixel fires immediately (Meta/Google optimize instantly)
   - Server API fires in background (doesn't block user interaction)
   - Both fire simultaneously = best of both worlds
   - Async, non-blocking pattern is inherently better UX

5. **Cost efficiency**
   - CAPI charged per event (cheaper than browser pixel impressions)
   - Can batch events server-side (not applicable here, but possible)
   - Avoid paying for wasted impressions (ad blocker, fake clicks)

**Trade-offs we accept:**
- Server API has 1-2 second delay (acceptable, not blocking user)
- Need to maintain `/api/meta-capi` and `/api/google-conversion` endpoints
- Need to securely store API tokens in Vercel

**Implementation:**
```
User fills form
  ↓
Fire browser pixel immediately (fbq + gtag)
  ↓
POST to /api/meta-capi (background)
  ↓
POST to /api/google-conversion (background)
  ↓
Both see same event_id, deduplicate, count as 1 conversion
```

**Conclusion:** Dual-layer tracking is industry standard for performance marketing. Browser pixel catches missed conversions, server API provides accuracy. Cost is low (only on actual conversions).

---

### Decision: UTM Parameter-Based Attribution Instead of Cookies

**What we chose:** Store utm_source, utm_campaign, utm_content in sessionStorage, pass with conversions

**Alternatives considered:**
1. First-party cookies (persistent)
2. Browser LocalStorage (persistent)
3. Analytics library (GA, Amplitude)
4. Custom attribution database

**Why UTM parameters:**

1. **Simplicity**
   - UTM params are standard (Google invented them)
   - Passed in URL, automatically captured by all analytics
   - No need for cookies, no GDPR concerns
   - Works even with strict privacy mode

2. **Clarity**
   - Direct link between ad (utm_source=facebook) and conversion
   - Clear attribution: who drove this lead?
   - No ambiguity about which campaign triggered conversion
   - Easy to debug ("this lead is missing utm source" = easy to find)

3. **Works with forms**
   - Capture UTM from URL on page load
   - Store in sessionStorage
   - On form submit: Include utm params in data sent to pixel
   - Forms submit to own endpoint, but pixel captures utm context

4. **Works with storEDGE**
   - Pass utm params to storEDGE iframe URL
   - storEDGE includes them in reservation data
   - Facility sees "This reservation came from Facebook summer campaign"
   - Links paid traffic all the way to actual unit type/occupancy

5. **No cookie complexity**
   - No GDPR cookie consent needed
   - No "third-party cookie" blockers
   - No cookie expiration edge cases
   - Works in Safari, Chrome, incognito mode

**Trade-offs we accept:**
- Can't track multi-touch journeys (only last-click source)
- utm params get lost if user navigates away and comes back (ok, sessionStorage is per-session)
- Need to manually construct UTM urls (not auto-generated by platform)

**Implementation:**
```javascript
// On page load, capture UTM params
const params = new URLSearchParams(window.location.search);
const utm = {
  source: params.get('utm_source'),
  medium: params.get('utm_medium'),
  campaign: params.get('utm_campaign'),
  content: params.get('utm_content'),
};
sessionStorage.setItem('utm', JSON.stringify(utm));

// On form submit, include UTM with conversion event
const utm = JSON.parse(sessionStorage.getItem('utm'));
trackConversion({
  event_name: 'Lead',
  user_data: { email: formData.email },
  utm: utm,  // Sent to meta-capi and google-conversion
});
```

**Conclusion:** UTM parameters are the simplest, most transparent attribution method. Works with privacy-first browsers. Scales as we add more campaigns.

---

## Testing & Experimentation

### Decision: URL-Based A/B Testing Instead of Cookie-Based

**What we chose:** Different landing page URLs per variant, UTM params distinguish variant

**Alternatives considered:**
1. Cookie-based bucketing (variant stored in cookie)
2. Analytics platform A/B testing (GA, Optimizely)
3. Server-side bucketing (decide on server, return variant)
4. CDN-based bucketing (Cloudflare, Netlify)

**Why URL-based A/B testing:**

1. **Simplicity for self-storage operators**
   - Facility manager can see: "This ad goes to URL X (variant A), this ad goes to URL Y (variant B)"
   - Clear, auditable, no black box
   - Easy to change: Just modify ad URL, no code deploy needed

2. **Attribution clarity**
   - Each variant has unique URL → unique UTM content
   - Analytics automatically separate variants
   - No need for custom event properties or experiment framework
   - Reports naturally show: "Variant A: 5 leads, Variant B: 8 leads"

3. **No tracking needed**
   - Don't need analytics framework (GA, Optimizely)
   - Don't need A/B testing library
   - URL itself is the experiment metadata
   - Reduces JavaScript footprint

4. **Works with all platforms**
   - Meta Ads: Different URL per variant = automatic bucketing
   - Google Ads: Different URL per variant = automatic bucketing
   - Email: Different links = different variants
   - No need for platform-specific A/B testing setup

5. **Privacy-compliant**
   - No cookies needed
   - No user fingerprinting
   - No privacy tool concerns

**Trade-offs we accept:**
- Can't do sophisticated experiment designs (A/B/C tests, multivariate)
- Can't track same user across variants (cookie not used)
- Need unique URLs for each variant (URL bloat)
- Pre-segment traffic based on campaign source (can't randomize server-side)

**Implementation:**
```
Campaign: "Paw Paw Storage - Summer Special"

Variant A (Urgency): https://stowstack.co/paw-paw/summer?utm_content=urgent
Variant B (Authority): https://stowstack.co/paw-paw/summer?utm_content=authority
Variant C (Price): https://stowstack.co/paw-paw/summer?utm_content=price

Ad network allocates budget:
- 33% → Variant A URL
- 33% → Variant B URL
- 33% → Variant C URL

Analytics naturally shows:
- utm_content=urgent: 5 leads, $25 CPL
- utm_content=authority: 8 leads, $18 CPL
- utm_content=price: 3 leads, $35 CPL

→ Scale authority variant, pause price variant
```

**Conclusion:** URL-based A/B testing is perfect for performance marketing. Transparent, simple, works with all ad platforms. Scale to multivariate testing only if we hit statistical power limitations (many months from now).

---

## Code Organization

### Decision: Inline Components in View Files, Not Decomposed

**What we chose:** Large single-file view components (Website.jsx, Dashboard.jsx) with all sections inline

**Alternatives considered:**
1. Component tree structure (components/sections/HeaderSection.jsx, etc.)
2. Storybook component library
3. Component composition pattern
4. Micro-components (every element is a component)

**Why inline components:**

1. **Exploration velocity**
   - Moving sections around is easier when all code is in one file
   - No folder structure to maintain
   - No prop drilling to figure out
   - Can see entire page flow in one file (scroll through, understand the whole thing)

2. **Self-contained views**
   - Website.jsx has all marketing page code
   - Dashboard.jsx has all dashboard code
   - Easy to reason about: "what's on the website?" → open Website.jsx
   - Dependencies are clear (all at top of file)

3. **Easier for beginners**
   - New engineer opens Website.jsx, sees everything
   - Doesn't need to understand component architecture
   - No "where does this data come from?" mystery
   - Simple mental model: One view = one file

4. **Performance is fine**
   - React components are cheap (renders are cached)
   - We don't have 1000s of components
   - Bundle size is small
   - No performance problem until we have that problem

5. **Refactoring is low-cost**
   - If we need to decompose later, it's trivial
   - React makes file splitting easy (just move code to new file + import)
   - No sunk cost in component architecture

**Trade-offs we accept:**
- Website.jsx is 800+ lines (a bit long, but still readable)
- Some component code is duplicated
- Can't reuse a section easily between views (unlikely need)
- Requires discipline to not let files grow into unmaintainable size

**Future condition:** If a file hits 2000+ lines or has clear sub-sections, split it.

**Conclusion:** Single-file views are the right call for a young product. We're not optimizing for component library reuse. Refactoring is trivial later.

---

### Decision: Direct Data in Components, Not Centralized Store

**What we chose:** Mock data in mockData.js, imported directly into Dashboard.jsx

**Alternatives considered:**
1. Redux / Zustand (centralized state)
2. Context API with hooks
3. React Query (server state)
4. Jotai (atomic state)

**Why direct data:**

1. **No state management complexity**
   - We don't have complex state mutations
   - Single components manage their own state (form inputs, view toggles)
   - No need to sync state between multiple components
   - No need for time-travel debugging (Redux DevTools)

2. **Data fetching is simple**
   - Dashboard shows mock data (no real database yet)
   - When we add Postgres, we'll use React Query for server state
   - No need to refactor now

3. **Less boilerplate**
   - No action creators, reducers, dispatch calls
   - Just import data and use it
   - Readable for beginners

4. **Easy to swap out later**
   - To add Redux: wrap App with Provider, move data to store
   - To add Postgres: replace mockData with React Query hooks
   - No architecture lock-in

**Trade-offs we accept:**
- Can't share state easily between views (fine, views are isolated)
- Can't persist state across view switches (fine, not needed yet)
- Testing state changes is harder without store (ok, we don't have tests yet)

**Future condition:** When we have Postgres:
- Move to React Query for server state
- Use Zustand for client state if needed (form state, UI toggles)
- Still avoid complex Redux setup (unnecessary for this product size)

**Conclusion:** Simple, direct data usage is right for MVP. Add state management when we need it, not before.

---

## Landing Pages

### Decision: Landing Page Templates vs. Page Builder

**What we chose:** Reusable template patterns (HTML/React components), customize via config, no visual page builder

**Alternatives considered:**
1. Visual drag-and-drop builder (like Unbounce, Leadpages)
2. HTML template editor (raw HTML editing)
3. Headless CMS (Contentful, Sanity)
4. Hardcoded pages (new code for each page)

**Why templates:**

1. **Control & customization**
   - We own the code, can add features/tracking easily
   - Can embed storEDGE, pixels, etc. without limitations
   - Not locked into third-party platform constraints
   - Can optimize for our specific use case (self-storage)

2. **Cost efficiency**
   - No page builder subscription ($500-5000/month for Unbounce, etc.)
   - Hosting on Vercel is $20-50/month total
   - Savings scale with number of facilities

3. **Learning & education**
   - By building templates ourselves, we understand conversion patterns
   - Can improve templates based on what works
   - Can document "why this layout converts" for facility managers

4. **Speed**
   - No page builder UI overhead
   - Can create template in 30 mins
   - Can spin up new facility in hours, not days

5. **Dark patterns prevention**
   - Page builders make it easy to add dark UX (hidden costs, hard-to-cancel, etc.)
   - We control the design, can ensure good UX
   - Can teach facility managers conversion best practices

**Trade-offs we accept:**
- Facility managers can't design pages themselves (they need us)
- No WYSIWYG editor
- Requires custom code for new template types
- Need to maintain our own templates

**Implementation:**
```
/src/templates/
  ├── ReserveNow.jsx           (Simple reservation page)
  ├── OfferPromotion.jsx        (Discount offer page)
  ├── UnitComparison.jsx        (Unit sizing comparison)
  └── CustomerReviews.jsx       (Social proof page)

Each template has:
- Reusable sections (Header, Hero, storEDGE Embed, Footer)
- Config object for customization (headline, offer, colors)
- Built-in analytics events
- Mobile responsive styling
```

**Conclusion:** Custom templates give us control and save money. Can upgrade to builder platform later if demand justifies it. For now, this is right.

---

## Conversions & Attribution

### Decision: storEDGE Embed (Iframe) Instead of API Integration

**What we chose:** Embed storEDGE as iFrame, pass UTM params through, facility owns reservations

**Alternatives considered:**
1. API integration (fetch available units, build custom UI)
2. Redirect to storEDGE (lost control of experience)
3. Build our own reservation system
4. Use Airbnb hosting clone (wrong domain, wrong UX)

**Why storEDGE embed (iFrame):**

1. **Clear responsibility**
   - storEDGE handles transactions (unit selection, payment, lease)
   - We handle marketing (traffic, attribution, lead capture)
   - Facility controls both (owns PMS, owns storEDGE account)
   - We're not a middleman holding customer data

2. **Privacy & compliance**
   - Customer data goes directly to facility's storEDGE account
   - We don't store payment info
   - GDPR compliant (no data intermediary)
   - PCI DSS compliance is storEDGE's responsibility

3. **Offline tracking**
   - storEDGE includes utm source/campaign in reservation data
   - Facility sees "this reservation came from Facebook summer campaign"
   - Attribution works even if customer doesn't complete on same visit
   - Can track to actual move-in (not just reservation)

4. **Technology flexibility**
   - If facility switches reservation system (OpenSolve, CubeSmart, etc.), we just change embed URL
   - Not locked into storEDGE
   - Could integrate other systems (API, different embed, etc.)
   - Loosely coupled

5. **Unit availability in real-time**
   - storEDGE pulls from facility's actual PMS
   - Shows true availability (not cached, not guessed)
   - Customers see accurate information (builds trust)
   - No sync issues between StowStack and facility

**Trade-offs we accept:**
- Can't customize checkout experience deeply
- Can't see conversion funnel details (storEDGE owns that)
- Can't do upsell/cross-sell in our funnel (separate flow)
- Rely on storEDGE uptime (if down, we can't process reservations)

**Future condition:** If storEDGE becomes a bottleneck or limitations blocking growth, we could:
1. Build our own minimal checkout (just payment processing)
2. Integrate direct with PMS APIs (complex, lots of vendor-specific code)
3. Partner with other reservation systems

**Conclusion:** storEDGE embed is the right partnership model. Clear separation of concerns, good for compliance, good for attribution. Keep ownership with facility, we optimize funnel top.

---

## Reporting & Analytics

### Decision: Multi-Touch Attribution Model (Last-Click + First-Click + Linear)

**What we chose:** Report three attribution models side-by-side, let facility manager decide

**Alternatives considered:**
1. Last-click attribution only
2. First-click attribution only
3. Custom data-driven model
4. Time-decay model
5. Single model (don't show options)

**Why three models:**

1. **Different questions answered**
   - Last-click: "Which campaign closed the deal?"
   - First-click: "Which campaign started the awareness?"
   - Linear: "Did all campaigns contribute equally?"
   - Each is true in different contexts

2. **Facility managers understand instinctively**
   - Last-click: "Google brought in 5 move-ins" (true, they clicked Google before moving in)
   - First-click: "Facebook brought awareness to 12 people" (true, they saw Facebook first)
   - Together: "Need both Facebook (awareness) + Google (final push)"
   - Data-driven model is a black box to them

3. **Prevents over-optimization**
   - If only last-click: Facility cuts Facebook (awareness) and wonders why Google gets expensive
   - Shows the full picture: Can't cut channels without losing efficiency
   - Teaches marketing fundamentals

4. **Honest about limitations**
   - We're not pretending we have perfect attribution (we don't)
   - Showing multiple models = we know they're all imperfect
   - Facility can pick which best fits their mental model

**Trade-offs we accept:**
- Three numbers instead of one (can be confusing)
- No "true" single attribution (doesn't exist for self-storage use case)
- Require explanation to facility managers
- May drive different optimization decisions per model

**Implementation:**
```
Campaign Report:
                    Last-Click  First-Click  Linear
Google Branded      8 move-ins  3 move-ins   5 move-ins  $67 CPL  $211 per MV
Meta Ads           2 move-ins   6 move-ins   4 move-ins  $42 CPL  $525 per MV
Organic/Direct     1 move-in    2 move-ins   2 move-ins  N/A      N/A

Interpretation:
- Google gets last clicks (high intent) = good for closings
- Meta gets first clicks (awareness) = need for funnel volume
- Linear shows "fair share" if budgets split equally
```

**Conclusion:** Multiple attribution models show the full picture. Teach facility managers how marketing works, not which attribution model to trust blindly.

---

## Summary: Design Principles

These decisions reflect three core principles:

### 1. **Simplicity over Features**
- Vite + React (not Next.js SSR)
- URL-based A/B testing (not Optimizely)
- Direct data (not Redux)
- Inline components (not design system)
- Multi-touch reporting (not one magic number)

Build simple things that work. Add complexity when it's required, not when it's possible.

### 2. **Transparency over Automation**
- UTM parameters (facility can see "this lead is from Facebook")
- storEDGE embed (facility owns transactions)
- Landing page templates (facility understands how pages work)
- Multiple attribution models (not hiding decisions in algorithm)
- Manual A/B variant URL creation (facility controls tests, not us)

Facility managers should understand how the system works. No black boxes. No hidden optimization.

### 3. **Operator-First over Engineer-First**
- Config file setup instead of code changes
- Template patterns instead of component libraries
- Clear documentation instead of "read the code"
- Straightforward tooling instead of advanced DevOps
- Multi-click attribution instead of machine learning

Self-storage operators use this system. They're not engineers. Explain things simply, let them control things, make changes obvious.

---

**Decision Framework for Future Choices:**

When deciding between two architectures, ask:

1. **Can facility managers understand it?** (if no, simplify)
2. **Can we launch without it?** (if yes, defer)
3. **Does it solve a real problem today?** (if no, don't build)
4. **Can we refactor it later?** (if yes, choose the simple version)

**Updated:** 2026-03-14
