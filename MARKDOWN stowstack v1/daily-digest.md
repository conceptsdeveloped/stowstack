---
name: daily-digest
description: Show pipeline status, follow-ups due, and leads needing action. Usage: /stowstack:daily-digest
---

# Daily Digest

Scan /leads/ and /clients/ folders. For each lead/client file, read the Status and Next Follow-Up fields.

## Pipeline Status
List all leads grouped by status:
- **New** — need audit generated
- **Researched** — audit in progress
- **Audit Sent** — waiting for response / zoom scheduling
- **Zoom Scheduled** — prep needed
- **Zoom Complete** — proposal needed
- **Proposal Sent** — waiting for decision
- **Active Client** — campaign running
- **Nurture** — check-in needed at 30-day marks
- **Closed** — no action needed

Show count per status.

## Urgent Actions (Do Today)
- Leads with status "new" that have no audit file in output/audits/ — need /stowstack:run-audit
- Leads with "Zoom Scheduled" for today or tomorrow — need /stowstack:zoom-prep
- Leads with "Next Follow-Up" date of today or earlier — need follow-up
- Leads with "Proposal Sent" and no activity for 48+ hours — need nudge
- Nurture leads hitting their 30-day mark — need check-in

## Pipeline Summary
- Total active leads (excluding closed): X
- Estimated pipeline value: sum of recommended tier pricing for leads in proposal/negotiating stages
- Active clients: X
- Total monthly retainer revenue: $X

## Upcoming This Week
- Any zoom calls scheduled this week
- Any follow-ups due this week
- Any client reports due

Format as a clean, scannable summary. Output directly — don't save a file for this one.
