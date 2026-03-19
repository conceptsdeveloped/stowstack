import { useState, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Calculator, BarChart3,
  ChevronDown, ChevronUp, Info, Zap, Target, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Building2, PieChart, Lightbulb
} from 'lucide-react'
import { CONTRACT_TERMS, ContractTermId, getDiscountedFee, PRICING_TIERS } from './billing/BillingConstants'

interface Props {
  adminKey: string
  darkMode: boolean
}

interface FacilityInput {
  name: string
  avgRent: number
  avgStayMonths: number
  monthlyAdSpend: number
  cpl: number
  leadToTourRate: number
  tourToMoveInRate: number
  totalUnits: number
  currentOccupancy: number
}

const DEFAULT_FACILITY: FacilityInput = {
  name: 'Facility 1',
  avgRent: 125,
  avgStayMonths: 13,
  monthlyAdSpend: 3000,
  cpl: 30,
  leadToTourRate: 20,
  tourToMoveInRate: 35,
  totalUnits: 200,
  currentOccupancy: 82,
}

const PRESETS: { label: string; data: Partial<FacilityInput> }[] = [
  { label: 'Small Market', data: { avgRent: 95, avgStayMonths: 14, monthlyAdSpend: 1500, cpl: 18, leadToTourRate: 25, tourToMoveInRate: 40, totalUnits: 120, currentOccupancy: 78 } },
  { label: 'Mid Market', data: { avgRent: 130, avgStayMonths: 13, monthlyAdSpend: 3000, cpl: 30, leadToTourRate: 20, tourToMoveInRate: 35, totalUnits: 200, currentOccupancy: 82 } },
  { label: 'Competitive Metro', data: { avgRent: 165, avgStayMonths: 11, monthlyAdSpend: 5000, cpl: 55, leadToTourRate: 15, tourToMoveInRate: 28, totalUnits: 350, currentOccupancy: 88 } },
]

/** Clamp a number to safe positive range, returning fallback on NaN/negative */
function safe(val: number, fallback: number, min = 0): number {
  if (!Number.isFinite(val) || val < min) return fallback
  return val
}

function calcMetrics(f: FacilityInput) {
  const rent = safe(f.avgRent, 0, 0)
  const stay = safe(f.avgStayMonths, 0, 0)
  const spend = safe(f.monthlyAdSpend, 0, 0)
  const cpl = safe(f.cpl, 1, 1) // never 0 — prevents Infinity
  const l2t = safe(f.leadToTourRate, 0, 0)
  const t2m = safe(f.tourToMoveInRate, 0, 0)

  const ltv = rent * stay
  const leadsPerMonth = spend / cpl
  const toursPerMonth = leadsPerMonth * (l2t / 100)
  const moveInsPerMonth = toursPerMonth * (t2m / 100)
  const cac = moveInsPerMonth > 0 ? spend / moveInsPerMonth : 0
  const ltvCacRatio = cac > 0 ? ltv / cac : 0
  const monthlyRevenueFromAds = moveInsPerMonth * rent
  const annualRevenueFromAds = monthlyRevenueFromAds * 12
  const monthlyROAS = spend > 0 ? monthlyRevenueFromAds / spend : 0
  const paybackMonths = cac > 0 && rent > 0 ? cac / rent : 0

  // Occupancy
  const totalUnits = safe(f.totalUnits, 1, 1)
  const occupancy = safe(f.currentOccupancy, 0, 0)
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100))
  const monthsToFill = moveInsPerMonth > 0 && vacantUnits > 0 ? vacantUnits / moveInsPerMonth : 0
  const projectedOccupancy = Math.min(100, occupancy + (moveInsPerMonth / totalUnits) * 100)

  return {
    ltv, leadsPerMonth, toursPerMonth, moveInsPerMonth,
    cac, ltvCacRatio, monthlyRevenueFromAds, annualRevenueFromAds,
    monthlyROAS, paybackMonths,
    vacantUnits, monthsToFill, projectedOccupancy,
  }
}

function getRatioHealth(ratio: number): { label: string; color: string; icon: typeof CheckCircle2; message: string } {
  if (ratio >= 5) return { label: 'Excellent', color: 'emerald', icon: CheckCircle2, message: 'Strong unit economics — scaling will be highly profitable.' }
  if (ratio >= 3) return { label: 'Healthy', color: 'green', icon: TrendingUp, message: 'Good ratio. Room to scale ad spend confidently.' }
  if (ratio >= 2) return { label: 'Marginal', color: 'amber', icon: AlertTriangle, message: 'Workable, but optimize landing pages and follow-up to improve.' }
  return { label: 'Unprofitable', color: 'red', icon: AlertTriangle, message: 'CAC too high relative to LTV. Fix conversion rates or reduce CPL before scaling.' }
}

/** Calculate break-even: max ad spend where LTV:CAC (all-in) still >= target ratio */
function calcBreakEven(f: FacilityInput, mgmtFee: number, targetRatio = 3): number {
  const rent = safe(f.avgRent, 0, 0)
  const stay = safe(f.avgStayMonths, 0, 0)
  const cpl = safe(f.cpl, 1, 1)
  const l2t = safe(f.leadToTourRate, 0, 0) / 100
  const t2m = safe(f.tourToMoveInRate, 0, 0) / 100
  const ltv = rent * stay
  const convRate = l2t * t2m
  if (convRate <= 0 || cpl <= 0) return 0
  // LTV / ((spend + fee) / (spend / cpl * convRate)) >= targetRatio
  // LTV * spend * convRate / (cpl * (spend + fee)) >= targetRatio
  // LTV * convRate * spend >= targetRatio * cpl * (spend + fee)
  // spend * (LTV * convRate - targetRatio * cpl) >= targetRatio * cpl * fee
  const lhs = ltv * convRate - targetRatio * cpl
  if (lhs <= 0) return 0 // can never reach target ratio
  return Math.round((targetRatio * cpl * mgmtFee) / lhs)
}

function InputField({ label, value, onChange, prefix, suffix, min, max, step, hint, darkMode }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string
  min?: number; max?: number; step?: number; hint?: string; darkMode: boolean
}) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</label>
      <div className="relative">
        {prefix && <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') return // don't update on empty — prevents NaN
            const n = Number(raw)
            if (!Number.isFinite(n)) return
            onChange(min !== undefined ? Math.max(min, n) : n)
          }}
          min={min} max={max} step={step ?? 1}
          className={`w-full rounded-lg border text-sm py-2 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-12' : 'pr-3'} ${
            darkMode
              ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
              : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
          } outline-none transition-colors`}
        />
        {suffix && <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{suffix}</span>}
      </div>
      {hint && <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{hint}</p>}
    </div>
  )
}

export default function UnitEconomicsView({ adminKey: _adminKey, darkMode }: Props) {
  const [facility, setFacility] = useState<FacilityInput>({ ...DEFAULT_FACILITY })
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [showValue, setShowValue] = useState(false)
  const [showSensitivity, setShowSensitivity] = useState(false)
  const [selectedTierId, setSelectedTierId] = useState<string>('launch')
  const [contractTerm, setContractTerm] = useState<ContractTermId>('monthly')

  const update = (partial: Partial<FacilityInput>) => setFacility(prev => ({ ...prev, ...partial }))

  const selectedPricingTier = PRICING_TIERS.find(t => t.id === selectedTierId) || PRICING_TIERS[0]
  const baseFee = selectedPricingTier.managementFee
  const managementFee = useMemo(() => getDiscountedFee(baseFee, contractTerm), [baseFee, contractTerm])
  const selectedTerm = CONTRACT_TERMS.find(t => t.id === contractTerm)!
  const monthlySavings = baseFee - managementFee

  const m = useMemo(() => calcMetrics(facility), [facility])
  const health = useMemo(() => getRatioHealth(m.ltvCacRatio), [m.ltvCacRatio])

  const totalMonthlyInvestment = facility.monthlyAdSpend + managementFee
  const totalCac = m.moveInsPerMonth > 0 ? totalMonthlyInvestment / m.moveInsPerMonth : 0
  const totalLtvCac = totalCac > 0 ? m.ltv / totalCac : 0
  const totalHealth = getRatioHealth(totalLtvCac)

  // Break-even ad spend
  const breakEvenSpend = useMemo(() => calcBreakEven(facility, managementFee, 3), [facility, managementFee])

  // Sensitivity scenarios
  const sensitivity = useMemo(() => {
    const scenarios = [
      { label: 'CPL +25%', data: { ...facility, cpl: facility.cpl * 1.25 } },
      { label: 'CPL -25%', data: { ...facility, cpl: facility.cpl * 0.75 } },
      { label: 'Lead→Tour +5pp', data: { ...facility, leadToTourRate: Math.min(100, facility.leadToTourRate + 5) } },
      { label: 'Lead→Tour -5pp', data: { ...facility, leadToTourRate: Math.max(1, facility.leadToTourRate - 5) } },
      { label: 'Tour→MI +10pp', data: { ...facility, tourToMoveInRate: Math.min(100, facility.tourToMoveInRate + 10) } },
      { label: 'Ad Spend 2x', data: { ...facility, monthlyAdSpend: facility.monthlyAdSpend * 2 } },
    ]
    return scenarios.map(s => {
      const sm = calcMetrics(s.data)
      const sTotalInvestment = s.data.monthlyAdSpend + managementFee
      const sTotalCac = sm.moveInsPerMonth > 0 ? sTotalInvestment / sm.moveInsPerMonth : 0
      const sTotalLtvCac = sTotalCac > 0 ? sm.ltv / sTotalCac : 0
      return {
        label: s.label,
        moveIns: sm.moveInsPerMonth,
        cac: sm.cac,
        ltvCac: sTotalLtvCac,
        health: getRatioHealth(sTotalLtvCac),
        delta: totalLtvCac > 0 ? ((sTotalLtvCac - totalLtvCac) / totalLtvCac) * 100 : 0,
      }
    })
  }, [facility, managementFee, totalLtvCac])

  // Annual P&L
  const annualPL = useMemo(() => {
    const months = selectedTerm.months
    const totalAdSpend = facility.monthlyAdSpend * months
    const totalFees = managementFee * months
    const totalCost = totalAdSpend + totalFees
    const totalMoveIns = m.moveInsPerMonth * months
    const revenueFirstYear = m.monthlyRevenueFromAds * months
    const revenueLTV = totalMoveIns * m.ltv
    const netFirstYear = revenueFirstYear - totalCost
    const netLTV = revenueLTV - totalCost
    const roiFirstYear = totalCost > 0 ? (netFirstYear / totalCost) * 100 : 0
    const roiLTV = totalCost > 0 ? (netLTV / totalCost) * 100 : 0
    return { months, totalAdSpend, totalFees, totalCost, totalMoveIns, revenueFirstYear, revenueLTV, netFirstYear, netLTV, roiFirstYear, roiLTV }
  }, [facility, managementFee, m, selectedTerm])

  // Tier recommendation
  const recommendedTier = useMemo(() => {
    const spend = facility.monthlyAdSpend
    for (let i = PRICING_TIERS.length - 1; i >= 0; i--) {
      const tier = PRICING_TIERS[i]
      if (spend >= tier.monthlyAdMin) return tier
    }
    return PRICING_TIERS[0]
  }, [facility.monthlyAdSpend])

  const pureProfit = Math.max(0, facility.avgStayMonths - m.paybackMonths)

  // StowStack value metrics
  const ltvPerFeeDollar = managementFee > 0 && m.moveInsPerMonth > 0
    ? (m.moveInsPerMonth * m.ltv) / managementFee : 0
  const feeAsPercentOfRevenue = m.monthlyRevenueFromAds > 0
    ? (managementFee / m.monthlyRevenueFromAds) * 100 : 0
  const feeAsPercentOfInvestment = totalMonthlyInvestment > 0
    ? (managementFee / totalMonthlyInvestment) * 100 : 0
  const revenuePerFeeDollar = managementFee > 0 && m.monthlyRevenueFromAds > 0
    ? m.monthlyRevenueFromAds / managementFee : 0

  const cardBase = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const textPrimary = darkMode ? 'text-white' : 'text-slate-900'
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600'
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-lg font-bold ${textPrimary}`}>Unit Economics Calculator</h1>
          <p className={`text-sm ${textSecondary}`}>Project LTV:CAC and ROI for any facility — use real data or estimates</p>
        </div>
        <div className="flex gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => update(p.data)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                darkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
          <Calculator className="w-4 h-4 text-emerald-500" />
          Facility Inputs
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InputField label="Avg Monthly Rent" value={facility.avgRent} onChange={v => update({ avgRent: v })} prefix="$" min={1} max={500} darkMode={darkMode} hint="Per unit" />
          <InputField label="Avg Length of Stay" value={facility.avgStayMonths} onChange={v => update({ avgStayMonths: v })} suffix="months" min={1} max={60} darkMode={darkMode} hint="Typical: 12-14 mo" />
          <InputField label="Monthly Ad Spend" value={facility.monthlyAdSpend} onChange={v => update({ monthlyAdSpend: v })} prefix="$" min={0} step={250} darkMode={darkMode} hint="Meta + Google combined" />
          <InputField label="Cost Per Lead" value={facility.cpl} onChange={v => update({ cpl: v })} prefix="$" min={1} max={200} darkMode={darkMode} hint="Meta avg: $15-40" />
          <InputField label="Lead → Tour Rate" value={facility.leadToTourRate} onChange={v => update({ leadToTourRate: v })} suffix="%" min={1} max={100} darkMode={darkMode} hint="Typical: 15-25%" />
          <InputField label="Tour → Move-in Rate" value={facility.tourToMoveInRate} onChange={v => update({ tourToMoveInRate: v })} suffix="%" min={1} max={100} darkMode={darkMode} hint="Typical: 30-50%" />
          <InputField label="Total Units" value={facility.totalUnits} onChange={v => update({ totalUnits: v })} min={1} max={2000} darkMode={darkMode} hint="Facility capacity" />
          <InputField label="Current Occupancy" value={facility.currentOccupancy} onChange={v => update({ currentOccupancy: v })} suffix="%" min={0} max={100} darkMode={darkMode} hint="Before ads" />
        </div>

        {/* Tier + Contract Term */}
        <div className="mt-5 pt-4 border-t border-dashed space-y-4" style={{ borderColor: darkMode ? 'rgba(100,116,139,0.3)' : 'rgba(203,213,225,0.8)' }}>

          {/* Tier Selector */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>StowStack Tier</label>
            <div className="grid grid-cols-3 gap-3">
              {PRICING_TIERS.map(tier => {
                const isActive = selectedTierId === tier.id
                const tierMeta = {
                  launch:    { badge: 'Bronze', emoji: '🥉', tagline: 'Get started' },
                  growth:    { badge: 'Gold',   emoji: '🥇', tagline: 'Most popular' },
                  portfolio: { badge: 'Diamond', emoji: '💎', tagline: 'Scale everything' },
                }[tier.id] || { badge: tier.name, emoji: '', tagline: '' }
                const activeColor = {
                  launch:    { border: 'border-emerald-500', bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50', text: darkMode ? 'text-emerald-400' : 'text-emerald-700' },
                  growth:    { border: 'border-amber-500', bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50', text: darkMode ? 'text-amber-400' : 'text-amber-700' },
                  portfolio: { border: 'border-purple-500', bg: darkMode ? 'bg-purple-500/10' : 'bg-purple-50', text: darkMode ? 'text-purple-400' : 'text-purple-700' },
                }[tier.id] || { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' }
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      isActive
                        ? `${activeColor.border} ${activeColor.bg}`
                        : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="text-sm">{tierMeta.emoji}</span>
                      <span className={`text-sm font-semibold ${isActive ? activeColor.text : (darkMode ? 'text-white' : 'text-slate-900')}`}>
                        {tier.name}
                      </span>
                    </div>
                    <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      ${tier.managementFee.toLocaleString()}<span className={`text-xs font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/mo</span>
                    </p>
                    <p className={`text-[10px] mt-1 ${isActive ? activeColor.text : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>{tierMeta.tagline}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contract Term Selector */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Contract Term</label>
            <div className="grid grid-cols-3 gap-3">
              {CONTRACT_TERMS.map(term => {
                const isActive = contractTerm === term.id
                const discounted = getDiscountedFee(baseFee, term.id)
                const termMeta = {
                  monthly: { emoji: '📋', tagline: 'No commitment' },
                  '6mo':   { emoji: '⚡', tagline: 'Best balance' },
                  '12mo':  { emoji: '🔒', tagline: 'Maximum savings' },
                }[term.id] || { emoji: '', tagline: '' }
                return (
                  <button
                    key={term.id}
                    onClick={() => setContractTerm(term.id)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      isActive
                        ? (darkMode ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50')
                        : (darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="text-sm">{termMeta.emoji}</span>
                      <span className={`text-sm font-semibold ${isActive ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-white' : 'text-slate-900')}`}>
                        {term.label}
                      </span>
                      {term.discountPct > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                        }`}>
                          -{term.discountPct}%
                        </span>
                      )}
                    </div>
                    <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      ${discounted.toLocaleString()}<span className={`text-xs font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/mo</span>
                    </p>
                    <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{termMeta.tagline}</p>
                  </button>
                )
              })}
            </div>
            {monthlySavings > 0 && (
              <p className={`text-xs mt-2 text-center ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Saving ${monthlySavings.toLocaleString()}/mo (${(monthlySavings * selectedTerm.months).toLocaleString()} over {selectedTerm.months} months)
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Big Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Lifetime Value"
          value={`$${m.ltv.toLocaleString()}`}
          subtitle={`$${facility.avgRent}/mo × ${facility.avgStayMonths} mo`}
          icon={DollarSign}
          color="emerald"
          darkMode={darkMode}
        />
        <MetricCard
          label="Customer Acq. Cost"
          value={`$${Math.round(m.cac).toLocaleString()}`}
          subtitle="Ad spend only"
          icon={Target}
          color="blue"
          darkMode={darkMode}
        />
        <MetricCard
          label="LTV:CAC (Ads Only)"
          value={`${m.ltvCacRatio.toFixed(1)}:1`}
          subtitle={health.label}
          icon={health.icon}
          color={health.color}
          darkMode={darkMode}
        />
        <MetricCard
          label="LTV:CAC (All-In)"
          value={`${totalLtvCac.toFixed(1)}:1`}
          subtitle={`Incl. $${managementFee} StowStack fee`}
          icon={totalHealth.icon}
          color={totalHealth.color}
          darkMode={darkMode}
        />
      </div>

      {/* Verdict Banner */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${
        totalHealth.color === 'emerald' ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200') :
        totalHealth.color === 'green' ? (darkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200') :
        totalHealth.color === 'amber' ? (darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200') :
        (darkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200')
      }`}>
        <totalHealth.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          totalHealth.color === 'emerald' ? 'text-emerald-500' :
          totalHealth.color === 'green' ? 'text-green-500' :
          totalHealth.color === 'amber' ? 'text-amber-500' : 'text-red-500'
        }`} />
        <div>
          <p className={`text-sm font-semibold ${textPrimary}`}>
            {totalHealth.label} — All-in LTV:CAC of {totalLtvCac.toFixed(1)}:1
          </p>
          <p className={`text-sm mt-0.5 ${textSecondary}`}>{totalHealth.message}</p>
          <p className={`text-xs mt-1 ${textMuted}`}>
            For every $1 this client spends (ads + your fee), they get ${(totalLtvCac).toFixed(2)} in tenant revenue.
          </p>
        </div>
      </div>

      {/* StowStack Value */}
      <div className={`rounded-xl border ${darkMode ? 'border-emerald-500/20' : 'border-emerald-200'}`}>
        <button
          onClick={() => setShowValue(!showValue)}
          className={`w-full flex items-center justify-between p-4 text-left ${textPrimary}`}
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            StowStack Value Breakdown
            <span className={`text-xs font-normal ${textMuted}`}>— ${ltvPerFeeDollar.toFixed(2)} LTV per $1 fee</span>
          </span>
          {showValue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showValue && (
          <div className={`px-4 pb-4 ${darkMode ? 'bg-gradient-to-br from-emerald-500/5 to-transparent' : 'bg-gradient-to-br from-emerald-50/50 to-transparent'}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-800/60' : 'bg-white/80'}`}>
                <p className={`text-xs ${textSecondary}`}>LTV per $1 Fee</p>
                <p className="text-2xl font-bold mt-0.5 text-emerald-500">${ltvPerFeeDollar.toFixed(2)}</p>
                <p className={`text-[10px] ${textMuted}`}>Lifetime revenue generated per dollar you charge</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-800/60' : 'bg-white/80'}`}>
                <p className={`text-xs ${textSecondary}`}>Monthly Revenue per $1 Fee</p>
                <p className="text-2xl font-bold mt-0.5 text-emerald-500">${revenuePerFeeDollar.toFixed(2)}</p>
                <p className={`text-[10px] ${textMuted}`}>First-month rent from ads / your fee</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-800/60' : 'bg-white/80'}`}>
                <p className={`text-xs ${textSecondary}`}>Fee as % of Revenue</p>
                <p className={`text-2xl font-bold mt-0.5 ${feeAsPercentOfRevenue < 50 ? 'text-emerald-500' : (darkMode ? 'text-amber-400' : 'text-amber-600')}`}>{feeAsPercentOfRevenue.toFixed(1)}%</p>
                <p className={`text-[10px] ${textMuted}`}>Your fee / monthly ad-driven rent revenue</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-800/60' : 'bg-white/80'}`}>
                <p className={`text-xs ${textSecondary}`}>Fee Share of Total Spend</p>
                <p className={`text-2xl font-bold mt-0.5 ${feeAsPercentOfInvestment < 30 ? 'text-emerald-500' : (darkMode ? 'text-amber-400' : 'text-amber-600')}`}>{feeAsPercentOfInvestment.toFixed(0)}%</p>
                <p className={`text-[10px] ${textMuted}`}>{(100 - feeAsPercentOfInvestment).toFixed(0)}% goes directly to ads</p>
              </div>
            </div>
            <div className={`mt-3 rounded-lg p-3 ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <p className={`text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                <strong>The pitch:</strong> For every <strong>$1</strong> you pay StowStack, your facility gets <strong>${ltvPerFeeDollar.toFixed(2)}</strong> in tenant lifetime revenue.
                {feeAsPercentOfInvestment < 30 && <> Only <strong>{feeAsPercentOfInvestment.toFixed(0)}%</strong> of your total investment is our fee — the rest goes straight to running your ads.</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Occupancy Impact */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
          <Building2 className="w-4 h-4 text-blue-500" />
          Occupancy Impact
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FunnelStep label="Vacant Units" value={`${m.vacantUnits}`} sub={`${facility.totalUnits} total at ${facility.currentOccupancy}%`} darkMode={darkMode} />
          <FunnelStep label="New Move-ins/mo" value={m.moveInsPerMonth.toFixed(1)} sub="From ad campaigns" darkMode={darkMode} />
          <FunnelStep
            label="Months to Fill"
            value={m.monthsToFill > 0 ? `${m.monthsToFill.toFixed(1)}` : '—'}
            sub={m.vacantUnits === 0 ? 'Already full' : 'To reach 100% occupancy'}
            darkMode={darkMode}
          />
          <FunnelStep
            label="Projected Occupancy"
            value={`${m.projectedOccupancy.toFixed(1)}%`}
            sub="After 1 month of ads"
            darkMode={darkMode}
          />
        </div>
        {m.vacantUnits > 0 && m.moveInsPerMonth > 0 && (
          <div className={`mt-3 rounded-lg p-3 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs ${textSecondary}`}>Fill progress (1 month)</span>
              <span className={`text-xs font-medium ${textPrimary}`}>{Math.min(100, (m.moveInsPerMonth / m.vacantUnits * 100)).toFixed(0)}%</span>
            </div>
            <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, m.moveInsPerMonth / m.vacantUnits * 100)}%` }}
              />
            </div>
            <p className={`text-[10px] mt-1 ${textMuted}`}>
              {m.moveInsPerMonth.toFixed(1)} of {m.vacantUnits} vacant units filled per month via paid ads
            </p>
          </div>
        )}
      </div>

      {/* Funnel Breakdown */}
      <div className={`rounded-xl border ${cardBase}`}>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-between p-4 text-left ${textPrimary}`}
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Monthly Funnel Breakdown
          </span>
          {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showBreakdown && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <FunnelStep label="Ad Spend" value={`$${facility.monthlyAdSpend.toLocaleString()}`} sub="Monthly budget" darkMode={darkMode} />
              <FunnelStep label="Leads Generated" value={m.leadsPerMonth.toFixed(1)} sub={`@ $${facility.cpl} CPL`} darkMode={darkMode} />
              <FunnelStep label="Tours Booked" value={m.toursPerMonth.toFixed(1)} sub={`${facility.leadToTourRate}% conversion`} darkMode={darkMode} />
              <FunnelStep label="Move-ins" value={m.moveInsPerMonth.toFixed(1)} sub={`${facility.tourToMoveInRate}% close rate`} darkMode={darkMode} />
              <FunnelStep label="Monthly Revenue (from ads)" value={`$${Math.round(m.monthlyRevenueFromAds).toLocaleString()}`} sub={`${m.moveInsPerMonth.toFixed(1)} units × $${facility.avgRent}`} darkMode={darkMode} />
              <FunnelStep label="Annualized Revenue" value={`$${Math.round(m.annualRevenueFromAds).toLocaleString()}`} sub="From this month's move-ins" darkMode={darkMode} />
              <FunnelStep label="Monthly ROAS" value={`${m.monthlyROAS.toFixed(1)}x`} sub="First-month rent / ad spend" darkMode={darkMode} />
              <FunnelStep label="CAC Payback" value={`${m.paybackMonths.toFixed(1)} months`} sub="Months to recoup acquisition cost" darkMode={darkMode} />
              <FunnelStep label="Total Client Investment" value={`$${totalMonthlyInvestment.toLocaleString()}/mo`} sub={`$${facility.monthlyAdSpend.toLocaleString()} ads + $${managementFee} fee`} darkMode={darkMode} />
            </div>
          </div>
        )}
      </div>

      {/* Annual P&L Projection */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
          <PieChart className="w-4 h-4 text-purple-500" />
          {selectedTerm.label} P&L Projection
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <FunnelStep label="Total Ad Spend" value={`$${annualPL.totalAdSpend.toLocaleString()}`} sub={`${annualPL.months} months`} darkMode={darkMode} />
          <FunnelStep label="Total StowStack Fees" value={`$${annualPL.totalFees.toLocaleString()}`} sub={`$${managementFee}/mo × ${annualPL.months}`} darkMode={darkMode} />
          <FunnelStep label="Total Move-ins" value={annualPL.totalMoveIns.toFixed(0)} sub={`${m.moveInsPerMonth.toFixed(1)}/mo × ${annualPL.months}`} darkMode={darkMode} />
          <FunnelStep label="Total Investment" value={`$${annualPL.totalCost.toLocaleString()}`} sub="Ads + fees" darkMode={darkMode} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 border ${
            annualPL.netFirstYear >= 0
              ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
              : (darkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200')
          }`}>
            <p className={`text-xs ${textSecondary}`}>Net Revenue (Rent During Term)</p>
            <p className={`text-xl font-bold mt-0.5 ${annualPL.netFirstYear >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>
              {annualPL.netFirstYear >= 0 ? '+' : ''}${Math.round(annualPL.netFirstYear).toLocaleString()}
            </p>
            <p className={`text-[10px] mt-0.5 ${textMuted}`}>ROI: {annualPL.roiFirstYear.toFixed(0)}% (rent collected during {annualPL.months}-mo term only)</p>
          </div>
          <div className={`rounded-lg p-3 border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className={`text-xs ${textSecondary}`}>Net Revenue (Full LTV)</p>
            <p className={`text-xl font-bold mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              +${Math.round(annualPL.netLTV).toLocaleString()}
            </p>
            <p className={`text-[10px] mt-0.5 ${textMuted}`}>ROI: {annualPL.roiLTV.toFixed(0)}% (full tenant lifetime value)</p>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className={`rounded-xl border ${cardBase}`}>
        <button
          onClick={() => setShowSensitivity(!showSensitivity)}
          className={`w-full flex items-center justify-between p-4 text-left ${textPrimary}`}
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
            Sensitivity Analysis
          </span>
          {showSensitivity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showSensitivity && (
          <div className="px-4 pb-4">
            <p className={`text-xs mb-3 ${textMuted}`}>How LTV:CAC changes if one variable shifts — everything else stays the same.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <th className={`text-left py-2 pr-4 font-medium ${textSecondary}`}>Scenario</th>
                    <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>Move-ins/mo</th>
                    <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>CAC</th>
                    <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>LTV:CAC</th>
                    <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>vs Current</th>
                    <th className={`text-right py-2 pl-3 font-medium ${textSecondary}`}>Health</th>
                  </tr>
                </thead>
                <tbody className={textPrimary}>
                  <tr className={`border-b font-medium ${darkMode ? 'border-slate-700/50 bg-slate-700/20' : 'border-slate-100 bg-slate-50'}`}>
                    <td className={`py-2 pr-4 ${textPrimary}`}>Current</td>
                    <td className="py-2 px-3 text-right">{m.moveInsPerMonth.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right">${Math.round(m.cac)}</td>
                    <td className="py-2 px-3 text-right">{totalLtvCac.toFixed(1)}:1</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 pl-3 text-right">{totalHealth.label}</td>
                  </tr>
                  {sensitivity.map(s => (
                    <tr key={s.label} className={`border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                      <td className={`py-2 pr-4 ${textSecondary}`}>{s.label}</td>
                      <td className="py-2 px-3 text-right">{s.moveIns.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">${Math.round(s.cac)}</td>
                      <td className="py-2 px-3 text-right">{s.ltvCac.toFixed(1)}:1</td>
                      <td className={`py-2 px-3 text-right flex items-center justify-end gap-1 ${
                        s.delta > 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') :
                        s.delta < 0 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''
                      }`}>
                        {s.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : s.delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {s.delta > 0 ? '+' : ''}{s.delta.toFixed(0)}%
                      </td>
                      <td className={`py-2 pl-3 text-right text-xs ${
                        s.health.color === 'emerald' || s.health.color === 'green' ? (darkMode ? 'text-green-400' : 'text-green-600') :
                        s.health.color === 'amber' ? (darkMode ? 'text-amber-400' : 'text-amber-600') :
                        (darkMode ? 'text-red-400' : 'text-red-600')
                      }`}>{s.health.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {breakEvenSpend > 0 && (
              <div className={`mt-3 rounded-lg p-3 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium ${textPrimary}`}>
                  Break-even ad spend: <span className="text-emerald-500">${breakEvenSpend.toLocaleString()}/mo</span>
                </p>
                <p className={`text-[10px] ${textMuted}`}>
                  Maximum monthly ad budget before LTV:CAC drops below 3:1 (including StowStack fee).
                  {facility.monthlyAdSpend < breakEvenSpend
                    ? ` Client has $${(breakEvenSpend - facility.monthlyAdSpend).toLocaleString()}/mo of headroom to scale.`
                    : ' Currently above break-even — consider lowering spend or improving conversion rates.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tier Recommendation */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Recommended Tier
        </h2>
        <div className="flex items-center gap-4">
          <div className={`rounded-lg px-4 py-3 border ${
            recommendedTier.color === 'emerald' ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200') :
            recommendedTier.color === 'blue' ? (darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') :
            (darkMode ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200')
          }`}>
            <p className={`text-lg font-bold ${textPrimary}`}>{recommendedTier.name}</p>
            <p className={`text-xs ${textMuted}`}>${getDiscountedFee(recommendedTier.managementFee, contractTerm).toLocaleString()}/mo{monthlySavings > 0 ? ` (${selectedTerm.label})` : ''}</p>
          </div>
          <div className={`text-sm ${textSecondary}`}>
            <p>Based on <strong className={textPrimary}>${facility.monthlyAdSpend.toLocaleString()}/mo</strong> ad budget.</p>
            <p className={`text-xs mt-1 ${textMuted}`}>
              {recommendedTier.id === 'launch' && 'Ad budget fits Launch tier range ($1,500-$3,000/mo). Good for single-facility operators getting started.'}
              {recommendedTier.id === 'growth' && 'Ad budget fits Growth tier range ($3,000-$7,500/mo). Unlocks full attribution, call tracking, and A/B testing.'}
              {recommendedTier.id === 'portfolio' && 'Ad budget fits Portfolio tier range ($5,000-$25,000/mo). Best for multi-facility operators who need scaled ops.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Pitch Helper */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
          <Zap className="w-4 h-4 text-amber-500" />
          Sales Pitch Summary
        </h2>
        <div className={`text-sm space-y-2 ${textSecondary}`}>
          <p>
            With <strong className={textPrimary}>${facility.monthlyAdSpend.toLocaleString()}/mo</strong> in ad spend,
            this facility can expect roughly <strong className={textPrimary}>{m.moveInsPerMonth.toFixed(1)} new move-ins/mo</strong> at
            a <strong className={textPrimary}>${Math.round(m.cac)} CAC</strong>.
          </p>
          <p>
            Each move-in is worth <strong className={textPrimary}>${m.ltv.toLocaleString()} in lifetime revenue</strong>,
            meaning every <strong className={textPrimary}>$1 spent on ads returns ${m.ltvCacRatio.toFixed(2)}</strong> in tenant revenue.
          </p>
          <p>
            Including the <strong className={textPrimary}>${managementFee}/mo StowStack fee{monthlySavings > 0 ? ` (${selectedTerm.label} contract, ${selectedTerm.discountPct}% off)` : ''}</strong>,
            the all-in return is <strong className={textPrimary}>${totalLtvCac.toFixed(2)} for every $1 invested</strong>.
            CAC pays back in <strong className={textPrimary}>{m.paybackMonths.toFixed(1)} months</strong>,
            with <strong className={textPrimary}>{pureProfit.toFixed(1)} months of pure profit</strong> after that.
          </p>
          {m.vacantUnits > 0 && m.moveInsPerMonth > 0 && (
            <p>
              This facility has <strong className={textPrimary}>{m.vacantUnits} vacant units</strong>.
              At the current pace, ads will fill them in <strong className={textPrimary}>{m.monthsToFill.toFixed(1)} months</strong>,
              pushing occupancy from <strong className={textPrimary}>{facility.currentOccupancy}%</strong> toward full capacity.
            </p>
          )}
        </div>
      </div>

      {/* Benchmarks Reference */}
      <div className={`rounded-xl border p-5 ${cardBase}`}>
        <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
          <Info className="w-4 h-4 text-blue-500" />
          Self-Storage Meta Ads Benchmarks
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-2 pr-4 font-medium ${textSecondary}`}>Metric</th>
                <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>Low Market</th>
                <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>Average</th>
                <th className={`text-right py-2 px-3 font-medium ${textSecondary}`}>Competitive</th>
              </tr>
            </thead>
            <tbody className={textPrimary}>
              {[
                ['CPM', '$8-12', '$15-20', '$25-35'],
                ['CPC', '$1-3', '$3-5', '$6-10'],
                ['CPL', '$10-20', '$25-40', '$50-80'],
                ['Lead → Tour', '25-35%', '15-20%', '10-15%'],
                ['Tour → Move-in', '40-60%', '30-40%', '20-30%'],
                ['CAC', '$50-80', '$100-175', '$200-400'],
                ['LTV:CAC', '15-25:1', '8-14:1', '3-7:1'],
              ].map(([metric, low, avg, high]) => (
                <tr key={metric} className={`border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <td className={`py-2 pr-4 ${textSecondary}`}>{metric}</td>
                  <td className="py-2 px-3 text-right">{low}</td>
                  <td className="py-2 px-3 text-right">{avg}</td>
                  <td className="py-2 px-3 text-right">{high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function MetricCard({ label, value, subtitle, icon: Icon, color, darkMode }: {
  label: string; value: string; subtitle: string; icon: typeof DollarSign; color: string; darkMode: boolean
}) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    emerald: { bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50', icon: 'text-emerald-500', border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200' },
    blue:    { bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50', icon: 'text-blue-500', border: darkMode ? 'border-blue-500/20' : 'border-blue-200' },
    green:   { bg: darkMode ? 'bg-green-500/10' : 'bg-green-50', icon: 'text-green-500', border: darkMode ? 'border-green-500/20' : 'border-green-200' },
    amber:   { bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50', icon: 'text-amber-500', border: darkMode ? 'border-amber-500/20' : 'border-amber-200' },
    red:     { bg: darkMode ? 'bg-red-500/10' : 'bg-red-50', icon: 'text-red-500', border: darkMode ? 'border-red-500/20' : 'border-red-200' },
  }
  const c = colorMap[color] || colorMap.emerald
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>
    </div>
  )
}

function FunnelStep({ label, value, sub, darkMode }: { label: string; value: string; sub: string; darkMode: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>
    </div>
  )
}
