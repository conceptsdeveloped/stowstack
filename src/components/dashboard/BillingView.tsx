import { useState, useEffect } from 'react'
import { Loader2, Plus, Receipt } from 'lucide-react'
import { Lead } from './types'

interface Invoice {
  id: string
  month: string
  amount: number
  adSpend: number
  managementFee: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
  paidDate: string | null
  notes: string
  createdAt: string
}

export default function BillingView({ adminKey, leads, darkMode }: { adminKey: string; leads: Lead[]; darkMode: boolean }) {
  const [invoices, setInvoices] = useState<Record<string, Invoice[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createCode, setCreateCode] = useState('')
  const [createMonth, setCreateMonth] = useState('')
  const [createAdSpend, setCreateAdSpend] = useState('')
  const [createFee, setCreateFee] = useState('')
  const [createDue, setCreateDue] = useState('')
  const [saving, setSaving] = useState(false)

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/client-billing?all=true', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || {})
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetchAll()
  }, [adminKey])

  const createInvoice = async () => {
    if (!createCode || !createMonth || !createAdSpend || !createFee) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code: createCode,
          month: createMonth,
          adSpend: Number(createAdSpend),
          managementFee: Number(createFee),
          amount: Number(createAdSpend) + Number(createFee),
          dueDate: createDue || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInvoices(prev => ({ ...prev, [createCode]: data.invoices || [] }))
        setShowCreate(false)
        setCreateMonth(''); setCreateAdSpend(''); setCreateFee(''); setCreateDue('')
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  const updateInvoice = async (code: string, invoiceId: string, status: string) => {
    try {
      const res = await fetch('/api/client-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code,
          invoiceId,
          status,
          paidDate: status === 'paid' ? new Date().toISOString() : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInvoices(prev => ({ ...prev, [code]: data.invoices || [] }))
      }
    } catch { /* silent */ }
  }

  const statusColor = (s: string) => {
    if (s === 'paid') return darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
    if (s === 'sent') return darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
    if (s === 'overdue') return darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
    return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
  }

  const allInvoices = Object.values(invoices).flat()
  const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = allInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0)
  const overdueAmount = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading billing data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'collected', color: 'text-emerald-600' },
          { label: 'Outstanding', value: `$${totalOutstanding.toLocaleString()}`, sub: 'awaiting payment', color: '' },
          { label: 'Overdue', value: `$${overdueAmount.toLocaleString()}`, sub: 'past due', color: 'text-red-500' },
          { label: 'Invoices', value: String(allInvoices.length), sub: 'total', color: '' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Create Invoice */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Client Invoices</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {showCreate && (
        <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <select value={createCode} onChange={e => setCreateCode(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`}>
              <option value="">Client...</option>
              {signedClients.map(c => (<option key={c.id} value={c.accessCode}>{c.facilityName}</option>))}
            </select>
            <input type="text" placeholder="Month (Mar 2026)" value={createMonth} onChange={e => setCreateMonth(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="number" placeholder="Ad Spend" value={createAdSpend} onChange={e => setCreateAdSpend(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="number" placeholder="Mgmt Fee" value={createFee} onChange={e => setCreateFee(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
            <input type="date" value={createDue} onChange={e => setCreateDue(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200'}`} />
          </div>
          <div className="flex gap-2">
            <button onClick={createInvoice} disabled={!createCode || !createMonth || !createAdSpend || !createFee || saving}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
            <button onClick={() => setShowCreate(false)} className={`px-3 py-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Invoice List by Client */}
      {signedClients.length === 0 ? (
        <div className={`text-center py-16 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Receipt size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No signed clients yet</p>
          <p className="text-xs mt-1">Invoices will appear here once clients are signed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signedClients.map(client => {
            const clientInvoices = invoices[client.accessCode!] || []
            return (
              <div key={client.id} className={`rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div>
                    <h4 className="text-sm font-semibold">{client.facilityName}</h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{client.location}</p>
                  </div>
                  <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {clientInvoices.length === 0 ? (
                  <div className={`px-4 py-6 text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No invoices yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                          {['Month', 'Ad Spend', 'Fee', 'Total', 'Status', 'Actions'].map(h => (
                            <th key={h} className={`px-4 py-2 font-medium ${h === 'Month' ? 'text-left' : h === 'Actions' || h === 'Status' ? 'text-center' : 'text-right'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientInvoices.map(inv => (
                          <tr key={inv.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            <td className="px-4 py-2.5 font-medium">{inv.month}</td>
                            <td className={`px-4 py-2.5 text-right ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>${inv.adSpend.toLocaleString()}</td>
                            <td className={`px-4 py-2.5 text-right ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>${inv.managementFee.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">${inv.amount.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>
                                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <select value={inv.status} onChange={e => updateInvoice(client.accessCode!, inv.id, e.target.value)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
