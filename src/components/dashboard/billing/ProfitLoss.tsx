import {
  FileSpreadsheet, FileText, ArrowUpRight, ArrowDownRight,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import type { PLData, PLLineItem, FinancialMetrics, ClientAccount } from './BillingConstants'

interface ProfitLossProps {
  plData: PLData
  metrics: FinancialMetrics
  clients: ClientAccount[]
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function ProfitLoss({ plData, metrics, clients, card, muted, subtle, c }: ProfitLossProps) {
  const totalRevenue = plData.revenue.reduce((s, r) => s + r.amount, 0)
  const prevTotalRevenue = plData.revenue.reduce((s, r) => s + r.prevAmount, 0)
  const totalCOGS = plData.cogs.reduce((s, r) => s + r.amount, 0)
  const prevTotalCOGS = plData.cogs.reduce((s, r) => s + r.prevAmount, 0)
  const grossProfit = totalRevenue - totalCOGS
  const prevGrossProfit = prevTotalRevenue - prevTotalCOGS
  const totalOpex = plData.opex.reduce((s, r) => s + r.amount, 0)
  const prevTotalOpex = plData.opex.reduce((s, r) => s + r.prevAmount, 0)
  const netIncome = grossProfit - totalOpex
  const prevNetIncome = prevGrossProfit - prevTotalOpex
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0
  const netMarginPct = totalRevenue > 0 ? (netIncome / totalRevenue * 100) : 0

  const renderPLSection = (title: string, items: PLLineItem[], bgClass: string) => (
    <div className="mb-1">
      <div className={`px-4 py-2 ${bgClass}`}>
        <span className="text-[10px] font-bold uppercase tracking-wide">{title}</span>
      </div>
      {items.map(item => (
        <div key={item.subcategory} className={`px-4 py-2 flex items-center justify-between border-t ${c('border-slate-50', 'border-slate-700/50')}`}>
          <span className={`text-xs pl-4 ${muted}`}>{item.subcategory}</span>
          <div className="flex items-center gap-4">
            <span className={`text-xs w-20 text-right ${subtle}`}>${item.prevAmount.toLocaleString()}</span>
            <span className="text-xs w-20 text-right font-medium">${item.amount.toLocaleString()}</span>
            <span className={`text-[10px] w-16 text-right font-semibold flex items-center justify-end gap-0.5 ${
              item.pctChange > 0 ? (title === 'COGS' || title === 'Operating Expenses' ? 'text-amber-600' : 'text-emerald-600') : item.pctChange < 0 ? 'text-red-500' : muted
            }`}>
              {item.pctChange > 0 ? <ArrowUp size={9} /> : item.pctChange < 0 ? <ArrowDown size={9} /> : <Minus size={9} />}
              {Math.abs(item.pctChange).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* P&L KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `$${totalRevenue.toLocaleString()}`, prev: `$${prevTotalRevenue.toLocaleString()} prev`, color: 'text-emerald-600', trend: totalRevenue > prevTotalRevenue },
          { label: 'Gross Profit', value: `$${grossProfit.toLocaleString()}`, prev: `${grossMarginPct.toFixed(0)}% margin`, color: '', trend: grossProfit > prevGrossProfit },
          { label: 'Operating Expenses', value: `$${totalOpex.toLocaleString()}`, prev: `$${prevTotalOpex.toLocaleString()} prev`, color: 'text-amber-600', trend: totalOpex <= prevTotalOpex },
          { label: 'Net Income', value: `$${netIncome.toLocaleString()}`, prev: `${netMarginPct.toFixed(0)}% net margin`, color: netIncome > 0 ? 'text-emerald-600' : 'text-red-500', trend: netIncome > prevNetIncome },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-start justify-between mb-1">
              <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>{kpi.label}</p>
              {kpi.trend ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-red-400" />}
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className={`text-[10px] mt-0.5 ${subtle}`}>{kpi.prev}</p>
          </div>
        ))}
      </div>

      {/* P&L Statement */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${c('border-slate-200', 'border-slate-700')}`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-blue-600" />
            Profit & Loss Statement — Monthly
          </h3>
          <div className="flex items-center gap-4 text-[10px]">
            <span className={subtle}>Previous</span>
            <span className="font-semibold">Current</span>
            <span className={subtle}>Change</span>
          </div>
        </div>

        {renderPLSection('Revenue', plData.revenue, c('bg-emerald-50/50', 'bg-emerald-900/10'))}

        {/* Revenue Total */}
        <div className={`px-4 py-2.5 flex items-center justify-between border-t-2 ${c('border-slate-200 bg-emerald-50', 'border-slate-600 bg-emerald-900/20')}`}>
          <span className="text-xs font-bold">Total Revenue</span>
          <div className="flex items-center gap-4">
            <span className={`text-xs w-20 text-right ${subtle}`}>${prevTotalRevenue.toLocaleString()}</span>
            <span className="text-xs w-20 text-right font-bold text-emerald-600">${totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] w-16 text-right font-semibold text-emerald-600 flex items-center justify-end gap-0.5">
              <ArrowUp size={9} />{prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {renderPLSection('Cost of Goods Sold', plData.cogs, c('bg-red-50/50', 'bg-red-900/10'))}

        {/* Gross Profit */}
        <div className={`px-4 py-2.5 flex items-center justify-between border-t-2 ${c('border-slate-200 bg-blue-50', 'border-slate-600 bg-blue-900/20')}`}>
          <span className="text-xs font-bold">Gross Profit</span>
          <div className="flex items-center gap-4">
            <span className={`text-xs w-20 text-right ${subtle}`}>${prevGrossProfit.toLocaleString()}</span>
            <span className="text-xs w-20 text-right font-bold">${grossProfit.toLocaleString()}</span>
            <span className={`text-[10px] w-16 text-right font-semibold ${grossProfit > prevGrossProfit ? 'text-emerald-600' : 'text-red-500'} flex items-center justify-end gap-0.5`}>
              {grossProfit > prevGrossProfit ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
              {prevGrossProfit > 0 ? Math.abs((grossProfit - prevGrossProfit) / prevGrossProfit * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {renderPLSection('Operating Expenses', plData.opex, c('bg-amber-50/50', 'bg-amber-900/10'))}

        {/* Net Income */}
        <div className={`px-4 py-3 flex items-center justify-between border-t-2 ${c('border-slate-300 bg-slate-50', 'border-slate-500 bg-slate-700')}`}>
          <span className="text-sm font-bold">Net Income</span>
          <div className="flex items-center gap-4">
            <span className={`text-xs w-20 text-right ${subtle}`}>${prevNetIncome.toLocaleString()}</span>
            <span className={`text-sm w-20 text-right font-bold ${netIncome > 0 ? 'text-emerald-600' : 'text-red-500'}`}>${netIncome.toLocaleString()}</span>
            <span className={`text-[10px] w-16 text-right font-semibold ${netIncome > prevNetIncome ? 'text-emerald-600' : 'text-red-500'} flex items-center justify-end gap-0.5`}>
              {netIncome > prevNetIncome ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
              {prevNetIncome !== 0 ? Math.abs((netIncome - prevNetIncome) / Math.abs(prevNetIncome) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Key Ratios */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3">Key Financial Ratios</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Gross Margin', value: `${grossMarginPct.toFixed(1)}%`, target: '> 60%', ok: grossMarginPct > 60 },
            { label: 'Net Margin', value: `${netMarginPct.toFixed(1)}%`, target: '> 20%', ok: netMarginPct > 20 },
            { label: 'Revenue Growth', value: `${prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(0) : 0}%`, target: '> 10%', ok: totalRevenue > prevTotalRevenue * 1.1 },
            { label: 'OpEx Ratio', value: `${totalRevenue > 0 ? (totalOpex / totalRevenue * 100).toFixed(0) : 0}%`, target: '< 30%', ok: totalOpex / (totalRevenue || 1) < 0.3 },
            { label: 'LTV:CAC', value: `${(metrics.ltv / 2000).toFixed(1)}x`, target: '> 3x', ok: metrics.ltv / 2000 > 3 },
            { label: 'Rule of 40', value: `${(netMarginPct + 18).toFixed(0)}%`, target: '> 40%', ok: netMarginPct + 18 > 40 },
          ].map(r => (
            <div key={r.label} className={`rounded-lg border p-3 text-center ${r.ok ? c('border-emerald-200 bg-emerald-50/50', 'border-emerald-800/50 bg-emerald-900/10') : c('border-slate-100', 'border-slate-700')}`}>
              <p className={`text-lg font-bold ${r.ok ? 'text-emerald-600' : ''}`}>{r.value}</p>
              <p className={`text-[10px] font-medium ${muted}`}>{r.label}</p>
              <p className={`text-[9px] mt-0.5 ${r.ok ? 'text-emerald-600' : subtle}`}>Target: {r.target} {r.ok ? '\u2713' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Prep */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileText size={16} className={muted} />
          Tax & Compliance Prep
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
            <p className="text-xs font-semibold mb-1">1099 Tracking</p>
            <p className={`text-[10px] ${muted}`}>Clients paying &gt;$600/yr need 1099-NEC. Currently {clients.length} client{clients.length !== 1 ? 's' : ''} over threshold.</p>
            <div className="mt-2 space-y-1">
              {clients.slice(0, 3).map(cl => (
                <div key={cl.id} className="flex justify-between text-[10px]">
                  <span>{cl.facilityName}</span>
                  <span className="font-semibold">${cl.totalRevenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
            <p className="text-xs font-semibold mb-1">Sales Tax</p>
            <p className={`text-[10px] ${muted}`}>Management fees are generally taxable as services. Ad spend pass-through may be exempt. Check state-by-state rules.</p>
            <div className="mt-2">
              <p className={`text-[10px] ${subtle}`}>States with clients:</p>
              <p className="text-[10px] font-semibold">{[...new Set(clients.map(cl => cl.location.split(',').pop()?.trim()))].join(', ') || 'None'}</p>
            </div>
          </div>
          <div className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
            <p className="text-xs font-semibold mb-1">Deductible Expenses</p>
            <p className={`text-[10px] ${muted}`}>Track deductible business expenses for tax optimization.</p>
            <div className="mt-2 space-y-1">
              {[
                { label: 'Software & Tools', value: `$${(plData.opex.find(o => o.subcategory.includes('Software'))?.amount || 0) * 12}` },
                { label: 'Conference/Travel', value: `$${(plData.opex.find(o => o.subcategory.includes('Conference'))?.amount || 0) * 12}` },
                { label: 'Home Office', value: '$6,000 (est.)' },
              ].map(d => (
                <div key={d.label} className="flex justify-between text-[10px]">
                  <span className={muted}>{d.label}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
