---
name: draft-followup
description: "Draft a follow-up email for a lead. Usage: /stowstack:draft-followup \"Facility Name\" --type interested|nurture|check-in"
arguments:
  - name: facility
    description: Facility name
    required: true
  - name: type
    description: "Type of follow-up: interested (post-zoom, wants to move forward), nurture (not ready yet), check-in (30-day re-engagement)"
    required: true
---

# Draft Follow-Up Email

Read the lead file in /leads/ and any audit in output/audits/ for this facility.
Read context/voice-and-style.md for tone.

Generate a follow-up email in Blake's voice.

## If type = interested
- Subject: "{Facility} — Next Steps with StowStack"
- Reference 1-2 specific findings from their audit that resonated on the call
- Confirm the recommended tier and monthly investment
- Explain what happens next: "Here's what I need from you to get started: access to your Meta Business Manager, your unit mix spreadsheet, and 20 minutes for an onboarding call. From there, campaigns go live in 48-72 hours."
- Mention the audit is attached for their reference
- Max 4 short paragraphs
- Close: "Talk soon, Blake"

## If type = nurture
- Subject: "Your {Facility} audit — yours to keep"
- Acknowledge timing isn't right, zero pressure
- One specific insight from the audit they should act on even without StowStack (operational advice — something free they can do today)
- Leave door open: "When vacancy becomes a priority, I'm here. This audit doesn't expire."
- Max 3 short paragraphs
- Close: "— Blake"

## If type = check-in
- Subject: "Quick check-in on {Facility}"
- Light touch: "It's been about a month since we talked about {Facility}. Wanted to check in."
- Ask one specific question: "Has anything changed with your {their biggest issue from the form}?"
- If there's a seasonal angle (summer move-in rush, back-to-school, etc.), mention it briefly
- Simple CTA: "Worth a 15-minute call to revisit?"
- Max 2-3 short paragraphs
- Close: "— Blake"

Save to output/followups/{facility-slug}-{type}-{date}.md
