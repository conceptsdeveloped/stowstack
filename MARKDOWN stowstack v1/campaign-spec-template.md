# Campaign Specification — {Facility Name}

**Client:** {Facility Name}, {City, ST}
**Tier:** {Starter/Growth/Multi-Site}
**Monthly Ad Budget:** ${X}
**Monthly Retainer:** ${X}
**Launch Target:** {Date — 48-72 hours from onboarding}
**Prepared by:** Blake Burkett, StowStack

---

## Campaign Architecture

| Campaign | Ad Set | Objective | Budget % | Status |
|----------|--------|-----------|----------|--------|
| SS_{Code}_{UnitType}_Prospecting | {Audience} | Lead Gen | {X}% | Planned |
| SS_{Code}_{UnitType}_Retargeting | Website Visitors | Lead Gen | {X}% | Planned |

## Audience Targeting

### Prospecting — {Unit Type}
- **Location:** {X} mile radius from {facility address}
- **Age:** {range}
- **Interests/Behaviors:** {demand triggers}
- **Exclusions:** {existing customers, outside radius}

### Retargeting
- **Audience:** Website visitors (last 30 days), lead form openers (didn't submit)
- **Exclusions:** Converted leads

## Ad Creative

### Ad Set 1: {Unit Type} — {Angle}
- **Headline:** {max 40 chars}
- **Primary Text:** {max 125 chars}
- **Description:** {supporting text}
- **CTA:** {button}
- **Format:** {single image / carousel / video}
- **Creative Direction:** {what to shoot/source}

### Ad Set 2: {Unit Type} — {Angle}
- **Headline:** {max 40 chars}
- **Primary Text:** {max 125 chars}
- **Description:** {supporting text}
- **CTA:** {button}
- **Format:** {single image / carousel / video}
- **Creative Direction:** {what to shoot/source}

## Lead Form Spec
- **Form Name:** "{Facility} — Reserve Your Unit"
- **Headline:** {headline}
- **Description:** {1-2 sentences}
- **Questions:** Full name, Email, Phone, Unit size needed (dropdown), Move-in timeline (dropdown)
- **Thank You Screen:** {copy + phone number + directions}

## Tracking Checklist
- [ ] Meta Pixel installed on facility website
- [ ] PageView, Lead, ViewContent events configured
- [ ] Conversions API setup
- [ ] UTM parameters defined
- [ ] Lead form webhook connected
- [ ] Call tracking number provisioned
- [ ] Reporting dashboard configured

## Launch Sequence
1. Day 1: Pixel verification + audience creation
2. Day 1-2: Creative finalization + ad account setup
3. Day 2-3: Campaign build + lead form testing
4. Day 3: Launch + verify lead delivery
5. Day 4-7: Monitor, first optimizations
