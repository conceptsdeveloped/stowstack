---
name: score-lead
description: Score an incoming lead for fit and priority. Usage: /stowstack:score-lead "Facility Name"
arguments:
  - name: facility
    description: Facility name
    required: true
---

# Score Lead

Read the lead file from /leads/ for this facility.

Score on these dimensions (1-5 each):

## 1. Vacancy Pain (from occupancy range)
- Below 60% = 5
- 60-75% = 4
- 75-85% = 3
- 85-95% = 2
- Above 95% = 1

## 2. Facility Size (from total units)
- 500+ = 5
- 300-500 = 4
- 100-300 = 3
- Under 100 = 2

## 3. Problem Fit (from biggest vacancy issue)
- Lease-up / new facility = 5 (highest urgency, biggest upside)
- Overall low occupancy = 5
- Standard units not filling = 4
- Climate controlled sitting empty = 4
- Drive-up underperforming = 3
- Vehicle/RV/boat = 3
- Other = 2

## 4. Revenue Opportunity
Calculate: estimated vacant units × estimated avg rent × 12 months
- $100K+/year in lost revenue = 5
- $50-100K = 4
- $25-50K = 3
- $10-25K = 2
- Under $10K = 1

## 5. Readiness Signals
- Wrote detailed notes in the form = +1
- Mentioned being burned by an agency = +1 (they're actively looking)
- Lease-up / new build = +1 (time pressure)
- Multi-site operator = +1 (bigger deal potential)
- Responded to auto-reply email = +1
Score out of 5 based on how many signals are present.

## Total Score (out of 25)
- **20-25: HOT** — Run audit immediately. Prioritize for Zoom this week. This is a high-value, high-urgency lead.
- **15-19: WARM** — Standard audit timeline. Schedule Zoom within a week.
- **10-14: COOL** — Generate audit and send. Let them self-select into a call. Don't chase.
- **Below 10: COLD** — Low priority. Audit if time permits. May not be a fit. Don't invest heavy time.

## Output
Update the lead file in /leads/ with:
- Score: X/25
- Category: HOT/WARM/COOL/COLD
- Scoring breakdown
- Recommended next action based on category

Print the score summary to console.
