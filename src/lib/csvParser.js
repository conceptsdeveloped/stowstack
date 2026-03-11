import Papa from 'papaparse'

// Maps Google Sheets column headers to internal keys
// Handles variations in casing/spacing from different form exports
const COLUMN_MAP = {
  'timestamp': 'timestamp',
  'email address': 'email',
  'facility name': 'facilityName',
  'facility address (city, state, zip)': 'facilityAddress',
  'best contact name': 'contactName',
  'best email address': 'contactEmail',
  'best phone number': 'contactPhone',
  'website url': 'websiteUrl',
  'what is your role?': 'role',
  'how long have you owned or managed this facility?': 'tenure',
  'is this a new build / lease-up or stabilized facility?': 'facilityStage',
  'do you manage one facility or multiple?': 'facilityCount',

  // Multi-facility (conditional)
  'how many total facilities do you manage?': 'totalFacilities',
  'how many facilities are in scope for this diagnostic?': 'facilitiesInScope',
  'are the facilities you want diagnosed in the same market area?': 'sameMarketArea',
  'do all facilities use the same pms / management software?': 'samePms',
  'any key differences between facilities we should know?': 'facilityDifferences',

  // Occupancy
  'about where is your facility sitting today (overall occupancy)?': 'occupancy',
  'how would you describe the facility\'s leasing momentum right now?': 'momentum',
  'compared to 6 months ago, occupancy is:': 'occupancyVs6Months',
  'compared to the same time last year, occupancy is:': 'occupancyVsLastYear',
  'roughly how many move-ins have you had in the last 30 days?': 'moveIns30Days',
  'roughly how many move-outs in the last 30 days?': 'moveOuts30Days',
  'what is your total unit count (approximately)?': 'totalUnits',

  // Unit mix
  'which unit types does your facility offer? (select all)': 'unitTypesOffered',
  'which unit type is renting best right now? (select up to 3)': 'bestRentingUnits',
  'which unit type is the hardest to rent right now? (select up to 3)': 'hardestRentingUnits',
  'are there specific unit types or areas of the property you especially need to fill?': 'specificFillNeeds',
  'do you have any units currently offline or unavailable for rent?': 'offlineUnits',
  'is your unit mix weighted heavily toward any one size?': 'unitMixBalance',

  // Lead flow
  'what feels like the bigger issue right now?': 'biggerIssue',
  'where do most of your leads currently come from? (select all that apply)': 'leadSources',
  'roughly how many rental inquiries (calls + online leads) do you get per week?': 'weeklyInquiries',
  'what do you think is happening most often with people who don\'t rent?': 'whyPeopleDontRent',
  'can a customer complete a reservation online (hold a unit)?': 'onlineReservation',
  'can a customer complete the full rental online without staff help (e-sign, pay, get access)?': 'fullOnlineRental',
  'what percentage of move-ins come from online reservations vs walk-in / call?': 'moveInChannel',

  // Sales
  'when a lead comes in, how confident are you that follow-up happens well?': 'followUpConfidence',
  'are inbound calls recorded or tracked?': 'callRecording',
  'do you use any call tracking software?': 'callTracking',
  'when someone calls and the office doesn\'t answer, what happens?': 'missedCalls',
  'do you follow up on abandoned online reservations (started but not completed)?': 'abandonedReservations',
  'if someone reserves but doesn\'t move in within a few days, what happens?': 'reserveNoShows',
  'how would you rate your team\'s ability to close a rental over the phone?': 'phoneClosingAbility',

  // Marketing
  'what marketing / advertising are you currently running? (select all)': 'currentMarketing',
  'what is your approximate total monthly marketing / ad spend?': 'monthlyAdSpend',
  'if you run google ads, how would you describe the performance?': 'googleAdsPerformance',
  'if you run facebook / instagram ads, how would you describe performance?': 'facebookAdsPerformance',
  'do you know your cost per lead or cost per move-in from paid ads?': 'costTracking',
  'who manages your marketing / ads?': 'marketingManager',
  'are you open to running paid meta (facebook / instagram) ads to drive leads?': 'openToMetaAds',
  'what would be your ideal monthly ad budget range if the roi was clear?': 'idealAdBudget',
  'have you worked with a storage-specific marketing agency before?': 'pastAgencyExperience',

  // Digital presence
  'who built your website?': 'websiteBuilder',
  'when was the last time your website was meaningfully updated?': 'lastWebsiteUpdate',
  'does your website show real-time unit availability and pricing?': 'liveAvailability',
  'approximately how many google reviews does your facility have?': 'googleReviewCount',
  'what is your approximate google review rating?': 'googleRating',
  'do you actively respond to google reviews?': 'reviewResponse',
  'do you actively request reviews from tenants?': 'reviewRequests',
  'is your google business profile (gbp) claimed and actively managed?': 'gbpStatus',
  'do you post updates, offers, or photos to your google business profile regularly?': 'gbpPosting',
  'which social media does your facility actively use? (select all)': 'socialMedia',

  // Revenue management
  'which pms / management software do you use?': 'pms',
  'do you use revenue management software (automated pricing)?': 'revenueManagement',
  'do you believe your pricing is generally:': 'pricingPerception',
  'are you currently running any move-in specials or promotions?': 'moveInSpecials',
  'do you run ecri (existing customer rate increases)?': 'ecri',
  'when did you last raise street rates on any unit types?': 'lastRateRaise',
  'how do you typically decide on pricing?': 'pricingMethod',
  'do you offer tenant protection / insurance?': 'tenantProtection',
  'approximately what percentage of tenants are on autopay?': 'autopayPercentage',

  // Operations
  'what is your staffing model?': 'staffingModel',
  'what are your office hours?': 'officeHours',
  'what are your gate / access hours?': 'gateHours',
  'how is your facility\'s physical condition?': 'physicalCondition',
  'approximately how old is the facility?': 'facilityAge',
  'which security features does your facility have? (select all)': 'securityFeatures',
  'which amenities does your facility offer? (select all)': 'amenities',
  'have you done any significant renovations or upgrades in the last 2 years?': 'recentRenovations',

  // Competition
  'who are the top 3 competitors you watch most closely? (names or addresses)': 'topCompetitors',
  'what do you think those competitors are doing better than you?': 'competitorAdvantages',
  'what does your facility do better than nearby competitors?': 'facilityAdvantages',
  'what objections do you hear most often from prospects? (select all)': 'commonObjections',
  'is there new supply (new facilities) being built in your market?': 'newSupply',
  'how saturated do you believe your market is?': 'marketSaturation',

  // Priorities
  'what do you believe is the #1 reason your vacant units are still vacant?': 'vacancyReason',
  'is there anything about your facility, market, or situation that\'s unusual or that we should know?': 'unusualContext',
  'if this diagnostic could fix only one thing, what should it fix first?': 'fixFirst',
  'how aggressive are you willing to be if the audit shows changes are needed?': 'aggressiveness',
  'how soon are you looking to take action?': 'actionTimeline',
  'would you be open to sending pms reports afterward so we can validate with actual data?': 'openToPmsReports',
  'how did you hear about stowstack?': 'referralSource',
  'anything else you want us to know before we review your facility?': 'additionalNotes',
}

// Fields that contain multi-select (comma-separated) values
const MULTI_SELECT_FIELDS = new Set([
  'unitTypesOffered', 'bestRentingUnits', 'hardestRentingUnits',
  'leadSources', 'currentMarketing', 'socialMedia',
  'securityFeatures', 'amenities', 'commonObjections',
])

function normalizeKey(header) {
  const cleaned = header.trim().toLowerCase().replace(/\s+/g, ' ')
  // Direct match
  if (COLUMN_MAP[cleaned]) return COLUMN_MAP[cleaned]
  // Fuzzy: try removing trailing question marks, colons
  const stripped = cleaned.replace(/[?:]+$/, '').trim()
  if (COLUMN_MAP[stripped]) return COLUMN_MAP[stripped]
  // Try partial match on first 40 chars
  for (const [key, value] of Object.entries(COLUMN_MAP)) {
    if (key.startsWith(stripped.slice(0, 40)) || stripped.startsWith(key.slice(0, 40))) {
      return value
    }
  }
  return null
}

function splitMultiSelect(value) {
  if (!value || typeof value !== 'string') return []
  return value
    .split(/,\s*/)
    .map(v => v.trim())
    .filter(Boolean)
}

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          const critical = results.errors.filter(e => e.type === 'FieldMismatch' || e.type === 'Delimiter')
          if (critical.length > 0) {
            reject(new Error(`CSV parsing failed: ${critical[0].message}`))
            return
          }
        }

        if (!results.data || results.data.length === 0) {
          reject(new Error('CSV file is empty or has no data rows'))
          return
        }

        // Take first row (one facility per submission)
        const row = results.data[0]
        const headers = Object.keys(row)
        const parsed = {}
        const unmapped = []

        for (const header of headers) {
          const key = normalizeKey(header)
          if (key) {
            let value = row[header]?.trim() || ''
            if (MULTI_SELECT_FIELDS.has(key)) {
              value = splitMultiSelect(value)
            }
            parsed[key] = value
          } else if (header.trim()) {
            unmapped.push(header)
          }
        }

        const mappedCount = Object.keys(parsed).length
        if (mappedCount < 10) {
          reject(new Error(`Only ${mappedCount} columns matched. This may not be a StowStack diagnostic CSV.`))
          return
        }

        resolve({
          data: parsed,
          meta: {
            totalColumns: headers.length,
            mappedColumns: mappedCount,
            unmappedColumns: unmapped,
            facilityName: parsed.facilityName || 'Unknown Facility',
          }
        })
      },
      error(err) {
        reject(new Error(`CSV parsing error: ${err.message}`))
      }
    })
  })
}

// Format parsed data into a readable text block for Claude
export function formatForClaude(data) {
  const sections = [
    {
      title: 'FACILITY BASICS',
      fields: [
        ['Facility Name', data.facilityName],
        ['Address', data.facilityAddress],
        ['Contact', data.contactName],
        ['Email', data.contactEmail],
        ['Phone', data.contactPhone],
        ['Website', data.websiteUrl],
        ['Role', data.role],
        ['Tenure', data.tenure],
        ['Stage', data.facilityStage],
        ['Facility Count', data.facilityCount],
      ]
    },
    {
      title: 'MULTI-FACILITY (if applicable)',
      fields: [
        ['Total Facilities', data.totalFacilities],
        ['Facilities In Scope', data.facilitiesInScope],
        ['Same Market Area', data.sameMarketArea],
        ['Same PMS', data.samePms],
        ['Key Differences', data.facilityDifferences],
      ]
    },
    {
      title: 'OCCUPANCY SNAPSHOT',
      fields: [
        ['Current Occupancy', data.occupancy],
        ['Leasing Momentum', data.momentum],
        ['vs 6 Months Ago', data.occupancyVs6Months],
        ['vs Last Year', data.occupancyVsLastYear],
        ['Move-ins (30 days)', data.moveIns30Days],
        ['Move-outs (30 days)', data.moveOuts30Days],
        ['Total Unit Count', data.totalUnits],
      ]
    },
    {
      title: 'UNIT MIX & VACANCY',
      fields: [
        ['Unit Types Offered', Array.isArray(data.unitTypesOffered) ? data.unitTypesOffered.join(', ') : data.unitTypesOffered],
        ['Best Renting', Array.isArray(data.bestRentingUnits) ? data.bestRentingUnits.join(', ') : data.bestRentingUnits],
        ['Hardest to Rent', Array.isArray(data.hardestRentingUnits) ? data.hardestRentingUnits.join(', ') : data.hardestRentingUnits],
        ['Specific Fill Needs', data.specificFillNeeds],
        ['Offline Units', data.offlineUnits],
        ['Unit Mix Balance', data.unitMixBalance],
      ]
    },
    {
      title: 'LEAD FLOW & CONVERSION',
      fields: [
        ['Bigger Issue', data.biggerIssue],
        ['Lead Sources', Array.isArray(data.leadSources) ? data.leadSources.join(', ') : data.leadSources],
        ['Weekly Inquiries', data.weeklyInquiries],
        ['Why People Don\'t Rent', data.whyPeopleDontRent],
        ['Online Reservation', data.onlineReservation],
        ['Full Online Rental', data.fullOnlineRental],
        ['Move-in Channel', data.moveInChannel],
      ]
    },
    {
      title: 'SALES & FOLLOW-UP',
      fields: [
        ['Follow-up Confidence', data.followUpConfidence],
        ['Call Recording', data.callRecording],
        ['Call Tracking', data.callTracking],
        ['Missed Calls', data.missedCalls],
        ['Abandoned Reservations', data.abandonedReservations],
        ['Reserve No-Shows', data.reserveNoShows],
        ['Phone Closing Ability', data.phoneClosingAbility],
      ]
    },
    {
      title: 'MARKETING & AD SPEND',
      fields: [
        ['Current Marketing', Array.isArray(data.currentMarketing) ? data.currentMarketing.join(', ') : data.currentMarketing],
        ['Monthly Ad Spend', data.monthlyAdSpend],
        ['Google Ads Performance', data.googleAdsPerformance],
        ['Facebook/IG Performance', data.facebookAdsPerformance],
        ['Cost Tracking', data.costTracking],
        ['Marketing Manager', data.marketingManager],
        ['Open to Meta Ads', data.openToMetaAds],
        ['Ideal Ad Budget', data.idealAdBudget],
        ['Past Agency Experience', data.pastAgencyExperience],
      ]
    },
    {
      title: 'DIGITAL PRESENCE & REPUTATION',
      fields: [
        ['Website Builder', data.websiteBuilder],
        ['Last Website Update', data.lastWebsiteUpdate],
        ['Live Availability', data.liveAvailability],
        ['Google Reviews', data.googleReviewCount],
        ['Google Rating', data.googleRating],
        ['Review Response', data.reviewResponse],
        ['Review Requests', data.reviewRequests],
        ['GBP Status', data.gbpStatus],
        ['GBP Posting', data.gbpPosting],
        ['Social Media', Array.isArray(data.socialMedia) ? data.socialMedia.join(', ') : data.socialMedia],
      ]
    },
    {
      title: 'REVENUE MANAGEMENT & PRICING',
      fields: [
        ['PMS', data.pms],
        ['Revenue Management', data.revenueManagement],
        ['Pricing Perception', data.pricingPerception],
        ['Move-in Specials', data.moveInSpecials],
        ['ECRI', data.ecri],
        ['Last Rate Raise', data.lastRateRaise],
        ['Pricing Method', data.pricingMethod],
        ['Tenant Protection', data.tenantProtection],
        ['Autopay %', data.autopayPercentage],
      ]
    },
    {
      title: 'OPERATIONS & STAFFING',
      fields: [
        ['Staffing Model', data.staffingModel],
        ['Office Hours', data.officeHours],
        ['Gate Hours', data.gateHours],
        ['Physical Condition', data.physicalCondition],
        ['Facility Age', data.facilityAge],
        ['Security Features', Array.isArray(data.securityFeatures) ? data.securityFeatures.join(', ') : data.securityFeatures],
        ['Amenities', Array.isArray(data.amenities) ? data.amenities.join(', ') : data.amenities],
        ['Recent Renovations', data.recentRenovations],
      ]
    },
    {
      title: 'COMPETITION & MARKET',
      fields: [
        ['Top Competitors', data.topCompetitors],
        ['Competitor Advantages', data.competitorAdvantages],
        ['Facility Advantages', data.facilityAdvantages],
        ['Common Objections', Array.isArray(data.commonObjections) ? data.commonObjections.join(', ') : data.commonObjections],
        ['New Supply', data.newSupply],
        ['Market Saturation', data.marketSaturation],
      ]
    },
    {
      title: 'DIAGNOSTIC PRIORITIES',
      fields: [
        ['#1 Vacancy Reason', data.vacancyReason],
        ['Unusual Context', data.unusualContext],
        ['Fix First', data.fixFirst],
        ['Aggressiveness', data.aggressiveness],
        ['Action Timeline', data.actionTimeline],
        ['Open to PMS Reports', data.openToPmsReports],
        ['Referral Source', data.referralSource],
        ['Additional Notes', data.additionalNotes],
      ]
    },
  ]

  return sections
    .map(s => {
      const fields = s.fields
        .filter(([, val]) => val && val !== '')
        .map(([label, val]) => `  ${label}: ${val}`)
        .join('\n')
      return fields ? `[${s.title}]\n${fields}` : null
    })
    .filter(Boolean)
    .join('\n\n')
}
