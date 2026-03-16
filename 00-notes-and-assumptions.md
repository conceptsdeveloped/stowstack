# Notes and Assumptions — Overnight Cowork Session

**Date:** March 16, 2026
**Session scope:** 16 content and strategy deliverables for StowStack

---

## Assumptions Made

1. **Source-of-truth files:** The user referenced `about-stowstack.md`, `current-priorities.md`, and `brand-voice.md` — these exact filenames don't exist in the repo. I used the closest equivalents:
   - `MARKDOWN stowstack v1/STOWSTACK_CORE.md` (positioning, architecture, competitive landscape)
   - `MARKDOWN stowstack v1/voice-and-style.md` (brand voice rules)
   - `MARKDOWN stowstack v1/icp-and-sales.md` (ICP, sales motion, pricing)
   - `MARKDOWN stowstack v1/site-copy/*.md` (all site page copy)
   - `DECISIONS.md` (architecture decisions)
   - `CLAUDE.md` (repo-level instructions)

2. **Pricing discrepancy:** The `icp-and-sales.md` file lists Starter at $1,200/mo and Growth at $2,200/mo, while `STOWSTACK_CORE.md` and the site copy list Launch at $750/mo and Growth at $1,500/mo. I used the STOWSTACK_CORE.md pricing throughout as it appears to be the more recent/canonical source. Blake should confirm which is current.

3. **Case study data:** I treated the Midway Self Storage and Lakeshore Storage numbers from the homepage copy as real/approved for use across deliverables. If these are aspirational or projected, some copy may need adjustment.

4. **"I" vs "we" voice:** The brand voice guide says to use "I" (founder-led). All new deliverables use "I" (Blake speaking). The existing site uses "we" — this is flagged as the #1 fix in the site audit and priority fixes docs.

5. **Blake's full name:** Used "Blake Burkett" based on the About page copy and team section in App.tsx.

---

## Blockers and Limitations

1. **Could not browse live site:** Both WebFetch (network egress blocked) and Claude in Chrome (extension not connected) were unavailable. The site audit (Task 1) was conducted using the markdown source copy files in `MARKDOWN stowstack v1/site-copy/` and the React component data in `src/App.tsx`. The audit covers copy and messaging thoroughly but could not assess:
   - Page load speed
   - Mobile responsiveness
   - Visual design and layout
   - Above-the-fold content hierarchy
   - Form UX and conversion flow
   - Actual deployed state (may differ from source files)

2. **Could not browse competitor sites:** StorageRankers.com and Adverank.com were also blocked. The competitive teardown (Task 2) was built using:
   - Detailed competitor analysis already in `STOWSTACK_CORE.md`
   - WebSearch results for both competitors
   - This provides solid messaging/positioning analysis but may miss recent site changes

3. **SEO keyword map (Task 12):** Search volume estimates are directional, not from a keyword tool (no access to Ahrefs, SEMrush, etc.). Recommend validating with actual search data.

4. **PDF one-pager (Task 5):** Created programmatically with reportlab. The design is clean but basic — may want a designer to polish it for final use. The content and structure are solid.

---

## Items Skipped

None. All 16 tasks were completed.

---

## Git Commit/Push Status

**Commit failed.** A `.git/index.lock` file exists in the repo and cannot be removed due to filesystem-level permissions (`Operation not permitted` on rm, unlink, and Python os.unlink). This appears to be a filesystem immutability flag or sandbox restriction.

**What was staged:** All 17 new files were successfully staged via `git add` (confirmed with `git status`). No existing files were modified or staged.

**What Blake needs to do:**
1. Run `rm .git/index.lock` from a terminal with full permissions
2. Run `git add 00-notes-and-assumptions.md 01-site-audit.md 02-competitive-teardown.md 03-hero-copy-variants.md 04-objection-responses.md 05-stowstack-one-pager.pdf 06-meta-ad-copy.md 07-landing-page-copy.md 08-cold-email-sequence.md 09-sales-call-script.md 10-case-study-template.md 11-linkedin-posts.md 12-seo-keyword-map.md 13-onboarding-checklist.md 14-pricing-page-copy.md 15-retargeting-ad-copy.md 16-priority-fixes.md`
3. Run `git commit -m "overnight cowork session — stowstack content and strategy assets"`
4. Run `git push`

---

## Files Created (17 total)

| # | File | Description |
|---|------|-------------|
| 00 | `00-notes-and-assumptions.md` | This file |
| 01 | `01-site-audit.md` | Full site audit of stowstack.co |
| 02 | `02-competitive-teardown.md` | StorageRankers + Adverank analysis |
| 03 | `03-hero-copy-variants.md` | 5 homepage hero headline variants |
| 04 | `04-objection-responses.md` | Top 10 operator objections + responses |
| 05 | `05-stowstack-one-pager.pdf` | PDF sell sheet for outbound |
| 06 | `06-meta-ad-copy.md` | 10 Meta ad primary text variations |
| 07 | `07-landing-page-copy.md` | Full landing page wireframe copy |
| 08 | `08-cold-email-sequence.md` | 5-email cold outbound sequence |
| 09 | `09-sales-call-script.md` | 20-min discovery call script |
| 10 | `10-case-study-template.md` | Blank case study template |
| 11 | `11-linkedin-posts.md` | 10 LinkedIn posts |
| 12 | `12-seo-keyword-map.md` | 20 keywords + blog titles + angles |
| 13 | `13-onboarding-checklist.md` | Client onboarding checklist |
| 14 | `14-pricing-page-copy.md` | Pricing/how-we-work page copy |
| 15 | `15-retargeting-ad-copy.md` | 8 retargeting ad variations |
| 16 | `16-priority-fixes.md` | Top 5 highest-impact site fixes |

---

## Recommendations for Blake

1. **Confirm pricing:** Reconcile the $750/$1,500 (STOWSTACK_CORE) vs $1,200/$2,200 (icp-and-sales) discrepancy before using any of these assets externally.
2. **Browse the live site:** Do a visual walkthrough since I couldn't assess design, layout, mobile UX, or page speed.
3. **Validate SEO keywords:** Run the keyword map through Ahrefs or SEMrush for actual search volume data.
4. **Polish the PDF:** The one-pager content is solid but a designer could elevate the visual presentation.
5. **Prioritize the voice fix:** Switching from "we" to "I" across the site is the single highest-impact change for operator trust.
