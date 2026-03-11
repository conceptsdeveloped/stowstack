# StowStack — Cowork Setup

## Quick Start

### 1. Move this folder
Move the entire `StowStack/` folder to your home directory:
```
~/StowStack/
```

### 2. Set Global Instructions
Open Claude Desktop → Settings → Cowork → Edit Global Instructions → paste this:

```
I am Blake Burkett, founder of StowStack — a self-storage growth agency. I'm an operator first (7 years in storage/U-Haul in Michigan), marketer second.

When I give you tasks:
- Read the CLAUDE.md and relevant context files in my project folder first
- Use my operator-native voice: direct, specific, no marketing fluff
- Every recommendation should connect to occupancy, move-ins, or revenue
- Be honest — if something won't work, tell me
- Save deliverables to the output/ folder with clear naming
- When in doubt, ask me 1-2 questions rather than guessing

I typically work on: facility audits, campaign specs, lead follow-ups, landing pages, and pipeline management.
```

### 3. Open Cowork
Open Claude Desktop → click "Cowork" tab → select ~/StowStack/ as your working folder.

### 4. Test It
Type: `/stowstack:run-audit "Midway Self Storage, Cassopolis, MI"`

You should see Claude:
1. Read your CLAUDE.md and context files
2. Web search the facility
3. Research competitors
4. Generate a full audit report
5. Save it to output/audits/

---

## Available Commands

| Command | What It Does |
|---------|-------------|
| `/stowstack:run-audit "Facility, City ST"` | Full facility research + audit report |
| `/stowstack:score-lead "Facility"` | Score a lead for fit and priority |
| `/stowstack:zoom-prep "Facility"` | Agenda, talking points, follow-up drafts |
| `/stowstack:build-campaign "Facility"` | Full Meta campaign spec |
| `/stowstack:generate-landing-page "Facility"` | Facility-specific HTML landing page |
| `/stowstack:draft-followup "Facility" --type interested` | Post-zoom follow-up email |
| `/stowstack:draft-followup "Facility" --type nurture` | Not-ready-yet follow-up |
| `/stowstack:draft-followup "Facility" --type check-in` | 30-day re-engagement |
| `/stowstack:daily-digest` | Pipeline status + what needs attention today |

## Daily Workflow

**Morning:** `/stowstack:daily-digest` → see what's hot

**New lead:** Create file in /leads/ → `/stowstack:score-lead` → `/stowstack:run-audit`

**Before Zoom:** `/stowstack:zoom-prep "Facility"`

**After Zoom:** `/stowstack:draft-followup "Facility" --type interested`

**New client:** Move lead to /clients/ → `/stowstack:build-campaign "Facility"`

## Folder Structure

```
StowStack/
├── CLAUDE.md              ← Master context (read every session)
├── context/               ← Business rules & frameworks
├── commands/              ← Slash command definitions
├── skills/                ← Auto-triggered domain knowledge
├── templates/             ← Reusable document templates
├── leads/                 ← One .md file per active lead
├── clients/               ← One folder per active client
├── output/                ← All deliverables saved here
│   ├── audits/
│   ├── zoom-prep/
│   ├── campaigns/
│   ├── landing-pages/
│   └── reports/
└── archive/               ← Closed/completed leads
```
