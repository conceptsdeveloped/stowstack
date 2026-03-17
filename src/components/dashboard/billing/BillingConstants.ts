import { TrendingUp, Zap, Crown, Gem, Star, Trophy } from 'lucide-react'
import { Lead } from '../types'

/* ═══════════════════════════════════════════════════════════════════ */
/*  TYPES                                                             */
/* ═══════════════════════════════════════════════════════════════════ */

export interface ClientAccount {
  id: string
  name: string
  facilityName: string
  location: string
  accessCode: string
  status: 'active' | 'paused' | 'churned'
  tier: 'launch' | 'growth' | 'portfolio'
  monthlyAdBudget: number
  managementFeeRate: number
  adMarkupRate: number
  signedDate: string
  paymentTerms: 'net15' | 'net30' | 'net45'
  referredBy: string | null
  referralCode: string
  creditBalance: number
  totalSpendManaged: number
  totalRevenue: number
  facilities: number
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  category: 'ad_spend' | 'management_fee' | 'ad_markup' | 'setup' | 'creative' | 'landing_page' | 'call_tracking' | 'credit'
}

export interface Invoice {
  id: string
  clientId: string
  clientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'partial' | 'void'
  items: InvoiceItem[]
  subtotal: number
  creditsApplied: number
  total: number
  amountPaid: number
  notes: string
  paymentTerms: string
  month: string
  adSpendActual: number
  metaSpend: number
  googleSpend: number
  managementFee: number
  adMarkup: number
  paidDate: string | null
}

export interface Referral {
  id: string
  referrerCode: string
  referrerName: string
  referredName: string
  referredEmail: string
  status: 'pending' | 'signed' | 'active' | 'expired'
  creditAmount: number
  creditApplied: boolean
  createdAt: string
  signedAt: string | null
  source: string
}

export interface FinancialMetrics {
  mrr: number
  arr: number
  totalAdSpendManaged: number
  totalRevenue: number
  totalProfit: number
  grossMargin: number
  avgRevenuePerClient: number
  ltv: number
  adSpendFloat: number
  outstandingAR: number
  overdueAR: number
  dso: number
  referralCreditsOutstanding: number
  referralConversionRate: number
  churnRate: number
  netRevenueRetention: number
}

export interface ReconciliationEntry {
  id: string
  clientId: string
  clientName: string
  month: string
  platform: 'meta' | 'google'
  invoicedAmount: number
  actualSpend: number
  variance: number
  variancePct: number
  status: 'matched' | 'under' | 'over' | 'pending'
  notes: string
}

export interface DunningStep {
  id: string
  invoiceId: string
  invoiceNumber: string
  clientName: string
  stepNumber: number
  type: 'email_reminder' | 'email_warning' | 'phone_call' | 'pause_service' | 'final_notice'
  scheduledDate: string
  sentDate: string | null
  status: 'scheduled' | 'sent' | 'skipped' | 'resolved'
  subject: string
  daysOverdue: number
  amount: number
}

export interface PLLineItem {
  category: string
  subcategory: string
  amount: number
  prevAmount: number
  pctChange: number
}

export interface PaymentMethod {
  id: string
  clientId: string
  type: 'ach' | 'credit_card' | 'wire' | 'check'
  last4: string
  brand: string
  expiry: string
  isDefault: boolean
  autopay: boolean
}

export interface PLData {
  revenue: PLLineItem[]
  cogs: PLLineItem[]
  opex: PLLineItem[]
}

export type BillingSubTab = 'overview' | 'invoices' | 'clients' | 'pricing' | 'referrals' | 'projections' | 'reconciliation' | 'pnl' | 'dunning'

/* ═══════════════════════════════════════════════════════════════════ */
/*  PRICING TIERS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

export const PRICING_TIERS = [
  {
    id: 'launch',
    name: 'Launch',
    icon: Zap,
    color: 'emerald',
    monthlyAdMin: 1000,
    monthlyAdMax: 3000,
    managementFee: 499,
    adMarkupPct: 15,
    features: ['1 facility', '3 landing pages', 'Meta ads', 'GBP management', 'Client portal', 'Monthly reporting', 'Email support'],
    referralCredit: 150,
    setupFee: 0,
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    color: 'blue',
    monthlyAdMin: 3000,
    monthlyAdMax: 7500,
    managementFee: 999,
    adMarkupPct: 12,
    features: ['Up to 3 facilities', 'Unlimited landing pages', 'Meta + Google', 'A/B testing', 'Video creative', 'Revenue & Occupancy Intelligence', 'Call tracking', 'Email drip sequences', 'Bi-weekly calls'],
    referralCredit: 300,
    setupFee: 0,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    icon: Crown,
    color: 'purple',
    monthlyAdMin: 7500,
    monthlyAdMax: 25000,
    managementFee: 1499,
    adMarkupPct: 10,
    features: ['Unlimited facilities', 'Everything in Growth', 'Churn prediction & upsell engine', 'Google Ads Lab', 'Partner portal & white-label', 'Dedicated strategist', 'Slack channel', 'Weekly calls', 'Quarterly business review'],
    referralCredit: 500,
    setupFee: 0,
  },
]

export const REFERRAL_TIERS = [
  { min: 0, max: 2, label: 'Member', rate: 100, icon: Star, color: 'slate' },
  { min: 3, max: 5, label: 'Silver', rate: 200, icon: Trophy, color: 'blue' },
  { min: 6, max: 10, label: 'Gold', rate: 400, icon: Crown, color: 'amber' },
  { min: 11, max: Infinity, label: 'Platinum', rate: 600, icon: Gem, color: 'purple' },
]

/* ═══════════════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

export function generateMockData(leads: Lead[]) {
  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  const clients: ClientAccount[] = signedClients.map((l, i) => ({
    id: l.id,
    name: l.name,
    facilityName: l.facilityName,
    location: l.location,
    accessCode: l.accessCode!,
    status: 'active' as const,
    tier: (['launch', 'growth', 'portfolio'] as const)[i % 3],
    monthlyAdBudget: [2000, 5000, 15000][i % 3],
    managementFeeRate: [499, 999, 1499][i % 3],
    adMarkupRate: [15, 12, 10][i % 3],
    signedDate: new Date(Date.now() - (90 + i * 30) * 86400000).toISOString().slice(0, 10),
    paymentTerms: 'net30' as const,
    referredBy: i > 0 ? signedClients[0]?.name || null : null,
    referralCode: `SS-${l.facilityName.replace(/\s/g, '').slice(0, 6).toUpperCase()}-${(1000 + i).toString()}`,
    creditBalance: i > 0 ? 0 : 750,
    totalSpendManaged: [2000, 5000, 15000][i % 3] * (3 + i),
    totalRevenue: ([499, 999, 1499][i % 3] + [2000, 5000, 15000][i % 3] * ([15, 12, 10][i % 3] / 100)) * (3 + i),
    facilities: [1, 2, 5][i % 3],
  }))

  // Generate demo invoices for the last 3 months
  const months = ['Jan 2026', 'Feb 2026', 'Mar 2026']
  const invoices: Invoice[] = []
  let invNum = 1001

  clients.forEach(client => {
    months.forEach((month, mi) => {
      const adSpend = client.monthlyAdBudget + (Math.random() - 0.5) * 500
      const metaShare = 0.6 + Math.random() * 0.2
      const metaSpend = Math.round(adSpend * metaShare)
      const googleSpend = Math.round(adSpend * (1 - metaShare))
      const markup = Math.round(adSpend * (client.adMarkupRate / 100))
      const mgmtFee = client.managementFeeRate

      const items: InvoiceItem[] = [
        { description: `Meta Ads Management — ${month}`, quantity: 1, unitPrice: metaSpend, total: metaSpend, category: 'ad_spend' },
        { description: `Google Ads Management — ${month}`, quantity: 1, unitPrice: googleSpend, total: googleSpend, category: 'ad_spend' },
        { description: `Ad Spend Optimization Fee (${client.adMarkupRate}%)`, quantity: 1, unitPrice: markup, total: markup, category: 'ad_markup' },
        { description: 'Campaign Management & Reporting', quantity: 1, unitPrice: mgmtFee, total: mgmtFee, category: 'management_fee' },
      ]

      if (mi === 0) {
        items.push({ description: 'Call Tracking — 3 Numbers', quantity: 3, unitPrice: 25, total: 75, category: 'call_tracking' })
      }

      const subtotal = items.reduce((s, it) => s + it.total, 0)
      const creditsApplied = mi === 0 && client.referredBy ? 250 : 0
      const total = subtotal - creditsApplied

      const issueDate = new Date(2026, mi, 1).toISOString().slice(0, 10)
      const dueDate = new Date(2026, mi, 30).toISOString().slice(0, 10)

      invoices.push({
        id: `inv-${invNum}`,
        clientId: client.id,
        clientName: client.facilityName,
        invoiceNumber: `SS-${invNum}`,
        issueDate,
        dueDate,
        status: mi < 2 ? 'paid' : (mi === 2 ? 'sent' : 'draft'),
        items,
        subtotal,
        creditsApplied,
        total,
        amountPaid: mi < 2 ? total : 0,
        notes: `Net 30 payment terms. Ad spend managed by StowStack on behalf of ${client.facilityName}.`,
        paymentTerms: client.paymentTerms,
        month,
        adSpendActual: Math.round(adSpend),
        metaSpend,
        googleSpend,
        managementFee: mgmtFee,
        adMarkup: markup,
        paidDate: mi < 2 ? new Date(2026, mi, 15 + Math.floor(Math.random() * 10)).toISOString().slice(0, 10) : null,
      })
      invNum++
    })
  })

  // Referrals
  const referrals: Referral[] = clients.length > 1 ? [
    {
      id: 'ref-1',
      referrerCode: clients[0]?.referralCode || 'SS-REF-1000',
      referrerName: clients[0]?.name || 'Client 1',
      referredName: clients[1]?.name || 'Client 2',
      referredEmail: 'referred@storage.com',
      status: 'active',
      creditAmount: 500,
      creditApplied: true,
      createdAt: '2025-12-01',
      signedAt: '2025-12-15',
      source: 'SSA Conference',
    },
    {
      id: 'ref-2',
      referrerCode: clients[0]?.referralCode || 'SS-REF-1000',
      referrerName: clients[0]?.name || 'Client 1',
      referredName: 'Mike Johnson',
      referredEmail: 'mike@sunvalleystorage.com',
      status: 'pending',
      creditAmount: 500,
      creditApplied: false,
      createdAt: '2026-02-20',
      signedAt: null,
      source: 'Direct referral',
    },
    {
      id: 'ref-3',
      referrerCode: clients[0]?.referralCode || 'SS-REF-1000',
      referrerName: clients[0]?.name || 'Client 1',
      referredName: 'Sarah Chen',
      referredEmail: 'sarah@pacificstorage.com',
      status: 'signed',
      creditAmount: 500,
      creditApplied: false,
      createdAt: '2026-03-05',
      signedAt: '2026-03-12',
      source: 'ISS World Expo',
    },
  ] : []

  // Metrics
  const sentInvoices = invoices.filter(i => ['sent', 'viewed'].includes(i.status))
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const totalAdSpend = invoices.reduce((s, i) => s + i.adSpendActual, 0)
  const totalMarkup = invoices.reduce((s, i) => s + i.adMarkup, 0)
  const totalMgmtFees = invoices.reduce((s, i) => s + i.managementFee, 0)
  const totalRevenue = totalMarkup + totalMgmtFees
  const activeMRR = clients.filter(c => c.status === 'active').reduce((s, c) => s + c.managementFeeRate + (c.monthlyAdBudget * c.adMarkupRate / 100), 0)

  const metrics: FinancialMetrics = {
    mrr: activeMRR,
    arr: activeMRR * 12,
    totalAdSpendManaged: totalAdSpend,
    totalRevenue,
    totalProfit: totalRevenue * 0.72, // after overhead
    grossMargin: 72,
    avgRevenuePerClient: clients.length > 0 ? totalRevenue / clients.length : 0,
    ltv: activeMRR * 18, // 18-month avg lifetime
    adSpendFloat: sentInvoices.reduce((s, i) => s + i.adSpendActual, 0),
    outstandingAR: sentInvoices.reduce((s, i) => s + i.total, 0),
    overdueAR: overdueInvoices.reduce((s, i) => s + i.total, 0),
    dso: 24,
    referralCreditsOutstanding: referrals.filter(r => r.status === 'active' && !r.creditApplied).reduce((s, r) => s + r.creditAmount, 0) + clients.reduce((s, c) => s + c.creditBalance, 0),
    referralConversionRate: 67,
    churnRate: 4.2,
    netRevenueRetention: 112,
  }

  // Reconciliation entries
  const reconciliation: ReconciliationEntry[] = []
  clients.forEach(client => {
    months.forEach((month, mi) => {
      const clientInvs = invoices.filter(i => i.clientId === client.id && i.month === month)
      if (clientInvs.length === 0) return
      const inv = clientInvs[0]
      const metaVariance = Math.round((Math.random() - 0.4) * 80)
      const googleVariance = Math.round((Math.random() - 0.4) * 50)
      reconciliation.push({
        id: `rec-meta-${client.id}-${mi}`,
        clientId: client.id,
        clientName: client.facilityName,
        month,
        platform: 'meta',
        invoicedAmount: inv.metaSpend,
        actualSpend: inv.metaSpend + metaVariance,
        variance: metaVariance,
        variancePct: inv.metaSpend > 0 ? (metaVariance / inv.metaSpend) * 100 : 0,
        status: Math.abs(metaVariance) < 20 ? 'matched' : metaVariance > 0 ? 'under' : 'over',
        notes: Math.abs(metaVariance) < 20 ? 'Within tolerance' : metaVariance > 0 ? 'Actual spend exceeded invoice — adjust next month' : 'Under-spent — credit next invoice',
      })
      reconciliation.push({
        id: `rec-google-${client.id}-${mi}`,
        clientId: client.id,
        clientName: client.facilityName,
        month,
        platform: 'google',
        invoicedAmount: inv.googleSpend,
        actualSpend: inv.googleSpend + googleVariance,
        variance: googleVariance,
        variancePct: inv.googleSpend > 0 ? (googleVariance / inv.googleSpend) * 100 : 0,
        status: Math.abs(googleVariance) < 15 ? 'matched' : googleVariance > 0 ? 'under' : 'over',
        notes: Math.abs(googleVariance) < 15 ? 'Within tolerance' : googleVariance > 0 ? 'Budget pacing exceeded target' : 'Under-delivery — credit applied',
      })
    })
  })

  // Dunning steps for overdue/sent invoices
  const dunning: DunningStep[] = []
  invoices.filter(i => ['sent', 'overdue'].includes(i.status)).forEach((inv) => {
    const dueDate = new Date(inv.dueDate)
    const now = new Date()
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000))
    const steps: { type: DunningStep['type']; dayOffset: number; subject: string }[] = [
      { type: 'email_reminder', dayOffset: -3, subject: `Invoice ${inv.invoiceNumber} due in 3 days` },
      { type: 'email_reminder', dayOffset: 1, subject: `Invoice ${inv.invoiceNumber} is now past due` },
      { type: 'email_warning', dayOffset: 7, subject: `Second reminder: Invoice ${inv.invoiceNumber} is 7 days overdue` },
      { type: 'phone_call', dayOffset: 14, subject: `Phone follow-up: Invoice ${inv.invoiceNumber} — 14 days overdue` },
      { type: 'pause_service', dayOffset: 30, subject: `Service pause warning: Invoice ${inv.invoiceNumber} — 30 days overdue` },
      { type: 'final_notice', dayOffset: 45, subject: `Final notice: Invoice ${inv.invoiceNumber} — 45 days overdue` },
    ]
    steps.forEach((step, si) => {
      const scheduledDate = new Date(dueDate.getTime() + step.dayOffset * 86400000)
      dunning.push({
        id: `dun-${inv.id}-${si}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        stepNumber: si + 1,
        type: step.type,
        scheduledDate: scheduledDate.toISOString().slice(0, 10),
        sentDate: scheduledDate < now && si < 2 ? scheduledDate.toISOString().slice(0, 10) : null,
        status: scheduledDate < now && si < 2 ? 'sent' : scheduledDate < now ? 'scheduled' : 'scheduled',
        subject: step.subject,
        daysOverdue: Math.max(0, daysOverdue - step.dayOffset),
        amount: inv.total,
      })
    })
  })

  // Payment methods
  const paymentMethods: PaymentMethod[] = clients.map((client, i) => ({
    id: `pm-${client.id}`,
    clientId: client.id,
    type: (['ach', 'credit_card', 'ach', 'wire'] as const)[i % 4],
    last4: String(4000 + i * 111).slice(-4),
    brand: (['Bank of America', 'Visa', 'Chase', 'Wire'] as const)[i % 4],
    expiry: i % 4 === 1 ? '12/27' : '',
    isDefault: true,
    autopay: i % 2 === 0,
  }))

  // P&L data
  const plData: PLData = {
    revenue: [
      { category: 'Revenue', subcategory: 'Management Fees', amount: totalMgmtFees, prevAmount: totalMgmtFees * 0.85, pctChange: 17.6 },
      { category: 'Revenue', subcategory: 'Ad Spend Markup', amount: totalMarkup, prevAmount: totalMarkup * 0.82, pctChange: 22.0 },
      { category: 'Revenue', subcategory: 'Setup Fees', amount: clients.length * 750, prevAmount: Math.max(0, clients.length - 1) * 750, pctChange: clients.length > 1 ? 100 : 0 },
      { category: 'Revenue', subcategory: 'Call Tracking', amount: clients.length * 75, prevAmount: Math.max(0, clients.length - 1) * 75, pctChange: clients.length > 1 ? 33 : 0 },
      { category: 'Revenue', subcategory: 'Creative Services', amount: clients.length * 200, prevAmount: Math.max(0, clients.length - 1) * 150, pctChange: 33 },
      { category: 'Revenue', subcategory: 'CC Rewards (2%)', amount: Math.round(totalAdSpend * 0.02), prevAmount: Math.round(totalAdSpend * 0.85 * 0.02), pctChange: 17.6 },
    ],
    cogs: [
      { category: 'COGS', subcategory: 'Ad Platform Spend (pass-through)', amount: totalAdSpend, prevAmount: totalAdSpend * 0.85, pctChange: 17.6 },
      { category: 'COGS', subcategory: 'Twilio / Call Tracking', amount: clients.length * 30, prevAmount: Math.max(0, clients.length - 1) * 30, pctChange: 33 },
      { category: 'COGS', subcategory: 'Resend / Email', amount: 25, prevAmount: 20, pctChange: 25 },
    ],
    opex: [
      { category: 'Operating Expenses', subcategory: 'Salaries & Contractors', amount: 6500, prevAmount: 5500, pctChange: 18.2 },
      { category: 'Operating Expenses', subcategory: 'Software & Tools', amount: 450, prevAmount: 380, pctChange: 18.4 },
      { category: 'Operating Expenses', subcategory: 'Hosting (Vercel/CF)', amount: 45, prevAmount: 20, pctChange: 125 },
      { category: 'Operating Expenses', subcategory: 'Insurance', amount: 200, prevAmount: 200, pctChange: 0 },
      { category: 'Operating Expenses', subcategory: 'Legal / Accounting', amount: 300, prevAmount: 300, pctChange: 0 },
      { category: 'Operating Expenses', subcategory: 'Conference / Travel', amount: 400, prevAmount: 250, pctChange: 60 },
    ],
  }

  return { clients, invoices, referrals, metrics, reconciliation, dunning, paymentMethods, plData }
}
