---
name: lead-management
description: Manages StowStack's lead pipeline, scoring, follow-ups, and status tracking. Use when working with lead files, updating pipeline status, or generating pipeline reports.
---

When managing StowStack leads:

1. Lead files live in /leads/ as markdown files named {facility-slug}.md
2. Each lead file should contain: contact info, facility details, form data, lead score, status, notes timeline, next action, next follow-up date
3. Status flow: new → researched → audit-sent → zoom-scheduled → zoom-complete → proposal-sent → negotiating → active-client
4. Alternative end states: nurture (not ready), closed-bad-fit, closed-lost
5. Always add a timestamped note when updating a lead file (format: - YYYY-MM-DD: description)
6. Follow-up timing defaults:
   - 24 hours after audit sent (if no response)
   - 48 hours after Zoom call (if outcome was "interested")
   - 30 days for nurture leads
7. When creating a new lead file, auto-calculate estimated monthly revenue loss based on occupancy range and unit count
8. Never delete lead files — move closed leads to /archive/
9. Pipeline value = sum of estimated monthly retainers for leads in proposal-sent or negotiating status
10. When scoring leads, use the framework from the score-lead command
11. HOT leads (score 20+) should have an audit generated same day
12. All lead files must maintain a Timeline section at the bottom tracking every action
