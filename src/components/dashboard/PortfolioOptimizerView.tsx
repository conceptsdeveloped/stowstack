import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, TrendingUp, TrendingDown, Minus,
  Zap, Target, BarChart3, MapPin, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { Lead } from './types'

/* ── Types ── */

interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  costPerMoveIn: number
  roas: number
  occupancyDelta: number
}

interface FacilityScore {
  lead: Lead
  campaigns: CampaignEntry[]
  totals: { spend: number; leads: number; moveIns: number }
  avgCpl: number
  latestRoas: number
  // Optimizer scores (0-100)
  vacancyScore: number
  marginScore: number
  demandScore: number
  momentumScore: number
  compositeScore: number
  recommendation: 'increase' | 'maintain' | 'decrease' | 'pause'
  recommendedBudgetShift: number // percentage change
  reasoning: string[]
}

/* ── Scoring Logic ── */

const OCCUPANCY_MIDPOINTS: Record<string, number> = {
  'below-60': 50,
  '60-75': 67,
  '75-85': 80,
  '85-95': 90,
  'above-95': 97,
}

function scoreVacancy(occupancyRange: string, occupancyDelta: number): number {
  const occ = OCCUPANCY_MIDPOINTS[occupancyRange] ?? 75
  const adjusted = Math.min(100, Math.max(0, occ + occupancyDelta))
  // Higher vacancy = more room to fill = higher score for ad spend
  // Sweet spot: 50-80% occupancy (lots of room, facility is viable)
  if (adjusted < 50) return 60 // very low — risky but high upside
  if (adjusted < 70) return 100 // ideal: lots of room to fill
  if (adjusted < 80) return 85
  if (adjusted < 90) return 55
  return 20 // near full — diminishing returns
}

function scoreMargin(cpl: number, _costPerMoveIn: number, roas: number): number {
  let score = 50
  // CPL efficiency (lower is better, typical range $15-$80)
  if (cpl > 0 && cpl < 25) score += 25
  else if (cpl < 40) score += 15
  else if (cpl < 60) score += 5
  else score -= 10
  // ROAS (higher is better, >3x is great)
  if (roas >= 5) score += 25
  else if (roas >= 3) score += 15
  else if (roas >= 1.5) score += 5
  else score -= 10
  return Math.min(100, Math.max(0, score))
}

function scoreDemand(campaigns: CampaignEntry[]): number {
  if (campaigns.length < 2) return 50
  const recent = campaigns.slice(-3)
  const earlier = campaigns.slice(-6, -3)
  if (earlier.length === 0) return 50
  const recentLeadsAvg = recent.reduce((s, c) => s + c.leads, 0) / recent.length
  const earlierLeadsAvg = earlier.reduce((s, c) => s + c.leads, 0) / earlier.length
  if (earlierLeadsAvg === 0) return 50
  const growth = (recentLeadsAvg - earlierLeadsAvg) / earlierLeadsAvg
  // Growing demand = invest more
  if (growth > 0.3) return 95
  if (growth > 0.1) return 80
  if (growth > -0.1) return 50
  if (growth > -0.3) return 30
  return 15
}

function scoreMomentum(campaigns: CampaignEntry[]): number {
  if (campaigns.length < 2) return 50
  const last = campaigns[campaigns.length - 1]
  const prev = campaigns[campaigns.length - 2]
  let score = 50
  // Improving ROAS
  if (last.roas > prev.roas * 1.1) score += 20
  else if (last.roas < prev.roas * 0.9) score -= 15
  // Improving CPL
  if (last.cpl > 0 && prev.cpl > 0) {
    if (last.cpl < prev.cpl * 0.9) score += 15
    else if (last.cpl > prev.cpl * 1.1) score -= 10
  }
  // Move-in acceleration
  if (last.moveIns > prev.moveIns) score += 15
  else if (last.moveIns < prev.moveIns) score -= 10
  return Math.min(100, Math.max(0, score))
}

function generateRecommendation(f: Omit<FacilityScore, 'recommendation' | 'recommendedBudgetShift' | 'reasoning'>): Pick<FacilityScore, 'recommendation' | 'recommendedBudgetShift' | 'reasoning'> {
  const { compositeScore, vacancyScore, marginScore, demandScore, momentumScore, avgCpl, latestRoas } = f
  const reasons: string[] = []

  if (compositeScore >= 75) {
    if (vacancyScore >= 80) reasons.push('High vacancy creates significant fill opportunity')
    if (marginScore >= 70) reasons.push('Strong unit economics with efficient CPL and ROAS')
    if (demandScore >= 70) reasons.push('Growing local demand signals')
    if (momentumScore >= 70) reasons.push('Campaign performance trending upward')
    return { recommendation: 'increase', recommendedBudgetShift: Math.min(50, Math.round((compositeScore - 60) * 1.5)), reasoning: reasons }
  }

  if (compositeScore >= 50) {
    if (vacancyScore < 40) reasons.push('Limited vacancy — facility nearing capacity')
    if (marginScore >= 60) reasons.push('Healthy margins support current spend level')
    if (demandScore >= 40 && demandScore < 70) reasons.push('Stable local demand')
    return { recommendation: 'maintain', recommendedBudgetShift: 0, reasoning: reasons.length > 0 ? reasons : ['Performance metrics in acceptable range'] }
  }

  if (compositeScore >= 30) {
    if (marginScore < 40) reasons.push(`CPL of $${avgCpl.toFixed(0)} exceeds efficiency threshold`)
    if (latestRoas < 1.5) reasons.push(`ROAS of ${latestRoas.toFixed(1)}x below breakeven target`)
    if (demandScore < 40) reasons.push('Declining local demand — consider market pivot')
    if (momentumScore < 40) reasons.push('Campaign metrics trending downward')
    return { recommendation: 'decrease', recommendedBudgetShift: -Math.round((60 - compositeScore) * 1.2), reasoning: reasons }
  }

  reasons.push('Composite score critically low')
  if (marginScore < 30) reasons.push('Unit economics unsustainable at current spend')
  if (demandScore < 30) reasons.push('Market demand insufficient for paid acquisition')
  return { recommendation: 'pause', recommendedBudgetShift: -100, reasoning: reasons }
}

/* ── Component ── */

export default function PortfolioOptimizerView({ leads, adminKey, darkMode }: { leads: Lead[]; adminKey: string; darkMode?: boolean }) {
  const [facilityScores, setFacilityScores] = useState<FacilityScore[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'composite' | 'vacancy' | 'margin' | 'demand' | 'momentum'>('composite')

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  const fetchAndScore = useCallback(async () => {
    if (signedClients.length === 0) return
    setFetching(true)
    const scores: FacilityScore[] = []

    for (const lead of signedClients) {
      try {
        const res = await fetch(`/api/client-campaigns?code=${lead.accessCode}`, {
          headers: { 'X-Admin-Key': adminKey },
        })
        if (res.ok) {
          const data = await res.json()
          const campaigns: CampaignEntry[] = data.campaigns || []
          const totals = campaigns.reduce((acc, c) => ({
            spend: acc.spend + c.spend,
            leads: acc.leads + c.leads,
            moveIns: acc.moveIns + c.moveIns,
          }), { spend: 0, leads: 0, moveIns: 0 })
          const avgCpl = totals.leads > 0 ? totals.spend / totals.leads : 0
          const latestRoas = campaigns.length > 0 ? campaigns[campaigns.length - 1].roas : 0
          const totalOccDelta = campaigns.reduce((s, c) => s + c.occupancyDelta, 0)

          const vacancyScore = scoreVacancy(lead.occupancyRange, totalOccDelta)
          const marginScore = scoreMargin(avgCpl, totals.moveIns > 0 ? totals.spend / totals.moveIns : 0, latestRoas)
          const demandScore = scoreDemand(campaigns)
          const momentumScore = scoreMomentum(campaigns)
          const compositeScore = Math.round(vacancyScore * 0.30 + marginScore * 0.30 + demandScore * 0.25 + momentumScore * 0.15)

          const base = { lead, campaigns, totals, avgCpl, latestRoas, vacancyScore, marginScore, demandScore, momentumScore, compositeScore }
          const rec = generateRecommendation(base)
          scores.push({ ...base, ...rec })
        }
      } catch { /* skip */ }
    }

    setFacilityScores(scores)
    setFetching(false)
    setFetched(true)
  }, [signedClients.length, adminKey])

  useEffect(() => {
    if (!fetched && !fetching && signedClients.length > 0) {
      fetchAndScore()
    }
  }, [signedClients.length])

  const sorted = useMemo(() => {
    const key = sortBy === 'composite' ? 'compositeScore' : sortBy === 'vacancy' ? 'vacancyScore' : sortBy === 'margin' ? 'marginScore' : sortBy === 'demand' ? 'demandScore' : 'momentumScore'
    return [...facilityScores].sort((a, b) => b[key] - a[key])
  }, [facilityScores, sortBy])

  const totalCurrentSpend = facilityScores.reduce((s, f) => s + f.totals.spend, 0)
  const increaseCount = facilityScores.filter(f => f.recommendation === 'increase').length
  const decreaseCount = facilityScores.filter(f => f.recommendation === 'decrease' || f.recommendation === 'pause').length

  const recColors: Record<string, string> = {
    increase: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    maintain: 'text-blue-600 bg-blue-50 border-blue-200',
    decrease: 'text-amber-600 bg-amber-50 border-amber-200',
    pause: 'text-red-600 bg-red-50 border-red-200',
  }
  const recColorsDark: Record<string, string> = {
    increase: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
    maintain: 'text-blue-400 bg-blue-950/40 border-blue-800',
    decrease: 'text-amber-400 bg-amber-950/40 border-amber-800',
    pause: 'text-red-400 bg-red-950/40 border-red-800',
  }
  const recLabels: Record<string, string> = {
    increase: 'Increase Spend',
    maintain: 'Maintain',
    decrease: 'Reduce Spend',
    pause: 'Pause Ads',
  }
  const recIcons: Record<string, typeof TrendingUp> = {
    increase: TrendingUp,
    maintain: Minus,
    decrease: TrendingDown,
    pause: AlertTriangle,
  }

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-200' : 'text-slate-900'
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500'

  if (signedClients.length < 2) {
    return (
      <div className={`rounded-xl border p-8 text-center ${card}`}>
        <Target className={`mx-auto mb-3 ${textMuted}`} size={40} />
        <h3 className={`text-lg font-semibold mb-2 ${text}`}>Portfolio Optimizer</h3>
        <p className={textMuted}>
          The portfolio optimizer requires at least 2 signed clients with campaign data to generate spend recommendations.
          Currently tracking {signedClients.length} signed client{signedClients.length !== 1 ? 's' : ''}.
        </p>
      </div>
    )
  }

  if (fetching || !fetched) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-600 mr-3" size={24} />
        <span className={textMuted}>Analyzing portfolio performance...</span>
      </div>
    )
  }

  if (facilityScores.length < 2) {
    return (
      <div className={`rounded-xl border p-8 text-center ${card}`}>
        <BarChart3 className={`mx-auto mb-3 ${textMuted}`} size={40} />
        <h3 className={`text-lg font-semibold mb-2 ${text}`}>Insufficient Data</h3>
        <p className={textMuted}>Need campaign data from at least 2 facilities to generate optimization recommendations.</p>
      </div>
    )
  }

  /* ── Radar chart data for top facility ── */
  const topFacility = sorted[0]
  const radarData = [
    { metric: 'Vacancy Opp.', value: topFacility.vacancyScore },
    { metric: 'Margin', value: topFacility.marginScore },
    { metric: 'Demand', value: topFacility.demandScore },
    { metric: 'Momentum', value: topFacility.momentumScore },
  ]

  /* ── Budget allocation bar data ── */
  const budgetData = sorted.map(f => ({
    name: f.lead.facilityName.length > 20 ? f.lead.facilityName.slice(0, 18) + '...' : f.lead.facilityName,
    score: f.compositeScore,
    recommendation: f.recommendation,
  }))
  const barColors: Record<string, string> = {
    increase: '#10b981',
    maintain: '#3b82f6',
    decrease: '#f59e0b',
    pause: '#ef4444',
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className={`text-xs font-medium mb-1 ${textMuted}`}>Facilities Analyzed</div>
          <div className={`text-2xl font-bold ${text}`}>{facilityScores.length}</div>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className={`text-xs font-medium mb-1 ${textMuted}`}>Scale Up</div>
          <div className="text-2xl font-bold text-emerald-600">{increaseCount}</div>
          <div className={`text-xs ${textMuted}`}>facilities</div>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className={`text-xs font-medium mb-1 ${textMuted}`}>Scale Down</div>
          <div className="text-2xl font-bold text-amber-600">{decreaseCount}</div>
          <div className={`text-xs ${textMuted}`}>facilities</div>
        </div>
        <div className={`rounded-xl border p-4 ${card}`}>
          <div className={`text-xs font-medium mb-1 ${textMuted}`}>Total Portfolio Spend</div>
          <div className={`text-2xl font-bold ${text}`}>${totalCurrentSpend.toLocaleString()}</div>
        </div>
      </div>

      {/* Top Recommendation Highlight */}
      <div className={`rounded-xl border-2 border-emerald-300 p-5 ${darkMode ? 'bg-emerald-950/20' : 'bg-emerald-50/60'}`}>
        <div className="flex items-start gap-3">
          <Zap className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className={`font-semibold ${text}`}>Top Recommendation: Push spend toward {topFacility.lead.facilityName}</h3>
            <p className={`text-sm mt-1 ${textMuted}`}>
              {topFacility.lead.location} — Composite score {topFacility.compositeScore}/100.
              {topFacility.recommendedBudgetShift > 0 && ` Suggest increasing budget by ~${topFacility.recommendedBudgetShift}%.`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {topFacility.reasoning.map((r, i) => (
                <span key={i} className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composite Score Bar Chart */}
        <div className={`rounded-xl border p-5 ${card}`}>
          <h4 className={`text-sm font-semibold mb-4 ${text}`}>Optimization Scores</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 8 }}
                labelStyle={{ color: darkMode ? '#e2e8f0' : '#1e293b' }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {budgetData.map((entry, idx) => (
                  <Cell key={idx} fill={barColors[entry.recommendation]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Facility Radar */}
        <div className={`rounded-xl border p-5 ${card}`}>
          <h4 className={`text-sm font-semibold mb-4 ${text}`}>
            Top Pick: {topFacility.lead.facilityName}
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={darkMode ? '#334155' : '#e2e8f0'} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium ${textMuted}`}>Sort by:</span>
        {(['composite', 'vacancy', 'margin', 'demand', 'momentum'] as const).map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              sortBy === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : darkMode
                  ? 'border-slate-600 text-slate-400 hover:border-slate-400'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Facility Cards */}
      <div className="space-y-3">
        {sorted.map((f) => {
          const RecIcon = recIcons[f.recommendation]
          const isExpanded = expandedFacility === f.lead.id
          const colors = darkMode ? recColorsDark[f.recommendation] : recColors[f.recommendation]

          return (
            <div key={f.lead.id} className={`rounded-xl border overflow-hidden transition-all ${card}`}>
              {/* Header row */}
              <button
                className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-slate-50/50"
                onClick={() => setExpandedFacility(isExpanded ? null : f.lead.id)}
              >
                {/* Score badge */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${colors}`}>
                  {f.compositeScore}
                </div>

                {/* Name + location */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${text}`}>{f.lead.facilityName}</div>
                  <div className={`text-xs flex items-center gap-1 ${textMuted}`}>
                    <MapPin size={10} />
                    {f.lead.location}
                  </div>
                </div>

                {/* Recommendation badge */}
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${colors}`}>
                  <RecIcon size={12} />
                  {recLabels[f.recommendation]}
                  {f.recommendedBudgetShift !== 0 && f.recommendation !== 'pause' && (
                    <span>({f.recommendedBudgetShift > 0 ? '+' : ''}{f.recommendedBudgetShift}%)</span>
                  )}
                </span>

                {/* Score pills */}
                <div className="hidden md:flex items-center gap-2">
                  <ScorePill label="Vac" value={f.vacancyScore} darkMode={darkMode} />
                  <ScorePill label="Mar" value={f.marginScore} darkMode={darkMode} />
                  <ScorePill label="Dem" value={f.demandScore} darkMode={darkMode} />
                  <ScorePill label="Mom" value={f.momentumScore} darkMode={darkMode} />
                </div>

                {isExpanded ? <ChevronUp size={16} className={textMuted} /> : <ChevronDown size={16} className={textMuted} />}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <MiniStat label="Total Spend" value={`$${f.totals.spend.toLocaleString()}`} darkMode={darkMode} />
                    <MiniStat label="Total Leads" value={f.totals.leads.toString()} darkMode={darkMode} />
                    <MiniStat label="Avg CPL" value={`$${f.avgCpl.toFixed(0)}`} darkMode={darkMode} />
                    <MiniStat label="Latest ROAS" value={`${f.latestRoas.toFixed(1)}x`} darkMode={darkMode} />
                  </div>

                  {/* Score breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <ScoreBar label="Vacancy Opportunity" value={f.vacancyScore} darkMode={darkMode} />
                    <ScoreBar label="Margin Efficiency" value={f.marginScore} darkMode={darkMode} />
                    <ScoreBar label="Local Demand" value={f.demandScore} darkMode={darkMode} />
                    <ScoreBar label="Momentum" value={f.momentumScore} darkMode={darkMode} />
                  </div>

                  {/* Reasoning */}
                  <div>
                    <h5 className={`text-xs font-semibold mb-2 ${textMuted}`}>Analysis</h5>
                    <ul className="space-y-1">
                      {f.reasoning.map((r, i) => (
                        <li key={i} className={`text-sm flex items-start gap-2 ${text}`}>
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function ScorePill({ label, value, darkMode }: { label: string; value: number; darkMode?: boolean }) {
  const color = value >= 70 ? 'text-emerald-600' : value >= 40 ? 'text-blue-600' : 'text-amber-600'
  return (
    <div className={`text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
      <div className={`text-xs font-bold ${color}`}>{value}</div>
      <div className="text-[10px]">{label}</div>
    </div>
  )
}

function ScoreBar({ label, value, darkMode }: { label: string; value: number; darkMode?: boolean }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-blue-500' : 'bg-amber-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
        <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{value}</span>
      </div>
      <div className={`h-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, darkMode }: { label: string; value: string; darkMode?: boolean }) {
  return (
    <div>
      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
      <div className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}
