import { useState } from 'react'
import {
  Building2, CreditCard, FileText, Settings, LogOut, BarChart2,
  DollarSign, TrendingUp, Calendar, Plus, ChevronRight, Download,
  Mail, Phone, MapPin, Globe, Edit3, Save, User, Bell, CheckCircle2,
  Clock, ArrowUpRight, Shield, Zap
} from 'lucide-react'

const BRAND = 'StowStack'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/* ── Overview Tab ── */
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { label: 'Active Campaigns', value: '3', icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50' },
          { label: 'Leads This Month', value: '47', icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Monthly Spend', value: '$1,500', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Next Invoice', value: 'Mar 15', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-5 card-hover animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center`}>
                <m.icon size={18} className={m.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { text: 'Campaign "Drive-Up 10x20 Prospecting" performance updated', time: '2 hours ago', icon: TrendingUp },
            { text: 'Invoice #INV-2026-0012 generated for March billing cycle', time: '1 day ago', icon: FileText },
            { text: 'New lead form submission from Facebook campaign', time: '1 day ago', icon: User },
            { text: 'Retargeting audience refreshed with 340 new visitors', time: '3 days ago', icon: Zap },
            { text: 'Monthly performance report ready for download', time: '5 days ago', icon: BarChart2 },
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <a.icon size={14} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{a.text}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-dark rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-300 mb-3">Questions about your campaigns?</p>
        <p className="text-xs text-slate-400">Reach your account manager directly at <span className="text-brand-400">support@stowstack.com</span> or call during business hours.</p>
      </div>
    </div>
  )
}

/* ── Billing Tab ── */
function BillingTab() {
  const [showAdd, setShowAdd] = useState(false)
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">Payment Methods</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 cursor-pointer">
            <Plus size={14} /> Add Method
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
              <CreditCard size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Visa ending in 4242</p>
              <p className="text-xs text-slate-500">Expires 09/2027</p>
            </div>
            <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">Default</span>
          </div>
        </div>
        {showAdd && (
          <div className="mt-4 border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50 animate-fade-up">
            <p className="text-sm font-medium text-slate-700 mb-3">Add a new payment method</p>
            <div className="space-y-3">
              <input placeholder="Cardholder Name" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              <input placeholder="Card Number" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="MM/YY" className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
                <input placeholder="CVC" className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <button className="gradient-brand text-white px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition-all">Save Card</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Current Plan</h3>
        <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl p-5">
          <div>
            <p className="font-semibold text-slate-900">Growth Plan</p>
            <p className="text-sm text-slate-600 mt-0.5">Full-funnel Meta campaigns with retargeting</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">$1,500<span className="text-sm font-normal text-slate-500">/mo</span></p>
            <p className="text-xs text-brand-600 font-medium">Active</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Invoices Tab ── */
function InvoicesTab() {
  const invoices = [
    { id: 'INV-2026-0012', date: 'Mar 1, 2026', amount: '$1,500.00', status: 'Pending' },
    { id: 'INV-2026-0011', date: 'Feb 1, 2026', amount: '$1,500.00', status: 'Paid' },
    { id: 'INV-2026-0010', date: 'Jan 1, 2026', amount: '$1,500.00', status: 'Paid' },
    { id: 'INV-2025-0009', date: 'Dec 1, 2025', amount: '$1,500.00', status: 'Paid' },
    { id: 'INV-2025-0008', date: 'Nov 1, 2025', amount: '$750.00', status: 'Paid' },
    { id: 'INV-2025-0007', date: 'Oct 1, 2025', amount: '$750.00', status: 'Paid' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Invoice History</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{inv.id}</p>
                <p className="text-xs text-slate-500">{inv.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold text-slate-900">{inv.amount}</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                inv.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}>{inv.status}</span>
              <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Business Info Tab ── */
function BusinessInfoTab() {
  const [editing, setEditing] = useState(false)
  const [info, setInfo] = useState({
    facilityName: 'Sunrise Self Storage',
    address: '1234 Main St, Detroit, MI 48201',
    phone: '(313) 555-0192',
    email: 'manager@sunriseselfstorage.com',
    website: 'sunriseselfstorage.com',
    totalUnits: '320',
    occupancy: '76%',
    unitTypes: 'Drive-Up, Climate Controlled, Outdoor Parking',
    notes: 'Primary vacancy in climate-controlled 5x10 and 10x10 units. Looking to improve lease-up velocity on new Phase 2 building.',
  })

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">Facility Information</h3>
          <button onClick={() => setEditing(!editing)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 cursor-pointer">
            {editing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Facility Name', key: 'facilityName', icon: Building2 },
            { label: 'Address', key: 'address', icon: MapPin },
            { label: 'Phone', key: 'phone', icon: Phone },
            { label: 'Email', key: 'email', icon: Mail },
            { label: 'Website', key: 'website', icon: Globe },
            { label: 'Total Units', key: 'totalUnits', icon: Building2 },
            { label: 'Current Occupancy', key: 'occupancy', icon: TrendingUp },
            { label: 'Unit Types', key: 'unitTypes', icon: Settings },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <f.icon size={12} /> {f.label}
              </label>
              {editing ? (
                <input
                  value={info[f.key]}
                  onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-slate-900"
                />
              ) : (
                <p className="text-sm text-slate-900 py-2.5">{info[f.key]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Notes / Context for Our Team</h3>
        <p className="text-xs text-slate-500 mb-3">Share anything that helps us run better campaigns: vacancy details, competitor info, seasonal trends, special situations.</p>
        {editing ? (
          <textarea
            value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 text-slate-900 resize-none"
          />
        ) : (
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 leading-relaxed">{info.notes}</p>
        )}
      </div>
    </div>
  )
}

/* ── Settings Tab ── */
function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'Weekly Performance Summary', desc: 'Receive a weekly email with campaign highlights', on: true },
            { label: 'New Lead Alerts', desc: 'Get notified when new leads come in from your campaigns', on: true },
            { label: 'Invoice Notifications', desc: 'Email alerts when new invoices are generated', on: true },
            { label: 'Campaign Updates', desc: 'Updates when we make changes to your campaign strategy', on: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{n.label}</p>
                <p className="text-xs text-slate-500">{n.desc}</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${n.on ? 'bg-brand-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${n.on ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Account Security</h3>
        <div className="space-y-3">
          <button className="text-sm text-brand-600 hover:text-brand-700 font-medium cursor-pointer">Change Password</button>
          <p className="text-xs text-slate-400">Last password change: 45 days ago</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Portal ── */
export default function ClientPortal({ onLogout }) {
  const [tab, setTab] = useState('overview')
  const stored = JSON.parse(localStorage.getItem('stowstack_client') || '{}')

  const content = {
    overview: <OverviewTab />,
    billing: <BillingTab />,
    invoices: <InvoicesTab />,
    business: <BusinessInfoTab />,
    settings: <SettingsTab />,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{BRAND}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative text-slate-400 hover:text-slate-600 cursor-pointer">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700">
                  {(stored.name || 'U')[0].toUpperCase()}
                </div>
                <span className="text-slate-700 font-medium hidden sm:inline">{stored.email || 'Client'}</span>
              </div>
              <button onClick={onLogout} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <nav className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {TABS.map((t) => (
                <button
                  key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all cursor-pointer ${
                    tab === t.id ? 'bg-brand-50 text-brand-700 font-semibold border-l-2 border-brand-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{TABS.find(t => t.id === tab)?.label}</h2>
            </div>
            {content[tab]}
          </main>
        </div>
      </div>
    </div>
  )
}
