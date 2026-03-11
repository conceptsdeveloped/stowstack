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

const SYSTEM_PROMPT = `You are a senior self-storage facility auditor for StowStack. Analyze the diagnostic form and produce an audit as JSON.

SCORING: 90-100 best-in-class, 80-89 strong, 70-79 gaps exist, 60-69 below average, 50-59 serious issues, <50 critical.

BENCHMARKS: Occupancy 88-92%, move-in ratio >1.0, weekly inquiries 15-25+, reservation conversion 70-80%, online rental 30-50%, Google 100+ reviews 4.5+ stars, autopay 50%+, Meta ads CPM $20-60.

OUTPUT RULES — READ CAREFULLY:
- Return ONLY valid JSON. No markdown fences. No text before or after the JSON.
- Keep ALL text fields SHORT: 1 sentence max for findings/evidence/recommendations, 2 sentences max for analysis fields.
- Each category: max 2 red_flags, 1 yellow_flag, 1 green_flag, 2 benchmarks.
- priority_action_plan: max 5 items.
- key_revenue_levers: max 3 items.
- other_services: max 3 items.
- competitors_named: max 3 items.
- You MUST output the complete JSON object with closing braces. Budget your length. Do NOT get cut off.

JSON STRUCTURE:
{
  "facility_summary": {
    "name": "", "address": "", "contact_name": "", "email": "", "phone": "",
    "website": "", "role": "", "tenure": "", "stage": "", "facility_count": "",
    "pms": "", "unit_count_range": "", "occupancy_range": ""
  },
  "overall_score": {
    "score": 0, "grade": "A|B|C|D|F",
    "summary": "",
    "top_3_issues": ["","",""],
    "top_3_strengths": ["","",""]
  },
  "categories": {
    "occupancy_momentum": {
      "score": 0, "severity": "critical|warning|healthy", "headline": "", "analysis": "",
      "red_flags": [{"finding":"","evidence":"","impact":"","recommendation":""}],
      "yellow_flags": [{"finding":"","evidence":"","impact":"","recommendation":""}],
      "green_flags": [{"finding":"","evidence":""}],
      "benchmarks": [{"metric":"","facility_value":"","industry_target":"","gap":""}]
    },
    "unit_mix_vacancy": { SAME STRUCTURE },
    "lead_flow_conversion": { SAME STRUCTURE },
    "sales_followup": { SAME STRUCTURE },
    "marketing_adspend": { SAME STRUCTURE },
    "digital_presence": { SAME STRUCTURE },
    "revenue_management": { SAME STRUCTURE },
    "operations_staffing": { SAME STRUCTURE },
    "competitive_position": { SAME STRUCTURE }
  },
  "conversion_funnel": {
    "stages": [
      {"name":"Market Awareness","status":"strong|weak|critical","evidence":"","leak_percentage_estimate":0},
      {"name":"Website / Online Discovery","status":"","evidence":"","leak_percentage_estimate":0},
      {"name":"Inquiry / Contact","status":"","evidence":"","leak_percentage_estimate":0},
      {"name":"Reservation","status":"","evidence":"","leak_percentage_estimate":0},
      {"name":"Move-In","status":"","evidence":"","leak_percentage_estimate":0}
    ],
    "biggest_leak": "", "funnel_narrative": ""
  },
  "priority_action_plan": [
    {"rank":1,"action":"","category":"","impact":"high|medium|low","effort":"high|medium|low","timeline":"immediate|30_days|90_days","estimated_monthly_revenue_impact":"","details":""}
  ],
  "revenue_impact": {
    "current_estimated_monthly_revenue":"","potential_monthly_revenue_with_fixes":"",
    "estimated_monthly_gap":"","assumptions":"","key_revenue_levers":[""]
  },
  "stowstack_opportunities": {
    "meta_ads_fit":"strong|moderate|weak","meta_ads_rationale":"",
    "recommended_monthly_budget":"","expected_cost_per_lead":"",
    "expected_cost_per_movein":"","projected_additional_moveins_per_month":"",
    "other_services":[""]
  },
  "competitor_analysis": {
    "competitors_named":[""],"perceived_competitor_advantages":"",
    "facility_advantages":"","competitive_positioning_summary":"","competitive_score":0
  },
  "operator_alignment": {
    "operator_diagnosis_accuracy":"accurate|partially_accurate|misdiagnosed",
    "operator_said":"","audit_found":"","alignment_note":""
  }
}`

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

  const userMessage = `Analyze this facility diagnostic and produce the audit JSON. Keep all text fields concise (1-2 sentences max). You MUST complete the entire JSON — do not run out of space.

FACILITY: ${facilityName || 'Unknown'}

FORM RESPONSES:
${formData}`

  try {
    // Stream to stay within Vercel's timeout limits
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      res.write(text)
    })

    await stream.finalMessage()

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
