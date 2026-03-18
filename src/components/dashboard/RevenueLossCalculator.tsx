import { useState, useEffect, useRef } from 'react'
import {
  Loader2, AlertTriangle, RefreshCw,
  TrendingDown, Building2, MapPin, Calendar, Database,
  Printer,
} from 'lucide-react'
import { Facility } from './types'
import {
  type RevenueLossData,
  SEVERITY_CONFIG, CATEGORY_ORDER, money, moneyK,
} from './revenue-loss/RevenueLossTypes'
import AnimatedCounter from './revenue-loss/AnimatedCounter'
import LossCategoryRow from './revenue-loss/LossCategory'
import RecoveryProjection from './revenue-loss/RecoveryProjection'

/* ════════════════════════════════════════════════════════════════
   Revenue Loss Calculator — "Revenue You're Leaving on the Table"
   The Zoom closer. Shows operators exactly how much they're losing.
════════════════════════════════════════════════════════════════ */

export default function RevenueLossCalculator({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [data, setData] = useState<RevenueLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'loss' | 'recovery'>('loss')
  const printRef = useRef<HTMLDivElement>(null)

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  useEffect(() => {
    fetchData()
  }, [facility.id])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/revenue-loss?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue loss data')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className={`ml-3 ${sub}`}>Calculating revenue losses...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`border rounded-xl p-6 text-center ${card}`}>
        <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
        <p className={`font-medium ${text}`}>Could not calculate revenue loss</p>
        <p className={`text-sm ${sub} mt-1`}>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          Try Again
        </button>
      </div>
    )
  }

  if (!data) return null

  const sev = SEVERITY_CONFIG[data.overallSeverity]

  // Sort categories by annual loss descending (biggest bleeder first)
  const sortedCategories = [...CATEGORY_ORDER].sort((a, b) =>
    data.categories[b].annualLoss - data.categories[a].annualLoss
  )

  return (
    <div ref={printRef} className="space-y-4 print:space-y-2">

      {/* ══════════ HEADER ══════════ */}
      <div className={`border rounded-xl p-5 ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'}`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sev.bg} shadow-lg ${sev.glow}`}>
              <TrendingDown size={24} className={sev.text} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${text}`}>Revenue Gap Analysis</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className={`flex items-center gap-1 text-xs ${sub}`}>
                  <Building2 size={12} /> {data.facilityName}
                </span>
                <span className={`flex items-center gap-1 text-xs ${sub}`}>
                  <MapPin size={12} /> {data.facilityLocation}
                </span>
                <span className={`flex items-center gap-1 text-xs ${sub}`}>
                  <Calendar size={12} /> {new Date(data.calculatedAt).toLocaleDateString()}
                </span>
                <span className={`flex items-center gap-1 text-xs ${sub}`}>
                  <Database size={12} /> {data.dataSource === 'pms' ? 'PMS Data' : 'Audit Estimate'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase animate-pulse ${sev.bg} ${sev.text}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${sev.dot} mr-1.5`}></span>
              {sev.label}
            </span>
            <button onClick={fetchData} className={`p-2 rounded-lg border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`} title="Recalculate">
              <RefreshCw size={14} className={sub} />
            </button>
            <button onClick={handlePrint} className={`p-2 rounded-lg border transition-colors print:hidden ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`} title="Print Report">
              <Printer size={14} className={sub} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ THE BIG NUMBER ══════════ */}
      <div className={`border rounded-xl p-6 text-center ${darkMode ? 'bg-gradient-to-br from-red-900/20 via-slate-900 to-red-900/10 border-red-500/20' : 'bg-gradient-to-br from-red-50 via-white to-red-50 border-red-200'}`}>
        <p className={`text-sm font-medium uppercase tracking-wider ${sub}`}>
          Estimated Annual Revenue You're Losing
        </p>
        <div className="mt-2">
          <AnimatedCounter
            target={data.totalAnnualLoss}
            duration={2500}
            className="text-5xl sm:text-6xl font-black text-red-500 tabular-nums tracking-tight"
          />
        </div>
        <p className={`mt-2 text-lg ${sub}`}>
          That's <span className="text-red-400 font-bold">{money(data.totalMonthlyLoss)}</span> every month
        </p>

        {/* Facility snapshot pills */}
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Pill label="Units" value={`${data.snapshot.occupiedUnits}/${data.snapshot.totalUnits}`} darkMode={darkMode} />
          <Pill label="Occupancy" value={`${data.snapshot.occupancyPct}%`} darkMode={darkMode} accent={data.snapshot.occupancyPct < 85 ? 'text-red-500' : 'text-emerald-500'} />
          <Pill label="Avg Rate" value={money(data.snapshot.avgRate)} darkMode={darkMode} />
          <Pill label="Vacant" value={String(data.snapshot.vacantUnits)} darkMode={darkMode} accent="text-red-500" />
          <Pill label="Gross Potential" value={moneyK(data.snapshot.grossPotential)} darkMode={darkMode} />
        </div>

        {/* Loss breakdown bar */}
        <div className="mt-5 max-w-2xl mx-auto">
          <div className={`w-full h-8 rounded-lg overflow-hidden flex ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            {sortedCategories.map(key => {
              const cat = data.categories[key]
              if (cat.annualLoss <= 0) return null
              const pct = (cat.annualLoss / data.totalAnnualLoss) * 100
              if (pct < 3) return null
              const colors: Record<string, string> = {
                vacancyDrag: 'bg-red-500',
                rateGap: 'bg-orange-500',
                marketingVoid: 'bg-purple-500',
                competitorCapture: 'bg-blue-500',
                churnBleed: 'bg-rose-500',
                discountDrag: 'bg-amber-500',
              }
              return (
                <div
                  key={key}
                  className={`h-8 ${colors[key] || 'bg-slate-500'} flex items-center justify-center transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${cat.label}: ${money(cat.annualLoss)}/yr (${Math.round(pct)}%)`}
                >
                  {pct > 12 && (
                    <span className="text-[10px] font-bold text-white truncate px-1">
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {sortedCategories.map(key => {
              const cat = data.categories[key]
              if (cat.annualLoss <= 0) return null
              const dotColors: Record<string, string> = {
                vacancyDrag: 'bg-red-500',
                rateGap: 'bg-orange-500',
                marketingVoid: 'bg-purple-500',
                competitorCapture: 'bg-blue-500',
                churnBleed: 'bg-rose-500',
                discountDrag: 'bg-amber-500',
              }
              return (
                <span key={key} className={`flex items-center gap-1.5 text-[10px] ${sub}`}>
                  <span className={`w-2 h-2 rounded-full ${dotColors[key]}`}></span>
                  {cat.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════ VIEW TOGGLE ══════════ */}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} print:hidden`}>
        <button
          onClick={() => setActiveView('loss')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeView === 'loss'
              ? 'bg-red-500 text-white shadow-lg'
              : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
          }`}
        >
          Where You're Losing
        </button>
        <button
          onClick={() => setActiveView('recovery')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeView === 'recovery'
              ? 'bg-emerald-500 text-white shadow-lg'
              : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
          }`}
        >
          How To Recover It
        </button>
      </div>

      {/* ══════════ LOSS CATEGORIES ══════════ */}
      {activeView === 'loss' && (
        <div className="space-y-3">
          {sortedCategories.map((key, rank) => (
            <LossCategoryRow
              key={key}
              categoryKey={key}
              category={data.categories[key]}
              darkMode={darkMode}
              rank={rank}
            />
          ))}

          {/* Market context card */}
          {data.market.population > 0 && (
            <div className={`border rounded-xl p-4 ${card}`}>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>Market Context</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <MiniStat label="Population" value={data.market.population.toLocaleString()} darkMode={darkMode} />
                <MiniStat label="Median Income" value={money(data.market.medianIncome)} darkMode={darkMode} />
                <MiniStat label="Renter %" value={`${data.market.renterPct}%`} darkMode={darkMode} />
                <MiniStat label="Competitors" value={String(data.market.competitorCount)} darkMode={darkMode} />
                <MiniStat label="Avg Comp Rating" value={data.market.avgCompetitorRating ? `${data.market.avgCompetitorRating}★` : '—'} darkMode={darkMode} />
                <MiniStat label="Search Volume" value={`${data.market.estimatedSearchVolume.toLocaleString()}/mo`} darkMode={darkMode} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ RECOVERY PROJECTION ══════════ */}
      {activeView === 'recovery' && (
        <RecoveryProjection data={data} darkMode={darkMode} />
      )}

      {/* ══════════ BOTTOM CTA ══════════ */}
      <div className={`border rounded-xl p-5 text-center print:hidden ${darkMode ? 'bg-gradient-to-r from-emerald-900/20 to-emerald-900/10 border-emerald-800/30' : 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200'}`}>
        <p className={`text-lg font-bold ${text}`}>
          Every month you wait costs <span className="text-red-500">{money(data.totalMonthlyLoss)}</span>
        </p>
        <p className={`text-sm ${sub} mt-1`}>
          StowStack costs {money(data.recovery.stowstackMonthlyFee)}/mo and projects {money(data.recovery.projectedMonthlyRecovery)}/mo in recovered revenue.
        </p>
        <p className={`text-xs ${sub} mt-3`}>
          The math: {money(data.recovery.projectedMonthlyRecovery)} recovered - {money(data.recovery.totalMonthlyCost)} total cost = <span className="text-emerald-500 font-bold">{money(data.recovery.projectedMonthlyRecovery - data.recovery.totalMonthlyCost)}/mo net positive</span>
        </p>
      </div>
    </div>
  )
}

/* ── Small helper components ── */

function Pill({ label, value, darkMode, accent }: { label: string; value: string; darkMode: boolean; accent?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border`}>
      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{label}:</span>
      <span className={`font-bold ${accent || (darkMode ? 'text-slate-100' : 'text-slate-900')}`}>{value}</span>
    </span>
  )
}

function MiniStat({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
      <p className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
