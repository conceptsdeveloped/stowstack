import { useState, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, Users, Gift,
  Receipt, Plus, ChevronDown, ChevronUp, Send, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Percent, CreditCard, Building2,
  Calendar, FileText, Download, Wallet, Banknote, BadgeDollarSign,
  Landmark, PiggyBank, CircleDollarSign, BarChart3, Trophy, Star,
  Layers, Zap, Crown, Gem, Sparkles, RefreshCw, Copy,
  UserPlus, Share2, Handshake, Target, Calculator,
  Scale, Phone, Pause, Mail, ShieldAlert, ArrowDown, ArrowUp,
  Check, Minus, ToggleLeft, ToggleRight, Banknote as Bank,
  FileSpreadsheet, Timer
} from 'lucide-react'
import { Lead } from './types'

/* ═══════════════════════════════════════════════════════════════════ */
/*  TYPES                                                             */
/* ═══════════════════════════════════════════════════════════════════ */

interface ClientAccount {
  id: string
  name: string
  facilityName: string
  location: string
  accessCode: string
  status: 'active' | 'paused' | 'churned'
  tier: 'starter' | 'growth' | 'scale' | 'enterprise'
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

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  category: 'ad_spend' | 'management_fee' | 'ad_markup' | 'setup' | 'creative' | 'landing_page' | 'call_tracking' | 'credit'
}

interface Invoice {
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

interface Referral {
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

interface FinancialMetrics {
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

interface ReconciliationEntry {
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

interface DunningStep {
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

interface PLLineItem {
  category: string
  subcategory: string
  amount: number
  prevAmount: number
  pctChange: number
}

interface PaymentMethod {
  id: string
  clientId: string
  type: 'ach' | 'credit_card' | 'wire' | 'check'
  last4: string
  brand: string
  expiry: string
  isDefault: boolean
  autopay: boolean
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  PRICING TIERS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    color: 'emerald',
    monthlyAdMin: 1000,
    monthlyAdMax: 3000,
    managementFee: 750,
    adMarkupPct: 15,
    features: ['1 facility', '2 landing pages', 'Meta ads only', 'Monthly reporting', 'Email support'],
    referralCredit: 250,
    setupFee: 500,
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    color: 'blue',
    monthlyAdMin: 3000,
    monthlyAdMax: 7500,
    managementFee: 1500,
    adMarkupPct: 12,
    features: ['Up to 3 facilities', '5 landing pages each', 'Meta + Google', 'Weekly reporting', 'Slack channel', 'Call tracking'],
    referralCredit: 500,
    setupFee: 1000,
  },
  {
    id: 'scale',
    name: 'Scale',
    icon: Crown,
    color: 'purple',
    monthlyAdMin: 7500,
    monthlyAdMax: 20000,
    managementFee: 2500,
    adMarkupPct: 10,
    features: ['Up to 10 facilities', 'Unlimited landing pages', 'All channels', 'Real-time dashboard', 'Dedicated Slack', 'Call tracking', 'A/B testing', 'Priority support'],
    referralCredit: 1000,
    setupFee: 2000,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Gem,
    color: 'amber',
    monthlyAdMin: 20000,
    monthlyAdMax: 100000,
    managementFee: 0, // custom
    adMarkupPct: 8,
    features: ['Unlimited facilities', 'White-label option', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'Quarterly business reviews', 'Custom reporting'],
    referralCredit: 2000,
    setupFee: 0, // custom
  },
]

const REFERRAL_TIERS = [
  { min: 0, max: 2, label: 'Member', rate: 250, icon: Star, color: 'slate' },
  { min: 3, max: 5, label: 'Silver', rate: 500, icon: Trophy, color: 'blue' },
  { min: 6, max: 10, label: 'Gold', rate: 1000, icon: Crown, color: 'amber' },
  { min: 11, max: Infinity, label: 'Platinum', rate: 1500, icon: Gem, color: 'purple' },
]

/* ═══════════════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

function generateMockData(leads: Lead[]) {
  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  const clients: ClientAccount[] = signedClients.map((l, i) => ({
    id: l.id,
    name: l.name,
    facilityName: l.facilityName,
    location: l.location,
    accessCode: l.accessCode!,
    status: 'active' as const,
    tier: (['starter', 'growth', 'scale', 'growth'] as const)[i % 4],
    monthlyAdBudget: [2500, 5000, 12000, 4000][i % 4],
    managementFeeRate: [750, 1500, 2500, 1500][i % 4],
    adMarkupRate: [15, 12, 10, 12][i % 4],
    signedDate: new Date(Date.now() - (90 + i * 30) * 86400000).toISOString().slice(0, 10),
    paymentTerms: 'net30' as const,
    referredBy: i > 0 ? signedClients[0]?.name || null : null,
    referralCode: `SS-${l.facilityName.replace(/\s/g, '').slice(0, 6).toUpperCase()}-${(1000 + i).toString()}`,
    creditBalance: i > 0 ? 0 : 750,
    totalSpendManaged: [2500, 5000, 12000, 4000][i % 4] * (3 + i),
    totalRevenue: ([750, 1500, 2500, 1500][i % 4] + [2500, 5000, 12000, 4000][i % 4] * ([15, 12, 10, 12][i % 4] / 100)) * (3 + i),
    facilities: [1, 2, 5, 1][i % 4],
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
  const plData = {
    revenue: [
      { category: 'Revenue', subcategory: 'Management Fees', amount: totalMgmtFees, prevAmount: totalMgmtFees * 0.85, pctChange: 17.6 },
      { category: 'Revenue', subcategory: 'Ad Spend Markup', amount: totalMarkup, prevAmount: totalMarkup * 0.82, pctChange: 22.0 },
      { category: 'Revenue', subcategory: 'Setup Fees', amount: clients.length * 750, prevAmount: Math.max(0, clients.length - 1) * 750, pctChange: clients.length > 1 ? 100 : 0 },
      { category: 'Revenue', subcategory: 'Call Tracking', amount: clients.length * 75, prevAmount: Math.max(0, clients.length - 1) * 75, pctChange: clients.length > 1 ? 33 : 0 },
      { category: 'Revenue', subcategory: 'Creative Services', amount: clients.length * 200, prevAmount: Math.max(0, clients.length - 1) * 150, pctChange: 33 },
      { category: 'Revenue', subcategory: 'CC Rewards (2%)', amount: Math.round(totalAdSpend * 0.02), prevAmount: Math.round(totalAdSpend * 0.85 * 0.02), pctChange: 17.6 },
    ] as PLLineItem[],
    cogs: [
      { category: 'COGS', subcategory: 'Ad Platform Spend (pass-through)', amount: totalAdSpend, prevAmount: totalAdSpend * 0.85, pctChange: 17.6 },
      { category: 'COGS', subcategory: 'Twilio / Call Tracking', amount: clients.length * 30, prevAmount: Math.max(0, clients.length - 1) * 30, pctChange: 33 },
      { category: 'COGS', subcategory: 'Resend / Email', amount: 25, prevAmount: 20, pctChange: 25 },
    ] as PLLineItem[],
    opex: [
      { category: 'Operating Expenses', subcategory: 'Salaries & Contractors', amount: 6500, prevAmount: 5500, pctChange: 18.2 },
      { category: 'Operating Expenses', subcategory: 'Software & Tools', amount: 450, prevAmount: 380, pctChange: 18.4 },
      { category: 'Operating Expenses', subcategory: 'Hosting (Vercel/CF)', amount: 45, prevAmount: 20, pctChange: 125 },
      { category: 'Operating Expenses', subcategory: 'Insurance', amount: 200, prevAmount: 200, pctChange: 0 },
      { category: 'Operating Expenses', subcategory: 'Legal / Accounting', amount: 300, prevAmount: 300, pctChange: 0 },
      { category: 'Operating Expenses', subcategory: 'Conference / Travel', amount: 400, prevAmount: 250, pctChange: 60 },
    ] as PLLineItem[],
  }

  return { clients, invoices, referrals, metrics, reconciliation, dunning, paymentMethods, plData }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SUB-TABS                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

type BillingSubTab = 'overview' | 'invoices' | 'clients' | 'pricing' | 'referrals' | 'projections' | 'reconciliation' | 'pnl' | 'dunning'

/* ═══════════════════════════════════════════════════════════════════ */
/*  COMPONENT                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

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
    { id: 'overview', label: 'Revenue Ops', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'clients', label: 'Client Accounts', icon: Building2 },
    { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
    { id: 'pnl', label: 'P&L', icon: FileSpreadsheet },
    { id: 'dunning', label: 'Collections', icon: ShieldAlert },
    { id: 'pricing', label: 'Pricing & Tiers', icon: Layers },
    { id: 'referrals', label: 'Referral Network', icon: Share2 },
    { id: 'projections', label: 'Projections', icon: TrendingUp },
  ]

  /* ── Revenue Ops Overview ── */
  const renderOverview = () => {
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

  /* ── Invoices Tab ── */
  const renderInvoices = () => {
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

  /* ── Client Accounts ── */
  const renderClients = () => (
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

  /* ── Pricing & Tiers ── */
  const renderPricing = () => (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1">Managed Ad Spend Pricing Model</h3>
        <p className={`text-xs mb-4 ${muted}`}>
          Clients pay StowStack a single monthly invoice. We manage their ad accounts directly — better CPMs, consolidated reporting, developer-tier access.
          Every tier includes management fee + ad spend markup. Higher tiers get lower markup rates as a volume incentive.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_TIERS.map(tier => {
            const TierIcon = tier.icon
            const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
              emerald: { bg: c('bg-emerald-50', 'bg-emerald-900/10'), border: c('border-emerald-200', 'border-emerald-800'), text: 'text-emerald-700', badge: c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') },
              blue: { bg: c('bg-blue-50', 'bg-blue-900/10'), border: c('border-blue-200', 'border-blue-800'), text: 'text-blue-700', badge: c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') },
              purple: { bg: c('bg-purple-50', 'bg-purple-900/10'), border: c('border-purple-200', 'border-purple-800'), text: 'text-purple-700', badge: c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400') },
              amber: { bg: c('bg-amber-50', 'bg-amber-900/10'), border: c('border-amber-200', 'border-amber-800'), text: 'text-amber-700', badge: c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') },
            }
            const colors = colorMap[tier.color]
            const clientsOnTier = clients.filter(c => c.tier === tier.id).length

            return (
              <div key={tier.id} className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TierIcon size={18} className={colors.text} />
                  <h4 className={`font-bold text-sm ${colors.text}`}>{tier.name}</h4>
                </div>
                <div className="space-y-2 mb-3">
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Monthly Ad Budget</p>
                    <p className="text-sm font-bold">${tier.monthlyAdMin.toLocaleString()} – ${tier.monthlyAdMax.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Management Fee</p>
                    <p className="text-sm font-bold">{tier.managementFee > 0 ? `$${tier.managementFee.toLocaleString()}/mo` : 'Custom'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Ad Spend Markup</p>
                    <p className="text-sm font-bold">{tier.adMarkupPct}%</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Setup Fee</p>
                    <p className="text-sm font-bold">{tier.setupFee > 0 ? `$${tier.setupFee.toLocaleString()}` : 'Custom'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Referral Credit</p>
                    <p className="text-sm font-bold">${tier.referralCredit} per signup</p>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className={colors.text} />
                      <span className="text-[10px]">{f}</span>
                    </div>
                  ))}
                </div>
                {clientsOnTier > 0 && (
                  <div className={`text-[10px] font-medium px-2 py-1 rounded-lg text-center ${colors.badge}`}>
                    {clientsOnTier} active client{clientsOnTier !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Revenue per client calc */}
                <div className={`mt-3 pt-2 border-t ${c('border-slate-200', 'border-slate-700')}`}>
                  <p className={`text-[10px] ${subtle}`}>Revenue per client/mo:</p>
                  <p className="text-xs font-bold">
                    ${(tier.managementFee + (tier.monthlyAdMin + tier.monthlyAdMax) / 2 * tier.adMarkupPct / 100).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unit Economics */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Calculator size={16} className="text-blue-600" />
          Unit Economics by Tier
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                {['Tier', 'Avg Ad Spend', 'Mgmt Fee', 'Markup', 'Total Rev/Client', 'Margin', 'Break-even'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-medium ${muted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_TIERS.map(tier => {
                const avgSpend = (tier.monthlyAdMin + tier.monthlyAdMax) / 2
                const markup = avgSpend * tier.adMarkupPct / 100
                const totalRev = tier.managementFee + markup
                const costPerClient = 400 // approx labor + tools
                const margin = ((totalRev - costPerClient) / totalRev * 100)
                const setupFee = tier.setupFee || 3000
                const breakeven = totalRev > costPerClient ? Math.ceil(setupFee / (totalRev - costPerClient)) : '—'

                return (
                  <tr key={tier.id} className={`border-t ${c('border-slate-100', 'border-slate-700')}`}>
                    <td className="px-3 py-2 font-semibold">{tier.name}</td>
                    <td className="px-3 py-2">${avgSpend.toLocaleString()}</td>
                    <td className="px-3 py-2">${tier.managementFee.toLocaleString()}</td>
                    <td className="px-3 py-2">${markup.toLocaleString()} ({tier.adMarkupPct}%)</td>
                    <td className="px-3 py-2 font-bold">${totalRev.toLocaleString()}/mo</td>
                    <td className="px-3 py-2">
                      <span className={margin > 60 ? 'text-emerald-600 font-semibold' : ''}>{margin.toFixed(0)}%</span>
                    </td>
                    <td className="px-3 py-2">{typeof breakeven === 'number' ? `${breakeven} mo` : breakeven}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  /* ── Referral Network ── */
  const renderReferrals = () => {
    const activeReferrals = referrals.filter(r => r.status === 'active' || r.status === 'signed')
    const totalCreditsEarned = referrals.filter(r => ['active', 'signed'].includes(r.status)).reduce((s, r) => s + r.creditAmount, 0)
    const topReferrer = clients.reduce<{ name: string; count: number } | null>((best, cl) => {
      const count = referrals.filter(r => r.referrerCode === cl.referralCode && ['active', 'signed'].includes(r.status)).length
      if (!best || count > best.count) return { name: cl.name, count }
      return best
    }, null)

    return (
      <div className="space-y-6">
        {/* How It Works */}
        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
            <Handshake size={16} className="text-amber-600" />
            Referral Network — The Storage Conference Growth Engine
          </h3>
          <p className={`text-xs mb-4 ${muted}`}>
            Self-storage is tight-knit. Operators talk at SSA, ISS World, state expos, and REIA meetups.
            One happy client at a conference table of 8 operators is your best sales channel.
            Make it easy and rewarding to refer.
          </p>

          <div className="grid sm:grid-cols-4 gap-3 mb-4">
            {[
              { step: '1', title: 'Client Gets Unique Code', desc: 'Every signed client gets a referral code. Printed on business cards, shared at conferences.', icon: Gift },
              { step: '2', title: 'Referred Operator Signs Up', desc: 'New operator submits an audit using the referral code. We track attribution.', icon: UserPlus },
              { step: '3', title: 'Both Earn Credits', desc: 'Referrer gets invoice credit. New client gets discount on first month.', icon: BadgeDollarSign },
              { step: '4', title: 'Tier Up for More', desc: 'More referrals = higher tier = bigger credits per referral. Platinum = $1,500/ref.', icon: Trophy },
            ].map(s => (
              <div key={s.step} className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{s.step}</span>
                  <s.icon size={14} className={muted} />
                </div>
                <p className="text-xs font-semibold mb-0.5">{s.title}</p>
                <p className={`text-[10px] ${subtle}`}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Referral Tiers */}
          <h4 className={`text-xs font-semibold mb-2 ${muted}`}>REFERRAL REWARD TIERS</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REFERRAL_TIERS.map(tier => {
              const TierIcon = tier.icon
              return (
                <div key={tier.label} className={`rounded-lg border p-3 text-center ${c('border-slate-100', 'border-slate-700')}`}>
                  <TierIcon size={20} className={`mx-auto mb-1 ${
                    tier.color === 'slate' ? 'text-slate-400' :
                    tier.color === 'blue' ? 'text-blue-500' :
                    tier.color === 'amber' ? 'text-amber-500' :
                    'text-purple-500'
                  }`} />
                  <p className="text-xs font-bold">{tier.label}</p>
                  <p className={`text-[10px] ${subtle}`}>{tier.min}–{tier.max === Infinity ? '∞' : tier.max} referrals</p>
                  <p className="text-sm font-bold text-emerald-600">${tier.rate}/ref</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals', value: referrals.length },
            { label: 'Converted', value: activeReferrals.length },
            { label: 'Credits Earned', value: `$${totalCreditsEarned.toLocaleString()}` },
            { label: 'Top Referrer', value: topReferrer ? `${topReferrer.name} (${topReferrer.count})` : '—' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
              <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
              <p className="text-lg font-bold">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Referral Log */}
        <div className={`rounded-xl border ${card}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${c('border-slate-100', 'border-slate-700')}`}>
            <h3 className="font-semibold text-sm">Referral Activity</h3>
            <button onClick={() => setShowNewReferral(!showNewReferral)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              <Plus size={14} /> Log Referral
            </button>
          </div>

          {showNewReferral && (
            <div className={`px-4 py-3 border-b ${c('border-slate-100 bg-slate-50', 'border-slate-700 bg-slate-800/50')}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <select className={`text-xs px-2 py-1.5 rounded-lg border ${input}`}>
                  <option value="">Referring Client...</option>
                  {clients.map(c => <option key={c.id} value={c.referralCode}>{c.facilityName}</option>)}
                </select>
                <input type="text" placeholder="Referred Name" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
                <input type="email" placeholder="Referred Email" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
                <input type="text" placeholder="Source (conference, etc.)" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">Log Referral</button>
                <button onClick={() => setShowNewReferral(false)} className={`px-3 py-1.5 text-xs ${muted}`}>Cancel</button>
              </div>
            </div>
          )}

          {referrals.length === 0 ? (
            <div className={`px-4 py-12 text-center ${muted}`}>
              <Share2 size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No referrals yet</p>
              <p className={`text-xs mt-1 ${subtle}`}>Share referral codes at your next storage conference</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {referrals.map(ref => (
                <div key={ref.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      ref.status === 'active' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                      ref.status === 'signed' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                      ref.status === 'pending' ? c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') :
                      c('bg-slate-100 text-slate-500', 'bg-slate-700 text-slate-400')
                    }`}>
                      {ref.referredName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{ref.referredName}</p>
                      <p className={`text-[10px] ${subtle}`}>
                        Referred by {ref.referrerName} — {ref.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600">${ref.creditAmount}</p>
                      <p className={`text-[10px] ${subtle}`}>{ref.createdAt}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      ref.status === 'active' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                      ref.status === 'signed' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                      ref.status === 'pending' ? c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') :
                      c('bg-slate-100 text-slate-500', 'bg-slate-700 text-slate-400')
                    }`}>{ref.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conference Playbook */}
        <div className={`rounded-xl border p-5 ${card}`}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Target size={16} className="text-purple-600" />
            Conference Referral Playbook
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className={`text-xs font-semibold mb-2`}>BEFORE THE EVENT</h4>
              <ul className="space-y-1">
                {[
                  'Print referral code cards for every active client attending',
                  'Pre-load referral landing page with conference-specific offer',
                  'Brief clients on the credit they earn per referral',
                  'Set up QR code linking to audit form with ref code pre-filled',
                ].map(item => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className={`text-[11px] ${muted}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`text-xs font-semibold mb-2`}>AT THE EVENT</h4>
              <ul className="space-y-1">
                {[
                  'Clients introduce you as "their ad guy who actually tracks move-ins"',
                  'Show the operator dashboard on your phone — live data sells',
                  'Collect business cards and log as referrals immediately',
                  'Offer "conference special" — waived setup fee for signed referrals',
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

  /* ── Projections ── */
  const renderProjections = () => {
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

  /* ── Ad Spend Reconciliation ── */
  const renderReconciliation = () => {
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

  /* ── P&L Statement ── */
  const renderPnL = () => {
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
                <p className={`text-[9px] mt-0.5 ${r.ok ? 'text-emerald-600' : subtle}`}>Target: {r.target} {r.ok ? '✓' : ''}</p>
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

  /* ── Dunning & Collections ── */
  const renderDunning = () => {
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

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                           */
  /* ═══════════════════════════════════════════════════════════════════ */

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

      {subTab === 'overview' && renderOverview()}
      {subTab === 'invoices' && renderInvoices()}
      {subTab === 'clients' && renderClients()}
      {subTab === 'reconciliation' && renderReconciliation()}
      {subTab === 'pnl' && renderPnL()}
      {subTab === 'dunning' && renderDunning()}
      {subTab === 'pricing' && renderPricing()}
      {subTab === 'referrals' && renderReferrals()}
      {subTab === 'projections' && renderProjections()}
    </div>
  )
}
