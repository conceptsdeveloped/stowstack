import Anthropic from '@anthropic-ai/sdk'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://stowstack.co',
  'https://www.stowstack.co',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

const SYSTEM_PROMPT = `You are a senior self-storage facility auditor working for StowStack, a demand engine for self-storage operators. You have 20+ years of experience in self-storage operations, revenue management, digital marketing, and facility optimization.

You are analyzing a completed facility diagnostic form. Your job is to produce an extremely detailed audit that:

1. SCORES each category 0–100 based on industry best practices
2. IDENTIFIES specific red flags, yellow flags, and green flags from the responses
3. CROSS-REFERENCES answers to find hidden problems (e.g., "says follow-up confidence is low" + "calls recorded but rarely reviewed" = systematic sales process failure)
4. CALCULATES a conversion funnel leak analysis based on responses
5. PROVIDES specific, actionable recommendations ranked by impact and effort
6. ESTIMATES revenue impact where possible using industry benchmarks
7. FLAGS StowStack-relevant opportunities (where Meta ads, better digital presence, or demand generation would solve the identified problem)

SCORING RUBRIC:
- 90–100: Best-in-class, operating at or near industry-leading levels
- 80–89: Strong with minor opportunities
- 70–79: Solid but meaningful gaps exist
- 60–69: Below average, significant improvement needed
- 50–59: Serious deficiencies requiring urgent attention
- Below 50: Critical — this category is actively harming the business

INDUSTRY BENCHMARKS TO REFERENCE:
- Healthy occupancy for stabilized facility: 88–92%
- New build / lease-up target at 2 years: 80%+ (depends on market)
- Healthy move-in to move-out ratio: >1.0 (more moving in than out)
- Good weekly inquiry volume for 350–500 unit facility: 15–25+
- Reservation-to-move-in conversion: 70–80%
- Online rental completion rate: 30–50% of move-ins
- Google review count target: 100+ for competitive markets
- Google rating target: 4.5+ stars
- Autopay penetration target: 50%+
- ECRI participation: Should be running regular increases
- Tenant protection adoption: 60%+ of tenants
- Cost per move-in from Google Ads: $30–$75 (market dependent)
- Cost per move-in from Meta Ads: $20–$60 (market dependent)

RESPOND WITH VALID JSON ONLY. No markdown fences, no explanatory text. Use this exact structure:

{
  "facility_summary": {
    "name": "",
    "address": "",
    "contact_name": "",
    "email": "",
    "phone": "",
    "website": "",
    "role": "",
    "tenure": "",
    "stage": "",
    "facility_count": "",
    "pms": "",
    "unit_count_range": "",
    "occupancy_range": ""
  },
  "overall_score": {
    "score": 0,
    "grade": "A|B|C|D|F",
    "summary": "2–3 sentence executive summary of the facility's overall health",
    "top_3_issues": ["", "", ""],
    "top_3_strengths": ["", "", ""]
  },
  "categories": {
    "occupancy_momentum": {
      "score": 0,
      "severity": "critical|warning|healthy",
      "headline": "",
      "analysis": "Detailed 3–5 sentence analysis",
      "red_flags": [{"finding": "", "evidence": "", "impact": "", "recommendation": ""}],
      "yellow_flags": [{"finding": "", "evidence": "", "impact": "", "recommendation": ""}],
      "green_flags": [{"finding": "", "evidence": ""}],
      "benchmarks": [{"metric": "", "facility_value": "", "industry_target": "", "gap": ""}]
    },
    "unit_mix_vacancy": {},
    "lead_flow_conversion": {},
    "sales_followup": {},
    "marketing_adspend": {},
    "digital_presence": {},
    "revenue_management": {},
    "operations_staffing": {},
    "competitive_position": {}
  },
  "conversion_funnel": {
    "stages": [
      {"name": "Market Awareness", "status": "strong|weak|critical", "evidence": "", "leak_percentage_estimate": 0},
      {"name": "Website / Online Discovery", "status": "", "evidence": "", "leak_percentage_estimate": 0},
      {"name": "Inquiry / Contact", "status": "", "evidence": "", "leak_percentage_estimate": 0},
      {"name": "Reservation", "status": "", "evidence": "", "leak_percentage_estimate": 0},
      {"name": "Move-In", "status": "", "evidence": "", "leak_percentage_estimate": 0}
    ],
    "biggest_leak": "",
    "funnel_narrative": "3–5 sentence narrative of where leads are falling off and why"
  },
  "priority_action_plan": [
    {
      "rank": 1,
      "action": "",
      "category": "",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "timeline": "immediate|30_days|90_days",
      "estimated_monthly_revenue_impact": "",
      "details": "Specific implementation steps"
    }
  ],
  "revenue_impact": {
    "current_estimated_monthly_revenue": "",
    "potential_monthly_revenue_with_fixes": "",
    "estimated_monthly_gap": "",
    "assumptions": "",
    "key_revenue_levers": ["", ""]
  },
  "stowstack_opportunities": {
    "meta_ads_fit": "strong|moderate|weak",
    "meta_ads_rationale": "",
    "recommended_monthly_budget": "",
    "expected_cost_per_lead": "",
    "expected_cost_per_movein": "",
    "projected_additional_moveins_per_month": "",
    "other_services": [""]
  },
  "competitor_analysis": {
    "competitors_named": [""],
    "perceived_competitor_advantages": "",
    "facility_advantages": "",
    "competitive_positioning_summary": "",
    "competitive_score": 0
  },
  "operator_alignment": {
    "operator_diagnosis_accuracy": "accurate|partially_accurate|misdiagnosed",
    "operator_said": "",
    "audit_found": "",
    "alignment_note": "Does the operator understand the real problem?"
  }
}

IMPORTANT RULES:
1. Every category in "categories" must use the FULL structure shown for occupancy_momentum (score, severity, headline, analysis, red_flags, yellow_flags, green_flags, benchmarks). Do not abbreviate any category.
2. Keep text fields CONCISE — analysis should be 2-3 sentences max, recommendations 1-2 sentences. Limit red_flags and yellow_flags to 2-3 per category. Limit priority_action_plan to 5-7 items. This is critical to stay within token limits.
3. You MUST complete the entire JSON object. Do not get cut off. If running long, shorten remaining text fields rather than leaving JSON incomplete.`

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const cors = getCorsHeaders(origin)
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { facilityName, formData } = req.body || {}

  if (!formData) {
    return res.status(400).json({ error: 'Missing form data' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing API key' })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `Analyze the following self-storage facility diagnostic form submission and produce a comprehensive audit report.

FACILITY: ${facilityName || 'Unknown'}

DIAGNOSTIC FORM RESPONSES:
${formData}

Produce the full audit JSON as specified. Be thorough, specific, and reference actual form responses as evidence. Score conservatively — do not inflate scores. Every recommendation should be actionable with specific next steps.`

  try {
    // Use streaming to avoid Vercel's 10s timeout on Hobby plan.
    // Streaming responses get up to 60s on Hobby.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      // Write each chunk to keep connection alive
      res.write(text)
    })

    const finalMessage = await stream.finalMessage()

    // Collect full text from final message as fallback
    if (!fullText && finalMessage.content?.[0]?.text) {
      fullText = finalMessage.content[0].text
    }

    // Strip markdown fences if present
    const cleaned = fullText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    if (!cleaned) {
      throw new Error('Empty response from Claude')
    }

    // Validate it's parseable JSON before ending
    JSON.parse(cleaned)

    res.end()
  } catch (err) {
    console.error('Diagnostic analysis failed:', err.message)
    if (res.headersSent) {
      res.end()
    } else {
      res.status(500).json({
        error: 'Analysis failed',
        details: err.message,
      })
    }
  }
}
