---
name: zoom-prep
description: Generate everything needed for an audit review Zoom call. Usage: /stowstack:zoom-prep "Facility Name"
arguments:
  - name: facility
    description: Facility name to prep for
    required: true
---

# Zoom Call Prep Kit

Read the audit report in output/audits/ for this facility. Also check /leads/ for lead data.

Generate three files:

## 1. Call Agenda (output/zoom-prep/{facility-slug}-agenda-{date}.md)

30-minute structured agenda:
- [0-2min] Quick intro — who I am, what StowStack does, how the call works
- [2-8min] Facility snapshot — confirm findings, let operator correct anything
- [8-15min] Market position + digital presence findings
- [15-22min] Diagnostic assessment — where they're actually leaking revenue
- [22-27min] Recommended action plan — what I'd do and in what order
- [27-30min] Fit discussion — does this make sense for their facility

Fill in the specifics from this facility's audit. Not a generic template — personalize every section.

## 2. Talking Points — Blake's Private Notes (output/zoom-prep/{facility-slug}-notes-{date}.md)

- 3 strongest findings to lead with (the "oh shit" moments that get attention)
- Specific dollar amounts to reference (from revenue leakage estimate)
- Competitor-specific points to mention ("Your competitor XYZ has 200 more reviews and is running Meta ads — you're invisible next to them")
- Questions to ask the operator to uncover more pain:
  - "What's your current follow-up process when a lead calls and nobody answers?"
  - "Which unit types have been sitting empty longest?"
  - "Have you tried any promotions in the last 6 months? What happened?"
  - "What's your average time from inquiry to move-in?"
- Objection-handling notes based on their profile:
  - If occupancy 85%+: "You're not in crisis, but the units that ARE empty are costing you $X/mo in recurring revenue. Targeted campaigns on those specific unit types pay for themselves."
  - If burned by agencies: "I get it. Here's specifically how I'm different — I've operated storage facilities for 7 years. I'm not learning your business on your dime."
  - If price-sensitive: "Your vacancy is costing you ${leakage}/mo. This service costs ${tier price}/mo. If it recovers even a handful of units, the math works."
  - If skeptical of Meta: "Google catches people already searching. Meta catches them during the life event that creates the need — before they search. That's why CPLs are lower and intent is still high."
- Natural bridge to the pitch: specific tier recommendation and why it fits their situation

## 3. Follow-Up Email Drafts (output/zoom-prep/{facility-slug}-followups-{date}.md)

### Version A: Interested — Next Steps
Subject: "{Facility Name} — Next Steps with StowStack"
- Reference 1-2 specific findings from the call
- Confirm the tier discussed and what's included
- Attach the audit report
- Clear next step: "If you want to move forward, here's what I need from you: [onboarding items]. I can have campaigns live within 72 hours."
- Close: "Talk soon, Blake"

### Version B: Not Ready — Stay in Touch
Subject: "Your {Facility Name} audit — yours to keep"
- Zero pressure
- Attach the audit report
- One specific thing they should do even without StowStack (operational advice)
- Leave door open: "When vacancy becomes a priority, I'm here. Nothing expires."
- Close: "— Blake"

Both in Blake's voice: short, personal, operator-native. No sales language.
