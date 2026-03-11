---
name: run-audit
description: Research a facility and generate a complete audit report. Usage: /stowstack:run-audit "Facility Name, City, ST"
arguments:
  - name: facility
    description: Facility name and location, e.g. "Midway Self Storage, Cassopolis, MI"
    required: true
---

# Run Facility Audit

You are generating a facility audit for StowStack. Read context/diagnostic-framework.md and context/voice-and-style.md first.

## Step 1: Check for existing lead data
Look in /leads/ for a markdown file matching this facility. If found, load all lead data (form submission info, notes).

## Step 2: Research the facility
Using web search, gather:
- Facility address, phone, website, hours
- Google Business rating and review count
- Top 5-8 competitors within 10 miles (name, distance, rating, reviews)
- Facility website quality assessment (does it have: SSL, mobile-friendly, online rental, clear pricing, phone number visible, current promotions, unit availability)
- Whether they are currently running Facebook/Instagram ads (search Meta Ad Library)
- Local search demand signals for "self storage" + their city

Save raw research to output/audits/{facility-slug}-research-{YYYY-MM-DD}.md

## Step 3: Generate the audit report
Using the research data and any lead data from /leads/, generate a full audit report.

Sections:
1. **Facility Snapshot** — What we know: location, size, occupancy, unit types
2. **Market Position** — Competitive analysis: who's nearby, ratings, reviews, pricing signals
3. **Digital Presence Audit** — Website quality, SEO signals, online rental, phone/CTA visibility
4. **Diagnostic Assessment** — Bucket A-D classification. THIS IS THE MOST IMPORTANT SECTION. Be specific about which buckets apply and why.
5. **Demand Analysis** — Local search demand, seasonal patterns, competitor ad activity, untapped demand triggers
6. **Revenue Leakage Estimate** — Calculate: estimated vacant units × conservative avg rent ($100-150) × months. Show the math.
7. **Recommended Action Plan** — Prioritized list. Each recommendation: what to do, why it matters (tied to revenue), expected impact (directional), whether StowStack handles it or it's operational.
8. **StowStack Fit Assessment** — Good fit? Which tier? What needs to happen first? If bad fit, say so honestly.
9. **Zoom Call Talking Points** — 3-5 specific things to highlight on the audit review call that will resonate with this operator.

## Step 4: Save outputs
- Save report to output/audits/{facility-slug}-audit-{YYYY-MM-DD}.md
- If a lead file exists in /leads/, update it with audit status and date

## Voice
Be direct, specific, operator-native. No fluff. Tie everything to occupancy and revenue. If ads won't fix the problem, say so honestly.
