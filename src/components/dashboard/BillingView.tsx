import { useState, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Receipt, Building2,
  FileSpreadsheet, Layers, Share2, ShieldAlert, BarChart3, Scale
} from 'lucide-react'
import { Lead } from './types'
import { generateMockData, type BillingSubTab } from './billing/BillingConstants'
import BillingOverview from './billing/BillingOverview'
import InvoiceManager from './billing/InvoiceManager'
import ClientAccounts from './billing/ClientAccounts'
import PricingTiers from './billing/PricingTiers'
import ReferralNetwork from './billing/ReferralNetwork'
import RevenueProjections from './billing/RevenueProjections'
import SpendReconciliation from './billing/SpendReconciliation'
import ProfitLoss from './billing/ProfitLoss'
import DunningWorkflow from './billing/DunningWorkflow'

export default function BillingView({ adminKey: _adminKey, leads, darkMode }: { adminKey: string; leads: Lead[]; darkMode: boolean }) {
  const [subTab, setSubTab] = useState<BillingSubTab>('overview')
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [showNewReferral, setShowNewReferral] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { clients, invoices, referrals, metrics, reconciliation, dunning, paymentMethods, plData } = useMemo(() => generateMockData(leads), [leads])

  const c = (light: string, dark: string) => darkMode ? dark : light
  const card = c('bg-white border-slate-200', 'bg-slate-800 border-slate-700')
  const muted = c('text-slate-500', 'text-slate-400')
  const subtle = c('text-slate-400', 'text-slate-500')
  const input = c('bg-white border-slate-200', 'bg-slate-700 border-slate-600 text-slate-200')

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const SUB_TABS: { id: BillingSubTab; label: string; icon: typeof DollarSign }[] = [
    { id: 'overview', label: 'Revenue Overview', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'clients', label: 'Client Accounts', icon: Building2 },
    { id: 'reconciliation', label: 'Spend Reconciliation', icon: Scale },
    { id: 'pnl', label: 'Profit & Loss', icon: FileSpreadsheet },
    { id: 'dunning', label: 'Collections', icon: ShieldAlert },
    { id: 'pricing', label: 'Pricing & Tiers', icon: Layers },
    { id: 'referrals', label: 'Referral Network', icon: Share2 },
    { id: 'projections', label: 'Revenue Projections', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              subTab === tab.id
                ? c('bg-slate-900 text-white', 'bg-slate-100 text-slate-900')
                : c('text-slate-500 hover:bg-slate-100', 'text-slate-400 hover:bg-slate-700')
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <BillingOverview
          metrics={metrics}
          clients={clients}
          invoices={invoices}
          referrals={referrals}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
          setSubTab={setSubTab}
        />
      )}
      {subTab === 'invoices' && (
        <InvoiceManager
          invoices={invoices}
          clients={clients}
          expandedInvoice={expandedInvoice}
          setExpandedInvoice={setExpandedInvoice}
          showNewInvoice={showNewInvoice}
          setShowNewInvoice={setShowNewInvoice}
          card={card}
          muted={muted}
          subtle={subtle}
          input={input}
          c={c}
        />
      )}
      {subTab === 'clients' && (
        <ClientAccounts
          clients={clients}
          invoices={invoices}
          expandedClient={expandedClient}
          setExpandedClient={setExpandedClient}
          copiedCode={copiedCode}
          copyCode={copyCode}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
      {subTab === 'reconciliation' && (
        <SpendReconciliation
          reconciliation={reconciliation}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
      {subTab === 'pnl' && (
        <ProfitLoss
          plData={plData}
          metrics={metrics}
          clients={clients}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
      {subTab === 'dunning' && (
        <DunningWorkflow
          invoices={invoices}
          dunning={dunning}
          clients={clients}
          paymentMethods={paymentMethods}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
      {subTab === 'pricing' && (
        <PricingTiers
          clients={clients}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
      {subTab === 'referrals' && (
        <ReferralNetwork
          clients={clients}
          referrals={referrals}
          showNewReferral={showNewReferral}
          setShowNewReferral={setShowNewReferral}
          card={card}
          muted={muted}
          subtle={subtle}
          input={input}
          c={c}
        />
      )}
      {subTab === 'projections' && (
        <RevenueProjections
          clients={clients}
          metrics={metrics}
          card={card}
          muted={muted}
          subtle={subtle}
          c={c}
        />
      )}
    </div>
  )
}
