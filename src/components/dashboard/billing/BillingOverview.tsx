import {
  CircleDollarSign, Wallet, Clock, Banknote, ArrowUpRight,
  BadgeDollarSign, Landmark, CreditCard, Send, CheckCircle2,
  Sparkles, Percent, Users, PiggyBank, RefreshCw, Handshake
} from 'lucide-react'
import type { FinancialMetrics, ClientAccount, Invoice, Referral, BillingSubTab } from './BillingConstants'

interface BillingOverviewProps {
  metrics: FinancialMetrics
  clients: ClientAccount[]
  invoices: Invoice[]
  referrals: Referral[]
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
  setSubTab: (tab: BillingSubTab) => void
}

export default function BillingOverview({ metrics, clients, invoices, referrals, card, muted, subtle, c, setSubTab }: BillingOverviewProps) {
  const revenueBreakdown = [
    { label: 'Management Fees', value: invoices.reduce((s, i) => s + i.managementFee, 0), color: 'bg-emerald-500', pct: 0 },
    { label: 'Ad Spend Markup', value: invoices.reduce((s, i) => s + i.adMarkup, 0), color: 'bg-blue-500', pct: 0 },
    { label: 'Setup Fees', value: clients.length * 750, color: 'bg-purple-500', pct: 0 },
    { label: 'Call Tracking', value: invoices.filter(i => i.items.some(it => it.category === 'call_tracking')).reduce((s, i) => s + i.items.filter(it => it.category === 'call_tracking').reduce((ss, it) => ss + it.total, 0), 0), color: 'bg-amber-500', pct: 0 },
  ]
  const totalRev = revenueBreakdown.reduce((s, r) => s + r.value, 0)
  revenueBreakdown.forEach(r => { r.pct = totalRev > 0 ? (r.value / totalRev) * 100 : 0 })

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Recurring Revenue', value: `$${metrics.mrr.toLocaleString()}`, sub: `$${metrics.arr.toLocaleString()} ARR`, icon: CircleDollarSign, color: 'text-emerald-600', trend: '+18%' },
          { label: 'Ad Spend Under Management', value: `$${metrics.totalAdSpendManaged.toLocaleString()}`, sub: `${clients.length} active accounts`, icon: Wallet, color: 'text-blue-600', trend: '+24%' },
          { label: 'Outstanding A/R', value: `$${metrics.outstandingAR.toLocaleString()}`, sub: `${metrics.dso} day DSO`, icon: Clock, color: metrics.overdueAR > 0 ? 'text-amber-600' : 'text-slate-600', trend: '' },
          { label: 'Ad Spend Float', value: `$${metrics.adSpendFloat.toLocaleString()}`, sub: 'Paid to Meta before client pays us', icon: Banknote, color: 'text-purple-600', trend: '' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex items-start justify-between mb-2">
              <kpi.icon size={18} className={kpi.color} />
              {kpi.trend && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight size={10} />{kpi.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className={`text-[10px] mt-0.5 ${subtle}`}>{kpi.sub}</p>
            <p className={`text-[10px] mt-0.5 uppercase tracking-wide font-medium ${muted}`}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Model Explanation */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <BadgeDollarSign size={16} className="text-emerald-600" />
          Managed Ad Spend Revenue Model
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className={`rounded-lg border p-3 ${c('bg-emerald-50 border-emerald-200', 'bg-emerald-900/20 border-emerald-800')}`}>
            <p className="text-xs font-bold text-emerald-700 mb-1">1. Client Pays Us (Net 30)</p>
            <p className={`text-[11px] ${muted}`}>Single invoice covers ad budget + management fee + markup. Client never touches Meta/Google billing. Simpler for them, more control for us.</p>
          </div>
          <div className={`rounded-lg border p-3 ${c('bg-blue-50 border-blue-200', 'bg-blue-900/20 border-blue-800')}`}>
            <p className="text-xs font-bold text-blue-700 mb-1">2. We Run Their Ads</p>
            <p className={`text-[11px] ${muted}`}>As platform developers we get better CPMs, access to beta features, and consolidated reporting. Better results than client self-managing.</p>
          </div>
          <div className={`rounded-lg border p-3 ${c('bg-purple-50 border-purple-200', 'bg-purple-900/20 border-purple-800')}`}>
            <p className="text-xs font-bold text-purple-700 mb-1">3. Revenue Stacks</p>
            <p className={`text-[11px] ${muted}`}>Management fee + ad markup + setup fees + call tracking + creative services. Each client generates 4-5 revenue streams.</p>
          </div>
        </div>

        {/* Revenue Breakdown Bar */}
        <div className="mb-3">
          <div className="flex h-3 rounded-full overflow-hidden mb-2">
            {revenueBreakdown.map(r => (
              <div key={r.label} className={`${r.color} transition-all`} style={{ width: `${r.pct}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {revenueBreakdown.map(r => (
              <div key={r.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${r.color}`} />
                <span className={`text-[10px] ${muted}`}>{r.label}: <strong>${r.value.toLocaleString()}</strong> ({r.pct.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Margin', value: `${metrics.grossMargin}%`, icon: Percent },
          { label: 'Avg Revenue / Client', value: `$${Math.round(metrics.avgRevenuePerClient).toLocaleString()}/mo`, icon: Users },
          { label: 'Client LTV (18mo)', value: `$${metrics.ltv.toLocaleString()}`, icon: PiggyBank },
          { label: 'Net Revenue Retention', value: `${metrics.netRevenueRetention}%`, icon: RefreshCw },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${card}`}>
            <kpi.icon size={16} className={`mb-2 ${muted}`} />
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Cash Flow Advantage */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Landmark size={16} className="text-blue-600" />
          Cash Flow & Float Analysis
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h4 className={`text-xs font-semibold mb-2 ${muted}`}>HOW THE FLOAT WORKS</h4>
            <div className="space-y-2">
              {[
                { day: 'Day 1', desc: 'We pay Meta/Google for ad spend (our credit card)', icon: CreditCard, color: 'text-red-500' },
                { day: 'Day 1', desc: 'Invoice sent to client (ad spend + fees)', icon: Send, color: 'text-blue-500' },
                { day: 'Day 1-30', desc: 'Float period: we earn credit card rewards (1.5-2%)', icon: Sparkles, color: 'text-purple-500' },
                { day: 'Day 30', desc: 'Client pays invoice — cash flow positive', icon: CheckCircle2, color: 'text-emerald-500' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <step.icon size={14} className={`mt-0.5 ${step.color}`} />
                  <div>
                    <span className="text-[10px] font-bold">{step.day}:</span>
                    <span className={`text-[10px] ml-1 ${muted}`}>{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className={`text-xs font-semibold mb-2 ${muted}`}>FLOAT ECONOMICS (MONTHLY)</h4>
            <div className="space-y-1.5">
              {[
                { label: 'Total ad spend fronted', value: `$${metrics.adSpendFloat.toLocaleString()}` },
                { label: 'CC rewards earned (2%)', value: `$${Math.round(metrics.adSpendFloat * 0.02).toLocaleString()}` },
                { label: 'Ad markup revenue', value: `$${invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.adMarkup, 0).toLocaleString()}` },
                { label: 'Effective yield on float', value: `${((invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.adMarkup, 0) + metrics.adSpendFloat * 0.02) / (metrics.adSpendFloat || 1) * 100).toFixed(1)}%` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-[11px]">
                  <span className={muted}>{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
            <div className={`mt-3 p-2 rounded-lg ${c('bg-amber-50', 'bg-amber-900/20')}`}>
              <p className={`text-[10px] ${c('text-amber-700', 'text-amber-400')}`}>
                <strong>Key insight:</strong> Use a high-rewards business credit card (Amex Business Gold, Chase Ink).
                At $50K/mo ad spend under management, CC rewards alone = $1,000/mo pure profit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Network Summary */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Handshake size={16} className="text-amber-600" />
            Referral Network Summary
          </h3>
          <button onClick={() => setSubTab('referrals')} className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All <ArrowUpRight size={10} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Referrers', value: new Set(referrals.map(r => r.referrerCode)).size },
            { label: 'Total Referrals', value: referrals.length },
            { label: 'Conversion Rate', value: `${metrics.referralConversionRate}%` },
            { label: 'Credits Outstanding', value: `$${metrics.referralCreditsOutstanding.toLocaleString()}` },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-lg border p-3 text-center ${c('border-slate-100', 'border-slate-700')}`}>
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className={`text-[10px] ${muted}`}>{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
