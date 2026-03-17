import { useState, useEffect } from 'react'
import {
  Loader2, Sparkles, Search, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2, Zap, Shield
} from 'lucide-react'
import { Facility } from './types'
import PlanContextBar from './PlanContextBar'

/* ── Types ── */

interface KeywordIdea {
  keyword: string
  intent: 'high' | 'medium' | 'low'
  competition: 'high' | 'medium' | 'low'
  estimatedCPC: number
  estimatedVolume: number
  relevanceScore: number // 0-100
  rationale: string
  group: string
}

interface CampaignConfig {
  name: string
  dailyBudget: number
  bidStrategy: 'maximize_clicks' | 'maximize_conversions' | 'target_cpa' | 'manual_cpc'
  targetCPA: number | null
  geoRadius: number // miles
  adSchedule: string[]
  keywords: KeywordIdea[]
  negativeKeywords: string[]
}

interface CampaignScore {
  overall: number
  breakdown: {
    keywordRelevance: number
    budgetEfficiency: number
    intentBalance: number
    competitivePosition: number
    geoFocus: number
  }
  warnings: string[]
  suggestions: string[]
}

const INTENT_COLORS = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const COMPETITION_COLORS = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-emerald-500',
}

const BID_STRATEGIES = [
  { id: 'maximize_clicks', label: 'Maximize Clicks', description: 'Best for new campaigns — get traffic flowing' },
  { id: 'maximize_conversions', label: 'Maximize Conversions', description: 'Let Google optimize for move-ins — needs conversion tracking' },
  { id: 'target_cpa', label: 'Target CPA', description: 'Set your cost-per-lead target — needs 30+ conversions/month' },
  { id: 'manual_cpc', label: 'Manual CPC', description: 'Full control over every bid — for experts only' },
]

const DEFAULT_NEGATIVES = [
  'free', 'diy', 'how to build', 'jobs', 'career', 'salary',
  'ikea', 'walmart', 'amazon', 'home depot',
  'closet', 'shed plans', 'garage plans',
]

/* ── Scoring Logic ── */

function scoreCampaign(config: CampaignConfig, _facility: Facility): CampaignScore {
  const warnings: string[] = []
  const suggestions: string[] = []

  // Keyword relevance (are keywords storage-specific?)
  const storageTerms = /storage|unit|moving|store|rent|locker|climate|secure|self.?storage/i
  const relevantCount = config.keywords.filter(k => storageTerms.test(k.keyword)).length
  const keywordRelevance = config.keywords.length > 0 ? Math.round((relevantCount / config.keywords.length) * 100) : 0
  if (keywordRelevance < 60) warnings.push('Many keywords aren\'t storage-specific — you may attract irrelevant clicks')

  // Budget efficiency
  const avgCPC = config.keywords.length > 0
    ? config.keywords.reduce((s, k) => s + k.estimatedCPC, 0) / config.keywords.length
    : 3
  const estimatedDailyClicks = config.dailyBudget / avgCPC
  let budgetEfficiency = 0
  if (estimatedDailyClicks >= 10) budgetEfficiency = 90
  else if (estimatedDailyClicks >= 5) budgetEfficiency = 75
  else if (estimatedDailyClicks >= 3) budgetEfficiency = 60
  else { budgetEfficiency = 40; warnings.push(`Budget only supports ~${Math.round(estimatedDailyClicks)} clicks/day — consider increasing to $${Math.round(avgCPC * 5)}/day minimum`) }

  // Intent balance (want mostly high-intent keywords)
  const highIntent = config.keywords.filter(k => k.intent === 'high').length
  const intentBalance = config.keywords.length > 0 ? Math.round((highIntent / config.keywords.length) * 100) : 50
  if (intentBalance < 40) suggestions.push('Add more high-intent keywords like "storage units near me" or "rent storage unit"')
  if (intentBalance > 90) suggestions.push('Consider adding a few medium-intent keywords for awareness at lower CPCs')

  // Competitive position
  const highComp = config.keywords.filter(k => k.competition === 'high').length
  const competitivePosition = config.keywords.length > 0 ? Math.round(100 - (highComp / config.keywords.length) * 60) : 50
  if (highComp > config.keywords.length * 0.7) warnings.push('Mostly high-competition keywords — CPCs will be expensive. Mix in long-tail variations.')

  // Geo focus
  let geoFocus = 70
  if (config.geoRadius <= 10) { geoFocus = 95; suggestions.push('Tight geo-targeting — great for local dominance') }
  else if (config.geoRadius <= 20) geoFocus = 80
  else if (config.geoRadius <= 30) geoFocus = 60
  else { geoFocus = 40; warnings.push('Radius over 30 miles is too wide for self-storage — most customers drive <15 minutes') }

  // Negative keywords check
  if (config.negativeKeywords.length < 5) suggestions.push('Add more negative keywords to avoid wasted spend on irrelevant searches')

  // Bid strategy check
  if (config.bidStrategy === 'target_cpa' && !config.targetCPA) warnings.push('Target CPA strategy selected but no CPA value set')
  if (config.bidStrategy === 'manual_cpc') suggestions.push('Manual CPC gives control but requires daily monitoring — automated strategies often outperform')

  const overall = Math.round(
    keywordRelevance * 0.3 +
    budgetEfficiency * 0.25 +
    intentBalance * 0.2 +
    competitivePosition * 0.15 +
    geoFocus * 0.1
  )

  return {
    overall,
    breakdown: { keywordRelevance, budgetEfficiency, intentBalance, competitivePosition, geoFocus },
    warnings,
    suggestions,
  }
}

/* ── Component ── */

export default function GoogleAdsLab({ facility, adminKey, darkMode, pmsData }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
  pmsData?: import('@/hooks/usePMSData').PMSData | null
}) {
  const [keywords, setKeywords] = useState<KeywordIdea[]>([])
  const [loading, setLoading] = useState(false)
  const suggestedBudget = pmsData?.vacantUnits ? Math.max(20, Math.round(pmsData.vacantUnits * 2)) : 30
  const [config, setConfig] = useState<CampaignConfig>({
    name: `${facility.name} — Search`,
    dailyBudget: suggestedBudget,
    bidStrategy: 'maximize_clicks',
    targetCPA: null,
    geoRadius: 15,
    adSchedule: ['Mon-Fri 6am-10pm', 'Sat-Sun 8am-8pm'],
    keywords: [],
    negativeKeywords: [...DEFAULT_NEGATIVES],
  })
  const [score, setScore] = useState<CampaignScore | null>(null)
  const [newNegative, setNewNegative] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  // Score whenever config changes
  useEffect(() => {
    if (config.keywords.length > 0) {
      setScore(scoreCampaign(config, facility))
    }
  }, [config, facility])

  async function generateKeywords() {
    setLoading(true)
    try {
      const res = await fetch('/api/google-ads-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id }),
      })
      const data = await res.json()
      if (data.keywords) {
        setKeywords(data.keywords)
        setConfig(prev => ({ ...prev, keywords: data.keywords }))
      } else if (data.error) {
        alert(data.error)
      }
    } catch (err) {
      console.error('Keyword generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleKeyword(keyword: KeywordIdea) {
    setConfig(prev => {
      const exists = prev.keywords.some(k => k.keyword === keyword.keyword)
      return {
        ...prev,
        keywords: exists
          ? prev.keywords.filter(k => k.keyword !== keyword.keyword)
          : [...prev.keywords, keyword],
      }
    })
  }

  function addNegative() {
    if (!newNegative.trim()) return
    setConfig(prev => ({ ...prev, negativeKeywords: [...prev.negativeKeywords, newNegative.trim().toLowerCase()] }))
    setNewNegative('')
  }

  function removeNegative(kw: string) {
    setConfig(prev => ({ ...prev, negativeKeywords: prev.negativeKeywords.filter(n => n !== kw) }))
  }

  // Group keywords
  const groups = keywords.reduce<Record<string, KeywordIdea[]>>((acc, kw) => {
    const g = kw.group || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(kw)
    return acc
  }, {})

  const scoreColor = (s: number) => s >= 80 ? 'text-emerald-500' : s >= 60 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="space-y-6">
      <PlanContextBar facilityId={facility.id} adminKey={adminKey} darkMode={darkMode} filter="google-ads" />
      <div>
        <h4 className={`text-sm font-semibold ${text}`}>Google Ads Laboratory</h4>
        <p className={`text-xs ${sub} mt-0.5`}>Build, score, and optimize Google Search campaigns for {facility.name}</p>
      </div>

      {/* PMS Context Bar — occupancy-based strategy per storEDGE framework */}
      {pmsData && pmsData.units.length > 0 && (() => {
        const occ = pmsData.occupancyPct
        const vacantWithRevenue = pmsData.units
          .filter(u => (u.total_count - u.occupied_count) > 0)
          .map(u => ({ type: u.unit_type, vacant: u.total_count - u.occupied_count, rate: u.street_rate || 0 }))
        const monthlyRevenueGap = vacantWithRevenue.reduce((s, u) => s + u.vacant * u.rate, 0)
        const lowestPrice = Math.min(...pmsData.units.map(u => u.web_rate || u.street_rate || 999))
        const topVacant = vacantWithRevenue.sort((a, b) => b.vacant - a.vacant).slice(0, 3)

        // Occupancy-based strategy directive (Section 5.1)
        let strategyLabel: string, strategyColor: string, strategyDetail: string, bidRec: string
        if (occ < 80) {
          strategyLabel = 'Aggressive Demand Generation'
          strategyColor = darkMode ? 'text-red-400' : 'text-red-600'
          strategyDetail = 'Broad targeting. Strong offers. CPMI target is secondary to volume — fill units first.'
          bidRec = 'maximize_clicks'
        } else if (occ < 90) {
          strategyLabel = 'Targeted by Unit Type'
          strategyColor = darkMode ? 'text-amber-400' : 'text-amber-600'
          strategyDetail = `Focus on underperforming types: ${topVacant.map(u => u.type).join(', ') || 'varies'}. Optimize CPMI.`
          bidRec = 'maximize_conversions'
        } else if (occ < 95) {
          strategyLabel = 'Selective + Rate Optimization'
          strategyColor = darkMode ? 'text-blue-400' : 'text-blue-600'
          strategyDetail = 'Fill specific vacancies only. Rate increases are the primary revenue lever now.'
          bidRec = 'target_cpa'
        } else {
          strategyLabel = 'Revenue Maximization Only'
          strategyColor = darkMode ? 'text-emerald-400' : 'text-emerald-600'
          strategyDetail = 'Minimal acquisition spend. Focus on rate increases and waitlist campaigns.'
          bidRec = 'manual_cpc'
        }

        return (
          <div className={`border rounded-xl p-4 space-y-3 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>StorEdge PMS — Campaign Intelligence</p>
              <span className={`text-xs font-bold ${strategyColor}`}>{strategyLabel}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <p className={`text-lg font-bold ${text}`}>{pmsData.vacantUnits}</p>
                <p className={`text-xs ${sub}`}>Vacant Units</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${text}`}>{occ.toFixed(1)}%</p>
                <p className={`text-xs ${sub}`}>Occupancy</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${text}`}>${lowestPrice}</p>
                <p className={`text-xs ${sub}`}>Starting Price</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>${monthlyRevenueGap.toLocaleString()}</p>
                <p className={`text-xs ${sub}`}>Monthly Revenue Gap</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${text}`}>${suggestedBudget}/day</p>
                <p className={`text-xs ${sub}`}>Suggested Budget</p>
              </div>
            </div>
            <div className={`text-xs ${sub} border-t pt-2 ${darkMode ? 'border-blue-800' : 'border-blue-200'}`}>
              <p><strong className={strategyColor}>Strategy:</strong> {strategyDetail}</p>
              {topVacant.length > 0 && (
                <p className="mt-1"><strong>Priority units:</strong> {topVacant.map(u => `${u.type} (${u.vacant} vacant × $${u.rate} = $${(u.vacant * u.rate).toLocaleString()}/mo gap)`).join(' · ')}</p>
              )}
              {occ >= 95 && <p className="mt-1 font-medium">At {occ.toFixed(1)}% occupancy, every $1 in ad spend should be justified by rate optimization ROI, not unit fills.</p>}
              {bidRec !== config.bidStrategy && (
                <p className="mt-1"><strong>Bid strategy suggestion:</strong> Based on occupancy, consider <em>{BID_STRATEGIES.find(b => b.id === bidRec)?.label}</em> instead of {BID_STRATEGIES.find(b => b.id === config.bidStrategy)?.label}.</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Campaign Score */}
      {score && (
        <div className={`border rounded-xl p-5 ${card}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-3xl font-bold ${scoreColor(score.overall)}`}>{score.overall}</div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${text}`}>Campaign Score</p>
              <p className={`text-xs ${sub}`}>{score.overall >= 80 ? 'Strong campaign — ready to launch' : score.overall >= 60 ? 'Decent foundation — review suggestions below' : 'Needs work — address warnings before launching'}</p>
            </div>
            <Shield size={24} className={scoreColor(score.overall)} />
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {Object.entries(score.breakdown).map(([key, val]) => (
              <div key={key} className="text-center">
                <div className={`text-lg font-bold ${scoreColor(val)}`}>{val}</div>
                <p className={`text-[9px] uppercase ${sub}`}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            ))}
          </div>

          {/* Warnings & suggestions */}
          {score.warnings.length > 0 && (
            <div className="space-y-1 mb-3">
              {score.warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}
          {score.suggestions.length > 0 && (
            <div className="space-y-1">
              {score.suggestions.map((s, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${darkMode ? 'bg-emerald-900/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Zap size={12} className="mt-0.5 flex-shrink-0" /> {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Campaign Config */}
        <div className="space-y-4">
          <div className={`border rounded-xl p-4 ${card}`}>
            <h5 className={`text-xs font-semibold ${text} mb-3`}>Campaign Settings</h5>

            <div className="space-y-3">
              <div>
                <label className={`text-[10px] uppercase ${sub} block mb-1`}>Daily Budget</label>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className={sub} />
                  <input
                    type="number"
                    value={config.dailyBudget}
                    onChange={e => setConfig(prev => ({ ...prev, dailyBudget: parseFloat(e.target.value) || 0 }))}
                    className={`w-24 px-2 py-1.5 border rounded-lg text-sm ${inputBg}`}
                  />
                  <span className={`text-xs ${sub}`}>/ day (${(config.dailyBudget * 30).toLocaleString()}/mo)</span>
                </div>
              </div>

              <div>
                <label className={`text-[10px] uppercase ${sub} block mb-1`}>Geo Radius</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={5} max={50} step={5}
                    value={config.geoRadius}
                    onChange={e => setConfig(prev => ({ ...prev, geoRadius: parseInt(e.target.value) }))}
                    className="flex-1 accent-emerald-600"
                  />
                  <span className={`text-sm font-medium ${text} w-20`}>{config.geoRadius} miles</span>
                </div>
              </div>

              <div>
                <label className={`text-[10px] uppercase ${sub} block mb-2`}>Bid Strategy</label>
                <div className="space-y-1.5">
                  {BID_STRATEGIES.map(bs => (
                    <button
                      key={bs.id}
                      onClick={() => setConfig(prev => ({ ...prev, bidStrategy: bs.id as CampaignConfig['bidStrategy'] }))}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                        config.bidStrategy === bs.id
                          ? darkMode ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                          : card
                      }`}
                    >
                      <span className={`font-medium ${text}`}>{bs.label}</span>
                      <span className={`block ${sub} mt-0.5`}>{bs.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {config.bidStrategy === 'target_cpa' && (
                <div>
                  <label className={`text-[10px] uppercase ${sub} block mb-1`}>Target CPA</label>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className={sub} />
                    <input
                      type="number"
                      value={config.targetCPA || ''}
                      onChange={e => setConfig(prev => ({ ...prev, targetCPA: parseFloat(e.target.value) || null }))}
                      placeholder="e.g., 25"
                      className={`w-24 px-2 py-1.5 border rounded-lg text-sm ${inputBg}`}
                    />
                    <span className={`text-xs ${sub}`}>per lead</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Negative Keywords */}
          <div className={`border rounded-xl p-4 ${card}`}>
            <h5 className={`text-xs font-semibold ${text} mb-2`}>Negative Keywords ({config.negativeKeywords.length})</h5>
            <p className={`text-[10px] ${sub} mb-2`}>Prevent your ads from showing on these searches</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config.negativeKeywords.map(kw => (
                <span key={kw} className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
                  {kw}
                  <button onClick={() => removeNegative(kw)} className="hover:text-red-500"><Trash2 size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newNegative}
                onChange={e => setNewNegative(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNegative() }}
                placeholder="Add negative keyword..."
                className={`flex-1 px-2 py-1 border rounded text-xs ${inputBg}`}
              />
              <button onClick={addNegative} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"><Plus size={11} /></button>
            </div>
          </div>
        </div>

        {/* Right: Keywords */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className={`text-xs font-semibold ${text}`}>Keywords ({config.keywords.length} selected)</h5>
            <button
              onClick={generateKeywords}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {keywords.length ? 'Regenerate' : 'Generate Keywords'}
            </button>
          </div>

          {/* Cost estimate */}
          {config.keywords.length > 0 && (() => {
            const avgCPC = config.keywords.reduce((s, k) => s + k.estimatedCPC, 0) / config.keywords.length
            const totalVolume = config.keywords.reduce((s, k) => s + k.estimatedVolume, 0)
            const estimatedClicksDay = Math.min(config.dailyBudget / avgCPC, totalVolume / 30)
            const estimatedCostDay = estimatedClicksDay * avgCPC
            const estimatedCostMonth = estimatedCostDay * 30
            return (
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="text-center">
                  <p className={`text-sm font-bold ${text}`}>${avgCPC.toFixed(2)}</p>
                  <p className={`text-[9px] uppercase ${sub}`}>Avg CPC</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${text}`}>{Math.round(estimatedClicksDay)}</p>
                  <p className={`text-[9px] uppercase ${sub}`}>Clicks/Day</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${text}`}>${Math.round(estimatedCostDay)}</p>
                  <p className={`text-[9px] uppercase ${sub}`}>Est. Cost/Day</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold text-emerald-500`}>${estimatedCostMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className={`text-[9px] uppercase ${sub}`}>Est. Cost/Mo</p>
                </div>
              </div>
            )
          })()}

          {keywords.length === 0 && !loading && (
            <div className={`text-center py-8 border rounded-xl ${card}`}>
              <Search size={24} className={`mx-auto mb-2 ${sub}`} />
              <p className={`text-sm ${sub}`}>Generate AI-powered keyword suggestions</p>
              <p className={`text-[10px] ${sub} mt-1`}>Based on facility data, location, and market analysis</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
          )}

          {/* Keyword groups */}
          {Object.entries(groups).map(([group, kws]) => (
            <div key={group} className={`border rounded-xl overflow-hidden ${card}`}>
              <button
                onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                className="w-full px-4 py-2.5 flex items-center gap-2 text-left"
              >
                <span className={`text-xs font-semibold flex-1 ${text}`}>{group}</span>
                <span className={`text-[10px] ${sub}`}>{kws.filter(k => config.keywords.some(ck => ck.keyword === k.keyword)).length}/{kws.length}</span>
                {expandedGroup === group ? <ChevronUp size={12} className={sub} /> : <ChevronDown size={12} className={sub} />}
              </button>
              {expandedGroup === group && (
                <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  {kws.map(kw => {
                    const selected = config.keywords.some(k => k.keyword === kw.keyword)
                    return (
                      <button
                        key={kw.keyword}
                        onClick={() => toggleKeyword(kw)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-b last:border-0 transition-colors ${
                          darkMode ? 'border-slate-700' : 'border-slate-50'
                        } ${selected ? (darkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/50') : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-emerald-600 border-emerald-600' : darkMode ? 'border-slate-500' : 'border-slate-300'
                        }`}>
                          {selected && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${text}`}>{kw.keyword}</p>
                          <p className={`text-[10px] ${sub} truncate`}>{kw.rationale}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${INTENT_COLORS[kw.intent]}`}>{kw.intent}</span>
                          <span className={`text-[10px] font-mono ${COMPETITION_COLORS[kw.competition]}`}>${kw.estimatedCPC.toFixed(2)}</span>
                          <span className={`text-[10px] ${sub}`}>{kw.estimatedVolume}/mo</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
