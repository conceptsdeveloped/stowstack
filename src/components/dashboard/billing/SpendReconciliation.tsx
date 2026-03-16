import {
  Scale, Calendar, Download, AlertTriangle, RefreshCw
} from 'lucide-react'
import type { ReconciliationEntry } from './BillingConstants'

interface SpendReconciliationProps {
  reconciliation: ReconciliationEntry[]
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function SpendReconciliation({ reconciliation, card, muted, subtle, c }: SpendReconciliationProps) {
  const matched = reconciliation.filter(r => r.status === 'matched').length
  const underCharged = reconciliation.filter(r => r.status === 'under').reduce((s, r) => s + r.variance, 0)
  const overCharged = reconciliation.filter(r => r.status === 'over').reduce((s, r) => s + Math.abs(r.variance), 0)

  const byMonth = reconciliation.reduce<Record<string, ReconciliationEntry[]>>((acc, r) => {
    if (!acc[r.month]) acc[r.month] = []
    acc[r.month].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
          <Scale size={16} className="text-blue-600" />
          Ad Spend Reconciliation
        </h3>
        <p className={`text-xs mb-4 ${muted}`}>
          Compare what we invoiced clients for ad spend vs. what Meta and Google actually charged us.
          Variances get rolled into the next month's invoice as credits or adjustments.
          Keep variance under 5% to maintain client trust.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Entries', value: reconciliation.length, color: '' },
            { label: 'Matched (within tolerance)', value: `${matched} (${reconciliation.length > 0 ? Math.round(matched / reconciliation.length * 100) : 0}%)`, color: 'text-emerald-600' },
            { label: 'Under-Invoiced', value: `$${underCharged.toLocaleString()}`, color: 'text-amber-600' },
            { label: 'Over-Invoiced (credits due)', value: `$${overCharged.toLocaleString()}`, color: 'text-blue-600' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
              <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reconciliation by Month */}
      {Object.entries(byMonth).reverse().map(([month, entries]) => {
        const monthTotal = entries.reduce((s, e) => s + Math.abs(e.variance), 0)
        return (
          <div key={month} className={`rounded-xl border ${card}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${c('border-slate-100', 'border-slate-700')}`}>
              <div className="flex items-center gap-2">
                <Calendar size={14} className={muted} />
                <h3 className="font-semibold text-sm">{month}</h3>
              </div>
              <span className={`text-xs ${muted}`}>Net variance: ${monthTotal.toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                    {['Client', 'Platform', 'Invoiced', 'Actual Spend', 'Variance', '%', 'Status', 'Action'].map(h => (
                      <th key={h} className={`px-3 py-2 text-left font-medium ${muted}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className={`border-t ${c('border-slate-100', 'border-slate-700')}`}>
                      <td className="px-3 py-2 font-medium">{entry.clientName}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          entry.platform === 'meta' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') : c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400')
                        }`}>{entry.platform === 'meta' ? 'Meta' : 'Google'}</span>
                      </td>
                      <td className="px-3 py-2">${entry.invoicedAmount.toLocaleString()}</td>
                      <td className="px-3 py-2">${entry.actualSpend.toLocaleString()}</td>
                      <td className={`px-3 py-2 font-semibold ${entry.variance > 0 ? 'text-amber-600' : entry.variance < 0 ? 'text-blue-600' : ''}`}>
                        {entry.variance > 0 ? '+' : ''}{entry.variance !== 0 ? `$${entry.variance.toLocaleString()}` : '$0'}
                      </td>
                      <td className={`px-3 py-2 ${Math.abs(entry.variancePct) > 5 ? 'text-red-500 font-semibold' : muted}`}>
                        {entry.variancePct > 0 ? '+' : ''}{entry.variancePct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          entry.status === 'matched' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                          entry.status === 'under' ? c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') :
                          entry.status === 'over' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                          c('bg-slate-100 text-slate-500', 'bg-slate-700 text-slate-400')
                        }`}>{entry.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        {entry.status !== 'matched' && (
                          <button className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700">
                            Apply to next invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* Reconciliation Process */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3">Reconciliation Process</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { step: '1', title: 'Pull Platform Reports', desc: 'Download spend reports from Meta Business Manager and Google Ads at month-end.', icon: Download },
            { step: '2', title: 'Compare to Invoice', desc: 'System auto-matches invoiced amounts against actual platform spend.', icon: Scale },
            { step: '3', title: 'Flag Variances', desc: 'Anything over 5% tolerance gets flagged for review. Under-charges are common with pacing.', icon: AlertTriangle },
            { step: '4', title: 'Apply Adjustments', desc: 'Credits or charges roll into next month invoice. Client sees transparent line item.', icon: RefreshCw },
          ].map(s => (
            <div key={s.step} className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{s.step}</span>
                <s.icon size={14} className={muted} />
              </div>
              <p className="text-xs font-semibold mb-0.5">{s.title}</p>
              <p className={`text-[10px] ${subtle}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
