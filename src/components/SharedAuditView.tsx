import { useState, useEffect, useRef } from 'react'
import { Loader2, TrendingUp, DollarSign, Users, Clock, AlertTriangle, CheckCircle2, BarChart3, Target, ArrowRight, Rocket, Eye, Printer, Link2, Mail, Share2, Copy } from 'lucide-react'

interface AuditReport {
  generatedAt: string
  facility: { name: string; location?: string; totalUnits: number; occupancy: number; vacantUnits: number; biggestIssue?: string }
  vacancyCost: { monthlyLoss: number; annualLoss: number; vacantUnits: number; avgUnitRate: number }
  marketOpportunity: { score: number; grade: string }
  projections: {
    recommendedSpend: number; projectedCpl: number; projectedLeadsPerMonth: number
    projectedMoveInsPerMonth: number; projectedMonthlyRevenue: number
    projectedRoas: number; projectedMonthsToFill: number; conversionRate: number
  }
  competitiveInsights: string[]
  recommendations: { title: string; detail: string; priority: string }[]
}

interface AuditMeta {
  facilityName: string
  createdAt: string
  expiresAt: string
  views: number
}

function gradeTextColor(grade: string) {
  if (grade === 'Excellent') return 'text-emerald-400'
  if (grade === 'Strong') return 'text-blue-400'
  if (grade === 'Moderate') return 'text-amber-400'
  return 'text-slate-400'
}

function gradeBg(grade: string) {
  if (grade === 'Excellent') return 'bg-emerald-500/10 border-emerald-500/20'
  if (grade === 'Strong') return 'bg-blue-500/10 border-blue-500/20'
  if (grade === 'Moderate') return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-slate-500/10 border-slate-500/20'
}

function gradeStrokeColor(grade: string) {
  if (grade === 'Excellent') return 'text-emerald-500'
  if (grade === 'Strong') return 'text-blue-500'
  if (grade === 'Moderate') return 'text-amber-500'
  return 'text-slate-500'
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = ref.current
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (target - start) * eased)
      setValue(current)
      ref.current = current
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

function updateMetaTags(report: AuditReport, meta: AuditMeta) {
  document.title = `${meta.facilityName} — Marketing Audit | StowStack by StorageAds.com`
  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(property.startsWith('og:') ? 'property' : 'name', property)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  const description = `${report.marketOpportunity.grade} market opportunity (${report.marketOpportunity.score}/100). ${report.facility.vacantUnits} vacant units costing $${report.vacancyCost.annualLoss.toLocaleString()}/yr. Projected ${report.projections.projectedRoas}x ROAS.`
  setMeta('og:title', `${meta.facilityName} — Marketing Audit`)
  setMeta('og:description', description)
  setMeta('og:type', 'article')
  setMeta('og:url', window.location.href)
  setMeta('description', description)
  setMeta('twitter:card', 'summary')
  setMeta('twitter:title', `${meta.facilityName} — Marketing Audit`)
  setMeta('twitter:description', description)
}

export default function SharedAuditView({ slug }: { slug: string }) {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [meta, setMeta] = useState<AuditMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/audit-load?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Audit not found')
        }
        const data = await res.json()
        setReport(data.audit)
        setMeta({ facilityName: data.facilityName, createdAt: data.createdAt, expiresAt: data.expiresAt, views: data.views })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  useEffect(() => {
    if (report && meta) updateMetaTags(report, meta)
  }, [report, meta])

  const handlePrint = () => window.print()

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEmailShare = () => {
    if (!report || !meta) return
    const subject = encodeURIComponent(`${meta.facilityName} — Marketing Audit`)
    const body = encodeURIComponent(`Here's the marketing audit for ${meta.facilityName}:\n\n${window.location.href}\n\nKey findings:\n• Market Opportunity: ${report.marketOpportunity.grade} (${report.marketOpportunity.score}/100)\n• Annual vacancy cost: $${report.vacancyCost.annualLoss.toLocaleString()}\n• Projected ROAS: ${report.projections.projectedRoas}x\n\nGenerated by StowStack by StorageAds.com`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading facility audit...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Audit Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">
            {error || 'This audit link may have expired or is invalid.'}
          </p>
          <a href="/" className="inline-flex px-6 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
            Visit StowStack
          </a>
        </div>
      </div>
    )
  }

  const { facility, vacancyCost, marketOpportunity, projections, competitiveInsights, recommendations } = report
  const expiresIn = meta?.expiresAt ? daysUntil(meta.expiresAt) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .min-h-screen { min-height: auto !important; }
          * { color-adjust: exact !important; }
        }
      `}</style>

      {/* Top CTA Banner */}
      <div className="no-print bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-center">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Rocket className="w-4 h-4 text-white/80" />
          <span className="text-sm text-white/90">
            This audit was generated by <strong className="text-white">StowStack</strong> <span className="text-white/70">by StorageAds.com</span> — the self-storage demand engine
          </span>
          <a href="https://stowstack.co" className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors">
            Get Your Free Audit
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-400 font-medium tracking-wide uppercase">StowStack <span className="text-emerald-400/60">by StorageAds.com</span> Marketing Audit</p>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{meta?.facilityName || facility.name}</h1>
              </div>
            </div>

            {/* Action buttons */}
            <div className="no-print flex items-center gap-1.5 flex-shrink-0">
              <button onClick={handlePrint} title="Print / Save as PDF"
                className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors">
                <Printer className="w-4 h-4" />
              </button>
              <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)} title="Share"
                  className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                {showShareMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      <button onClick={() => { handleCopyLink(); setShowShareMenu(false) }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors">
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button onClick={() => { handleEmailShare(); setShowShareMenu(false) }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors">
                        <Mail className="w-4 h-4" />
                        Email Report
                      </button>
                      <button onClick={() => { handleCopyLink(); setShowShareMenu(false) }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors">
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {facility.location && <span>{facility.location}</span>}
            <span>{facility.totalUnits} units</span>
            <span>{facility.occupancy}% occupancy</span>
            {meta?.createdAt && (
              <span>Generated {new Date(meta.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
            {meta && meta.views > 0 && (
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{meta.views} view{meta.views !== 1 ? 's' : ''}</span>
            )}
            {expiresIn !== null && expiresIn > 0 && (
              <span className={`flex items-center gap-1 ${expiresIn <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                <Clock className="w-3 h-3" />
                {expiresIn <= 7 ? `Expires in ${expiresIn} day${expiresIn !== 1 ? 's' : ''}` : `Valid for ${expiresIn} days`}
              </span>
            )}
          </div>
        </div>

        {/* Market Opportunity Score */}
        <div className={`rounded-2xl border p-6 sm:p-8 mb-8 ${gradeBg(marketOpportunity.grade)}`}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <AnimatedScoreRing score={marketOpportunity.score} grade={marketOpportunity.grade} />
            <div className="text-center sm:text-left">
              <p className="text-sm text-slate-400 uppercase tracking-wide mb-1">Market Opportunity</p>
              <p className={`text-3xl font-bold ${gradeTextColor(marketOpportunity.grade)}`}>{marketOpportunity.grade}</p>
              <p className="text-sm text-slate-400 mt-1">
                {marketOpportunity.grade === 'Excellent' ? 'Strong demand signals indicate high ROI potential for digital acquisition.' :
                 marketOpportunity.grade === 'Strong' ? 'Good conditions for growth through targeted advertising.' :
                 marketOpportunity.grade === 'Moderate' ? 'Opportunity exists with the right strategy and targeting.' :
                 'Limited opportunity — consider operational improvements first.'}
              </p>
            </div>
          </div>
        </div>

        {/* Vacancy Cost Alert */}
        <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <DollarSign className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Vacancy Cost Analysis</h2>
              <p className="text-sm text-slate-400 mt-0.5">What empty units are costing you right now</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Vacant Units" value={String(vacancyCost.vacantUnits)} color="text-red-400" />
            <StatCard label="Avg Unit Rate" value={`$${vacancyCost.avgUnitRate}`} color="text-slate-300" />
            <StatCard label="Monthly Loss" value={`$${vacancyCost.monthlyLoss.toLocaleString()}`} color="text-red-400" />
            <StatCard label="Annual Loss" value={`$${vacancyCost.annualLoss.toLocaleString()}`} color="text-red-500" large />
          </div>
        </div>

        {/* ROI Snapshot */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border border-emerald-500/15 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            ROI Snapshot
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900/40 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Monthly Investment</p>
              <p className="text-2xl font-bold text-white">${projections.recommendedSpend.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">ad spend</p>
            </div>
            <div className="text-center p-4 bg-slate-900/40 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Monthly Return</p>
              <p className="text-2xl font-bold text-emerald-400">${projections.projectedMonthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">projected revenue</p>
            </div>
            <div className="text-center p-4 bg-slate-900/40 rounded-xl border border-emerald-500/20">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Return on Ad Spend</p>
              <p className="text-2xl font-bold text-emerald-400">{projections.projectedRoas}x</p>
              <p className="text-xs text-emerald-500/80 mt-1">for every $1 spent</p>
            </div>
          </div>
        </div>

        {/* Projected Performance */}
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 mb-8 print-break">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Projected Performance</h2>
              <p className="text-sm text-slate-400 mt-0.5">What StowStack can deliver with a ${projections.recommendedSpend.toLocaleString()}/mo ad budget</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Recommended Spend" value={`$${projections.recommendedSpend.toLocaleString()}/mo`} color="text-emerald-400" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatCard label="Cost Per Lead" value={`$${projections.projectedCpl}`} color="text-white" icon={<Target className="w-3.5 h-3.5" />} />
            <StatCard label="Leads / Month" value={String(projections.projectedLeadsPerMonth)} color="text-blue-400" icon={<Users className="w-3.5 h-3.5" />} />
            <StatCard label="Move-ins / Month" value={String(projections.projectedMoveInsPerMonth)} color="text-emerald-400" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <StatCard label="Monthly Revenue" value={`$${projections.projectedMonthlyRevenue.toLocaleString()}`} color="text-emerald-400" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatCard label="ROAS" value={`${projections.projectedRoas}x`} color="text-emerald-400" icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatCard label="Conversion Rate" value={`${projections.conversionRate}%`} color="text-blue-400" />
            <StatCard label="Months to Fill" value={String(projections.projectedMonthsToFill)} color="text-amber-400" icon={<Clock className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Competitive Insights */}
        {competitiveInsights.length > 0 && (
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Competitive Insights</h2>
            </div>
            <div className="space-y-3">
              {competitiveInsights.map((insight, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-700/30 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
                  }`}>{rec.priority}</span>
                  <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{rec.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="no-print rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-600/5 border border-emerald-500/20 p-8 text-center">
          <Rocket className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Ready to Fill Your Vacant Units?</h2>
          <p className="text-sm text-slate-400 mb-5 max-w-lg mx-auto">
            StowStack builds ad-specific landing pages with full-funnel attribution and revenue-based A/B testing — purpose-built for self-storage operators.
          </p>
          <a href="https://stowstack.co" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
            Get Your Free Audit <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-slate-600">
          Generated by StowStack by StorageAds.com
          {meta?.createdAt && ` · ${new Date(meta.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
        </div>
      </div>
    </div>
  )
}

function AnimatedScoreRing({ score, grade }: { score: number; grade: string }) {
  const animatedScore = useAnimatedNumber(score)
  const circumference = 327
  const dashLength = (animatedScore / 100) * circumference

  return (
    <div className="relative">
      <svg viewBox="0 0 120 120" className="w-28 h-28">
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8"
          className={gradeStrokeColor(grade)}
          stroke="currentColor"
          strokeDasharray={`${dashLength} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.05s linear' }}
        />
        <text x="60" y="55" textAnchor="middle" className="fill-white text-2xl font-bold" fontSize="28">{animatedScore}</text>
        <text x="60" y="72" textAnchor="middle" className="fill-slate-400 text-xs" fontSize="11">/ 100</text>
      </svg>
    </div>
  )
}

function StatCard({ label, value, color, large, icon }: { label: string; value: string; color: string; large?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700/30 p-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className={color}>{icon}</span>}
        <p className={`${large ? 'text-xl' : 'text-lg'} font-bold ${color}`}>{value}</p>
      </div>
    </div>
  )
}
