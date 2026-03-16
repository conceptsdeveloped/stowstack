import {
  Building2, ChevronDown, ChevronUp, CheckCircle2, Copy
} from 'lucide-react'
import type { ClientAccount, Invoice } from './BillingConstants'
import { PRICING_TIERS } from './BillingConstants'

interface ClientAccountsProps {
  clients: ClientAccount[]
  invoices: Invoice[]
  expandedClient: string | null
  setExpandedClient: (id: string | null) => void
  copiedCode: string | null
  copyCode: (code: string) => void
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function ClientAccounts({ clients, invoices, expandedClient, setExpandedClient, copiedCode, copyCode, card, muted, subtle, c }: ClientAccountsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Clients', value: clients.filter(c => c.status === 'active').length },
          { label: 'Total Facilities', value: clients.reduce((s, c) => s + c.facilities, 0) },
          { label: 'Avg Monthly / Client', value: `$${Math.round(clients.reduce((s, c) => s + c.monthlyAdBudget + c.managementFeeRate, 0) / (clients.length || 1)).toLocaleString()}` },
          { label: 'Total Credits Outstanding', value: `$${clients.reduce((s, c) => s + c.creditBalance, 0).toLocaleString()}` },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {clients.length === 0 ? (
        <div className={`text-center py-16 ${muted}`}>
          <Building2 size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No signed clients yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const tier = PRICING_TIERS.find(t => t.id === client.tier)!
            const TierIcon = tier.icon
            const monthlyTotal = client.monthlyAdBudget + client.managementFeeRate + (client.monthlyAdBudget * client.adMarkupRate / 100)
            const clientInvoices = invoices.filter(i => i.clientId === client.id)
            const isExpanded = expandedClient === client.id

            return (
              <div key={client.id} className={`rounded-xl border ${card}`}>
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tier.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                      tier.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      tier.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      <TierIcon size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{client.facilityName}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          tier.color === 'emerald' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                          tier.color === 'blue' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                          tier.color === 'purple' ? c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400') :
                          c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400')
                        }`}>{tier.name}</span>
                      </div>
                      <p className={`text-[10px] ${subtle}`}>{client.location} — {client.facilities} facilit{client.facilities === 1 ? 'y' : 'ies'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">${monthlyTotal.toLocaleString()}<span className={`text-[10px] font-normal ${subtle}`}>/mo</span></p>
                      <p className={`text-[10px] ${subtle}`}>{client.paymentTerms.toUpperCase()}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className={`px-4 pb-4 border-t pt-3 space-y-3 ${c('border-slate-100', 'border-slate-700')}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Ad Budget', value: `$${client.monthlyAdBudget.toLocaleString()}/mo` },
                        { label: 'Mgmt Fee', value: `$${client.managementFeeRate.toLocaleString()}/mo` },
                        { label: 'Ad Markup', value: `${client.adMarkupRate}% ($${Math.round(client.monthlyAdBudget * client.adMarkupRate / 100).toLocaleString()})` },
                        { label: 'Total LTV', value: `$${client.totalRevenue.toLocaleString()}` },
                      ].map(d => (
                        <div key={d.label}>
                          <p className={`text-[10px] ${subtle}`}>{d.label}</p>
                          <p className="text-xs font-semibold">{d.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ${subtle}`}>Referral Code:</span>
                        <code className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c('bg-slate-100', 'bg-slate-700')}`}>{client.referralCode}</code>
                        <button onClick={() => copyCode(client.referralCode)} className="text-emerald-600 hover:text-emerald-700">
                          {copiedCode === client.referralCode ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      {client.creditBalance > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400')}`}>
                          ${client.creditBalance} credit balance
                        </span>
                      )}
                      {client.referredBy && (
                        <span className={`text-[10px] ${subtle}`}>Referred by: {client.referredBy}</span>
                      )}
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold mb-1.5 ${muted}`}>RECENT INVOICES</p>
                      <div className="space-y-1">
                        {clientInvoices.slice(0, 3).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between text-[11px]">
                            <span>{inv.invoiceNumber} — {inv.month}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">${inv.total.toLocaleString()}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                inv.status === 'paid' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                                inv.status === 'sent' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                                c('bg-slate-100 text-slate-600', 'bg-slate-700 text-slate-300')
                              }`}>{inv.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
