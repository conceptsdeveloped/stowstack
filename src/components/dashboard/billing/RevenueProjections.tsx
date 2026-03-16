import { Trophy, Target, CheckCircle2, Layers } from 'lucide-react'
import type { ClientAccount, FinancialMetrics } from './BillingConstants'

interface RevenueProjectionsProps {
  clients: ClientAccount[]
  metrics: FinancialMetrics
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function RevenueProjections({ clients, metrics, card, muted, subtle, c }: RevenueProjectionsProps) {
  const currentClients = clients.length || 1
  const currentMRR = metrics.mrr || 5000
  const avgAdSpendPerClient = clients.length > 0 ? clients.reduce((s, c) => s + c.monthlyAdBudget, 0) / clients.length : 3500

  const projections = [3, 6, 12, 24].map(months => {
    const growthRate = 0.15 // 15% monthly client growth
    const churnRate = 0.04
    const netGrowth = growthRate - churnRate
    const projectedClients = Math.round(currentClients * Math.pow(1 + netGrowth, months))
    const projectedMRR = Math.round(currentMRR * Math.pow(1 + netGrowth, months))
    const projectedAdSpend = projectedClients * avgAdSpendPerClient
    const projectedARR = projectedMRR * 12
    const ccRewards = Math.round(projectedAdSpend * 0.02)
    const referralSavings = Math.round(projectedClients * 0.3 * 500) // 30% from referrals

    return { months, clients: projectedClients, mrr: projectedMRR, arr: projectedARR, adSpend: projectedAdSpend, ccRewards, referralSavings }
  })

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1">Growth Projections</h3>
        <p className={`text-xs mb-4 ${muted}`}>
          Based on 15% monthly client growth, 4% churn, and current pricing tiers. Assumes 30% of new clients come from referrals (no CAC).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                {['Timeline', 'Clients', 'MRR', 'ARR', 'Ad Spend Managed', 'CC Rewards/mo', 'Referral Savings'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-medium ${muted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={`border-t font-semibold ${c('border-slate-100 bg-emerald-50/50', 'border-slate-700 bg-emerald-900/10')}`}>
                <td className="px-3 py-2">Today</td>
                <td className="px-3 py-2">{currentClients}</td>
                <td className="px-3 py-2">${currentMRR.toLocaleString()}</td>
                <td className="px-3 py-2">${(currentMRR * 12).toLocaleString()}</td>
                <td className="px-3 py-2">${(currentClients * avgAdSpendPerClient).toLocaleString()}</td>
                <td className="px-3 py-2">${Math.round(currentClients * avgAdSpendPerClient * 0.02).toLocaleString()}</td>
                <td className="px-3 py-2">—</td>
              </tr>
              {projections.map(p => (
                <tr key={p.months} className={`border-t ${c('border-slate-100', 'border-slate-700')}`}>
                  <td className="px-3 py-2 font-semibold">{p.months} months</td>
                  <td className="px-3 py-2">{p.clients}</td>
                  <td className="px-3 py-2 font-bold text-emerald-600">${p.mrr.toLocaleString()}</td>
                  <td className="px-3 py-2">${p.arr.toLocaleString()}</td>
                  <td className="px-3 py-2">${p.adSpend.toLocaleString()}</td>
                  <td className="px-3 py-2 text-purple-600">${p.ccRewards.toLocaleString()}</td>
                  <td className="px-3 py-2 text-blue-600">${p.referralSavings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Milestones */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Trophy size={16} className="text-amber-600" />
          Revenue Milestones
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { milestone: '$10K MRR', clients: 5, adSpend: '$20K/mo', note: 'Covers 1 FTE + tools. Self-sustaining.', reached: currentMRR >= 10000 },
            { milestone: '$25K MRR', clients: 12, adSpend: '$50K/mo', note: 'Hire campaign manager. CC rewards = $1K/mo.', reached: currentMRR >= 25000 },
            { milestone: '$50K MRR', clients: 25, adSpend: '$100K/mo', note: 'Meta/Google partner status. Volume discounts.', reached: currentMRR >= 50000 },
            { milestone: '$100K MRR', clients: 50, adSpend: '$200K/mo', note: 'White-label to management companies. 3-person team.', reached: currentMRR >= 100000 },
          ].map(m => (
            <div key={m.milestone} className={`rounded-lg border p-3 ${m.reached ? c('bg-emerald-50 border-emerald-200', 'bg-emerald-900/20 border-emerald-800') : c('border-slate-100', 'border-slate-700')}`}>
              <div className="flex items-center gap-2 mb-1">
                {m.reached ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Target size={14} className={subtle} />}
                <p className={`text-sm font-bold ${m.reached ? 'text-emerald-600' : ''}`}>{m.milestone}</p>
              </div>
              <p className={`text-[10px] ${subtle}`}>~{m.clients} clients, {m.adSpend} under management</p>
              <p className={`text-[10px] mt-1 ${muted}`}>{m.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Streams Deep Dive */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Layers size={16} className="text-blue-600" />
          All Revenue Streams at Scale (50 Clients)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                {['Revenue Stream', 'Per Client/mo', 'x50 Clients', 'Annual', 'Margin', 'Notes'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-medium ${muted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { stream: 'Management Fees', perClient: 1500, margin: 85, notes: 'Pure service revenue. Scales with team.' },
                { stream: 'Ad Spend Markup (11% avg)', perClient: 660, margin: 95, notes: 'On $6K avg ad spend. Higher tiers = lower %.' },
                { stream: 'Setup Fees (amortized)', perClient: 83, margin: 70, notes: '$1K avg setup / 12mo. One-time but recurring flow.' },
                { stream: 'Call Tracking', perClient: 75, margin: 60, notes: '3 numbers x $25. Twilio cost = ~$10/number.' },
                { stream: 'Creative Services', perClient: 200, margin: 75, notes: 'Ad creative refreshes, new landing pages.' },
                { stream: 'CC Rewards (2%)', perClient: 120, margin: 100, notes: 'On $6K avg ad spend. Pure profit.' },
              ].map(row => (
                <tr key={row.stream} className={`border-t ${c('border-slate-100', 'border-slate-700')}`}>
                  <td className="px-3 py-2 font-semibold">{row.stream}</td>
                  <td className="px-3 py-2">${row.perClient.toLocaleString()}</td>
                  <td className="px-3 py-2 font-bold">${(row.perClient * 50).toLocaleString()}</td>
                  <td className="px-3 py-2">${(row.perClient * 50 * 12).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={row.margin > 80 ? 'text-emerald-600 font-semibold' : ''}>{row.margin}%</span>
                  </td>
                  <td className={`px-3 py-2 ${subtle}`}>{row.notes}</td>
                </tr>
              ))}
              <tr className={`border-t-2 font-bold ${c('border-slate-300 bg-slate-50', 'border-slate-600 bg-slate-700/50')}`}>
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2">$2,638</td>
                <td className="px-3 py-2 text-emerald-600">$131,900/mo</td>
                <td className="px-3 py-2 text-emerald-600">$1,582,800/yr</td>
                <td className="px-3 py-2">~83%</td>
                <td className={`px-3 py-2 ${subtle}`}>Blended across all streams</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
