import {
  Mail, AlertTriangle, Phone, Pause, ShieldAlert, Timer,
  Check, CheckCircle2, CreditCard, Landmark,
  ToggleLeft, ToggleRight, Banknote as Bank
} from 'lucide-react'
import type { Invoice, DunningStep, ClientAccount, PaymentMethod } from './BillingConstants'

interface DunningWorkflowProps {
  invoices: Invoice[]
  dunning: DunningStep[]
  clients: ClientAccount[]
  paymentMethods: PaymentMethod[]
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function DunningWorkflow({ invoices, dunning, clients, paymentMethods, card, muted, subtle, c }: DunningWorkflowProps) {
  const overdueInvoices = invoices.filter(i => ['overdue', 'sent'].includes(i.status))
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.total, 0)
  const sentSteps = dunning.filter(d => d.status === 'sent').length
  const scheduledSteps = dunning.filter(d => d.status === 'scheduled').length

  const stepTypeConfig: Record<DunningStep['type'], { label: string; icon: typeof Mail; color: string }> = {
    email_reminder: { label: 'Email Reminder', icon: Mail, color: c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') },
    email_warning: { label: 'Warning Email', icon: AlertTriangle, color: c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') },
    phone_call: { label: 'Phone Call', icon: Phone, color: c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400') },
    pause_service: { label: 'Pause Service', icon: Pause, color: c('bg-red-100 text-red-700', 'bg-red-900/30 text-red-400') },
    final_notice: { label: 'Final Notice', icon: ShieldAlert, color: c('bg-red-100 text-red-700', 'bg-red-900/30 text-red-400') },
  }

  // Group by invoice
  const byInvoice = dunning.reduce<Record<string, DunningStep[]>>((acc, d) => {
    if (!acc[d.invoiceId]) acc[d.invoiceId] = []
    acc[d.invoiceId].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Overdue/Outstanding', value: `$${totalOverdue.toLocaleString()}`, color: totalOverdue > 0 ? 'text-red-500' : '' },
          { label: 'Invoices in Collection', value: overdueInvoices.length, color: '' },
          { label: 'Dunning Steps Sent', value: sentSteps, color: '' },
          { label: 'Steps Scheduled', value: scheduledSteps, color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Dunning Automation Config */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
          <Timer size={16} className="text-purple-600" />
          Automated Dunning Sequence
        </h3>
        <p className={`text-xs mb-4 ${muted}`}>
          When an invoice goes unpaid, this sequence triggers automatically. Each step escalates.
          Pause at any point if the client communicates.
        </p>
        <div className="grid sm:grid-cols-6 gap-2">
          {[
            { day: 'Day -3', label: 'Friendly Reminder', type: 'email_reminder' as const, desc: 'Due in 3 days' },
            { day: 'Day +1', label: 'Past Due Notice', type: 'email_reminder' as const, desc: 'Invoice overdue' },
            { day: 'Day +7', label: 'Second Reminder', type: 'email_warning' as const, desc: 'Escalated tone' },
            { day: 'Day +14', label: 'Phone Call', type: 'phone_call' as const, desc: 'Personal outreach' },
            { day: 'Day +30', label: 'Service Pause', type: 'pause_service' as const, desc: 'Ads paused' },
            { day: 'Day +45', label: 'Final Notice', type: 'final_notice' as const, desc: 'Account closure' },
          ].map((step, i) => {
            const config = stepTypeConfig[step.type]
            return (
              <div key={i} className={`rounded-lg border p-2.5 text-center relative ${c('border-slate-100', 'border-slate-700')}`}>
                {i < 5 && <div className={`hidden sm:block absolute top-1/2 -right-1.5 w-3 h-0.5 ${c('bg-slate-200', 'bg-slate-600')}`} />}
                <p className={`text-[9px] font-bold mb-1 ${config.color} px-1 py-0.5 rounded inline-block`}>{step.day}</p>
                <config.icon size={14} className={`mx-auto mb-1 ${muted}`} />
                <p className="text-[10px] font-semibold">{step.label}</p>
                <p className={`text-[9px] ${subtle}`}>{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active Dunning Queues */}
      {Object.keys(byInvoice).length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${card}`}>
          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium">All clear</p>
          <p className={`text-xs mt-1 ${muted}`}>No invoices in the dunning queue right now</p>
        </div>
      ) : (
        Object.entries(byInvoice).map(([invoiceId, steps]) => {
          const inv = invoices.find(i => i.id === invoiceId)
          if (!inv) return null
          return (
            <div key={invoiceId} className={`rounded-xl border ${card}`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${c('border-slate-100', 'border-slate-700')}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      inv.status === 'overdue' ? c('bg-red-100 text-red-700', 'bg-red-900/30 text-red-400') : c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400')
                    }`}>{inv.status}</span>
                  </div>
                  <p className={`text-[10px] ${subtle}`}>{inv.clientName} — ${inv.total.toLocaleString()} — Due {inv.dueDate}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    <Check size={10} /> Mark Paid
                  </button>
                  <button className={`text-[10px] font-medium ${muted} hover:${c('text-slate-700', 'text-slate-200')} flex items-center gap-1`}>
                    <Pause size={10} /> Pause Sequence
                  </button>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="space-y-2">
                  {steps.map(step => {
                    const config = stepTypeConfig[step.type]
                    const StepIcon = config.icon
                    return (
                      <div key={step.id} className={`flex items-center gap-3 py-1.5 ${step.status === 'sent' ? '' : 'opacity-60'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          step.status === 'sent' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                          step.status === 'scheduled' ? c('bg-slate-100 text-slate-400', 'bg-slate-700 text-slate-500') :
                          c('bg-slate-50 text-slate-300', 'bg-slate-800 text-slate-600')
                        }`}>
                          {step.status === 'sent' ? <Check size={12} /> : <StepIcon size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{step.subject}</p>
                          <p className={`text-[10px] ${subtle}`}>
                            {step.sentDate ? `Sent ${step.sentDate}` : `Scheduled ${step.scheduledDate}`}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Payment Methods */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <CreditCard size={16} className="text-blue-600" />
          Client Payment Methods & Autopay
        </h3>
        {paymentMethods.length === 0 ? (
          <p className={`text-xs ${muted}`}>No payment methods on file yet</p>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(pm => {
              const client = clients.find(cl => cl.id === pm.clientId)
              return (
                <div key={pm.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${c('border-slate-100', 'border-slate-700')}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      pm.type === 'ach' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                      pm.type === 'credit_card' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                      c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400')
                    }`}>
                      {pm.type === 'ach' ? <Landmark size={14} /> : pm.type === 'credit_card' ? <CreditCard size={14} /> : <Bank size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{client?.facilityName || 'Unknown'}</p>
                      <p className={`text-[10px] ${subtle}`}>{pm.brand} ****{pm.last4}{pm.expiry ? ` — Exp ${pm.expiry}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      pm.type === 'ach' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                      pm.type === 'credit_card' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                      c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400')
                    }`}>
                      {pm.type === 'ach' ? 'ACH' : pm.type === 'credit_card' ? 'Card' : 'Wire'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {pm.autopay ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                          <ToggleRight size={14} /> Autopay
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${subtle}`}>
                          <ToggleLeft size={14} /> Manual
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className={`mt-4 p-3 rounded-lg ${c('bg-emerald-50', 'bg-emerald-900/20')}`}>
          <p className={`text-[10px] font-semibold ${c('text-emerald-700', 'text-emerald-400')}`}>Autopay Recommendation</p>
          <p className={`text-[10px] mt-0.5 ${c('text-emerald-600', 'text-emerald-500')}`}>
            {paymentMethods.filter(pm => pm.autopay).length} of {paymentMethods.length} clients on autopay.
            ACH autopay reduces DSO from 24 days to 2 days and eliminates dunning costs.
            Incentivize with 2% discount for ACH autopay enrollment.
          </p>
        </div>
      </div>

      {/* Late Fee Policy */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          Late Fee & Collection Policy
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h4 className={`text-xs font-semibold mb-2`}>FEE STRUCTURE</h4>
            <div className="space-y-1.5">
              {[
                { range: '1-15 days late', fee: '1.5% of invoice', note: 'Grace period reminder first' },
                { range: '16-30 days late', fee: '3% of invoice', note: 'Second notice + phone call' },
                { range: '31-45 days late', fee: '5% + ad pause', note: 'Campaigns paused until payment' },
                { range: '46+ days late', fee: 'Collections / write-off', note: 'Final notice + account termination' },
              ].map(row => (
                <div key={row.range} className={`flex items-start gap-3 text-[11px] py-1 border-b ${c('border-slate-50', 'border-slate-700/50')}`}>
                  <span className="font-medium w-28 shrink-0">{row.range}</span>
                  <span className="font-semibold w-28 shrink-0">{row.fee}</span>
                  <span className={subtle}>{row.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className={`text-xs font-semibold mb-2`}>BEST PRACTICES</h4>
            <ul className="space-y-1.5">
              {[
                'Invoice on the 1st, due on the 30th — consistent every month',
                'Send pre-due reminder 3 days before (reduces late payments 40%)',
                'Offer ACH autopay with 2% discount — saves time and reduces float risk',
                'Never pause ads without 48-hour written warning — protect the relationship',
                'Track DSO weekly — target < 20 days for healthy cash flow',
                'Storage operators pay reliably — most late payments are oversight, not financial',
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span className={`text-[11px] ${muted}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
