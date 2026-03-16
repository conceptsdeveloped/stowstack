import {
  FileText, Plus, Download, Send, ChevronDown, ChevronUp
} from 'lucide-react'
import type { Invoice, ClientAccount } from './BillingConstants'

interface InvoiceManagerProps {
  invoices: Invoice[]
  clients: ClientAccount[]
  expandedInvoice: string | null
  setExpandedInvoice: (id: string | null) => void
  showNewInvoice: boolean
  setShowNewInvoice: (show: boolean) => void
  card: string
  muted: string
  subtle: string
  input: string
  c: (light: string, dark: string) => string
}

export default function InvoiceManager({ invoices, clients, expandedInvoice, setExpandedInvoice, showNewInvoice, setShowNewInvoice, card, muted, subtle, input, c }: InvoiceManagerProps) {
  const grouped = invoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    if (!acc[inv.status]) acc[inv.status] = []
    acc[inv.status].push(inv)
    return acc
  }, {})

  const statusOrder: Invoice['status'][] = ['overdue', 'sent', 'viewed', 'draft', 'paid', 'partial', 'void']
  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: c('bg-slate-100 text-slate-600', 'bg-slate-700 text-slate-300') },
    sent: { label: 'Sent', color: c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') },
    viewed: { label: 'Viewed', color: c('bg-indigo-100 text-indigo-700', 'bg-indigo-900/30 text-indigo-400') },
    paid: { label: 'Paid', color: c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') },
    overdue: { label: 'Overdue', color: c('bg-red-100 text-red-700', 'bg-red-900/30 text-red-400') },
    partial: { label: 'Partial', color: c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') },
    void: { label: 'Void', color: c('bg-slate-100 text-slate-400', 'bg-slate-800 text-slate-500') },
  }

  const totalSent = invoices.filter(i => ['sent', 'viewed'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amountPaid, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-6">
      {/* Invoice KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: `$${totalPaid.toLocaleString()}`, color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${totalSent.toLocaleString()}`, color: '' },
          { label: 'Overdue', value: `$${totalOverdue.toLocaleString()}`, color: 'text-red-500' },
          { label: 'Total Invoices', value: invoices.length, color: '' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">All Invoices</h3>
        <div className="flex gap-2">
          <button className={`flex items-center gap-1.5 text-xs font-medium ${muted} hover:${c('text-slate-700', 'text-slate-200')}`}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowNewInvoice(!showNewInvoice)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {showNewInvoice && (
        <div className={`rounded-xl border p-4 ${card}`}>
          <p className={`text-xs font-semibold mb-3`}>Create Net-30 Invoice</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <select className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${input}`}>
              <option value="">Select Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.facilityName}</option>)}
            </select>
            <input type="text" placeholder="Billing Month" className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${input}`} />
            <input type="number" placeholder="Ad Spend" className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${input}`} />
            <select className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${input}`}>
              <option value="net30">Net 30</option>
              <option value="net15">Net 15</option>
              <option value="net45">Net 45</option>
            </select>
          </div>
          <p className={`text-[10px] mb-3 ${subtle}`}>Management fee and ad markup will be auto-calculated from the client's tier. Referral credits will be auto-applied.</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">Generate Invoice</button>
            <button onClick={() => setShowNewInvoice(false)} className={`px-3 py-1.5 text-xs ${muted}`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {statusOrder.filter(s => grouped[s]?.length).map(status => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabels[status].color}`}>
              {statusLabels[status].label}
            </span>
            <span className={`text-[10px] ${subtle}`}>{grouped[status].length} invoice{grouped[status].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2 mb-4">
            {grouped[status].map(inv => (
              <div key={inv.id} className={`rounded-xl border ${card}`}>
                <button
                  onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={14} className={muted} />
                    <div>
                      <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                      <p className={`text-[10px] ${subtle}`}>{inv.clientName} — {inv.month}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">${inv.total.toLocaleString()}</p>
                      <p className={`text-[10px] ${subtle}`}>Due {inv.dueDate}</p>
                    </div>
                    {expandedInvoice === inv.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {expandedInvoice === inv.id && (
                  <div className={`px-4 pb-4 border-t pt-3 ${c('border-slate-100', 'border-slate-700')}`}>
                    <table className="w-full text-xs mb-3">
                      <thead>
                        <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                          <th className={`px-3 py-1.5 text-left font-medium ${muted}`}>Description</th>
                          <th className={`px-3 py-1.5 text-right font-medium ${muted}`}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item, i) => (
                          <tr key={i} className={`border-t ${c('border-slate-50', 'border-slate-700')}`}>
                            <td className="px-3 py-1.5">{item.description}</td>
                            <td className="px-3 py-1.5 text-right font-medium">${item.total.toLocaleString()}</td>
                          </tr>
                        ))}
                        {inv.creditsApplied > 0 && (
                          <tr className={`border-t ${c('border-slate-50', 'border-slate-700')}`}>
                            <td className="px-3 py-1.5 text-emerald-600">Referral Credit Applied</td>
                            <td className="px-3 py-1.5 text-right font-medium text-emerald-600">-${inv.creditsApplied.toLocaleString()}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className={`border-t-2 ${c('border-slate-200', 'border-slate-600')}`}>
                          <td className="px-3 py-2 font-bold">Total Due</td>
                          <td className="px-3 py-2 text-right font-bold">${inv.total.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] ${subtle}`}>
                        Ad Spend: Meta ${inv.metaSpend.toLocaleString()} / Google ${inv.googleSpend.toLocaleString()}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${c('bg-slate-100', 'bg-slate-700')}`}>
                        {inv.paymentTerms.toUpperCase()}
                      </span>
                      {inv.status !== 'paid' && (
                        <button className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                          <Send size={10} /> Send Reminder
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
