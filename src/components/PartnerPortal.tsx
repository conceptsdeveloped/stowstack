import { useState, useEffect, useCallback } from 'react'
import {
  Building2, DollarSign, Users, BarChart3, ArrowLeft, Loader2, LogOut, Settings,
  CheckCircle2, Palette, Target, ArrowUpRight, ArrowDownRight, Minus,
  BadgeDollarSign, AlertTriangle, Gauge, Lock, Eye, EyeOff, Shield, Code2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PartnerLoginComponent from './partner/PartnerLogin'
import {
  type OrgFacility, type Organization, type AuthState,
  STATUS_COLORS, PER_FACILITY_MRR, getRevShareTier,
} from './partner/PartnerTypes'
import { StatCard, FacilityRow, FacilityDetail } from './partner/FacilityCard'
import TeamTab from './partner/TeamTab'
import RevenueShareTab from './partner/RevenueShareTab'
import DeveloperTab from './partner/DeveloperTab'
import { useAuth } from '../contexts/AuthContext'

/* ── Branding Tab (kept inline) ── */

function BrandingTab({ org, onUpdate }: { org: Organization; onUpdate: (org: Organization) => void }) {
  const { authFetch } = useAuth()
  const [name, setName] = useState(org.name)
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor)
  const [accentColor, setAccentColor] = useState(org.accentColor)
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, primaryColor, accentColor, logoUrl: logoUrl || null }),
      })
      if (res.ok) {
        await res.json()
        onUpdate({ ...org, name, primaryColor, accentColor, logoUrl: logoUrl || null })
        setSaved(true); setTimeout(() => setSaved(false), 2000)
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Branding &amp; White-Label</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
          <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className={inputCls} />
          {logoUrl && (
            <div className="mt-2 p-3 bg-slate-50 rounded-lg">
              <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {([['Primary Color', primaryColor, setPrimaryColor], ['Accent Color', accentColor, setAccentColor]] as const).map(([label, val, setter]) => (
            <div key={label}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={val} onChange={e => setter(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <input type="text" value={val} onChange={e => setter(e.target.value)} className={`flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20`} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="h-12 flex items-center px-4 gap-3" style={{ background: primaryColor }}>
              {logoUrl ? <img src={logoUrl} alt="" className="h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} /> : <Building2 size={18} className="text-white" />}
              <span className="text-white font-semibold text-sm">{name}</span>
            </div>
            <div className="p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: primaryColor }}>Primary</button>
                <button className="px-3 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: accentColor }}>Accent</button>
                <span className="text-xs text-slate-500 ml-2">Button preview</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>}
        </div>
      </div>
    </div>
  )
}

/* ── Settings Tab ── */

function SettingsTab({ org, facilities }: { org: Organization; facilities: OrgFacility[] }) {
  const { authFetch } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setPwMessage({ type: 'error', text: 'Password must be at least 8 characters' }); return }
    if (newPassword !== confirmPassword) { setPwMessage({ type: 'error', text: 'Passwords do not match' }); return }
    setPwLoading(true); setPwMessage(null)
    try {
      const res = await authFetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_password', currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setPwMessage({ type: 'error', text: data.error || 'Failed to change password' }) }
      else { setPwMessage({ type: 'success', text: 'Password updated successfully' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
    } catch { setPwMessage({ type: 'error', text: 'Connection error' }) }
    setPwLoading(false)
  }

  const PLAN_FEATURES: Record<string, { label: string; features: string[] }> = {
    starter: { label: 'Starter', features: ['Up to 10 facilities', '2 landing pages each', 'Meta ads', 'Monthly reporting', 'Email support'] },
    growth: { label: 'Growth', features: ['Up to 50 facilities', '5 landing pages each', 'Meta + Google ads', 'Weekly reporting', 'Slack channel', 'Call tracking'] },
    enterprise: { label: 'Enterprise', features: ['Unlimited facilities', 'White-label option', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'] },
  }
  const currentPlan = PLAN_FEATURES[org.plan] || PLAN_FEATURES.starter
  const pwInputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'
  const openBilling = async () => {
    try {
      const res = await authFetch('/api/create-billing-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Organization Settings</h2>

      {/* Subscription & Plan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold">Subscription & Plan</h3>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold capitalize">{currentPlan.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  org.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700'
                  : org.subscriptionStatus === 'past_due' ? 'bg-amber-100 text-amber-700'
                  : org.subscriptionStatus === 'canceled' ? 'bg-red-100 text-red-700'
                  : org.subscriptionStatus === 'trialing' ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
                }`}>{org.subscriptionStatus || 'active'}</span>
              </div>
              <ul className="space-y-1 mt-2">
                {currentPlan.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 size={12} className="text-green-500" />{f}</li>
                ))}
              </ul>
            </div>
            {org.hasStripe && (
              <button onClick={openBilling} className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap">Manage Billing</button>
            )}
          </div>
          {org.facilityLimit && org.facilityLimit < 999 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Facility usage</span>
                <span className="font-medium">{facilities.length} / {org.facilityLimit}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${facilities.length >= org.facilityLimit ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (facilities.length / org.facilityLimit) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Lock size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold">Security</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Current Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={pwInputCls} placeholder="Enter current password" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">New Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={pwInputCls} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Confirm New Password</label>
            <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={pwInputCls} placeholder="Confirm new password" />
          </div>
          <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />} {showPasswords ? 'Hide' : 'Show'} passwords
          </button>
          {pwMessage && <p className={`text-xs ${pwMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{pwMessage.text}</p>}
          <button type="submit" disabled={pwLoading || !newPassword || !confirmPassword}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {pwLoading ? <Loader2 size={14} className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Organization Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold">Organization Details</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-sm text-slate-500">Organization Slug</span>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{org.slug}</code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-sm text-slate-500">White-Label</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${org.whiteLabel ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {org.whiteLabel ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">Active Facilities</span>
            <span className="text-sm font-medium">{facilities.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Partner Dashboard ── */

type PartnerTab = 'portfolio' | 'earnings' | 'benchmarks' | 'billing' | 'team' | 'branding' | 'developer' | 'settings'

function PartnerDashboardInner({ auth, onLogout, onBack }: { auth: AuthState; onLogout: () => void; onBack: () => void }) {
  const { authFetch, updateOrg } = useAuth()
  const [activeTab, setActiveTab] = useState<PartnerTab>('portfolio')
  const [facilities, setFacilities] = useState<OrgFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState<OrgFacility | null>(null)
  const [org, setOrg] = useState(auth.organization)

  const primaryColor = org.primaryColor || '#16a34a'

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await authFetch('/api/org-facilities')
      if (res.ok) { const data = await res.json(); setFacilities(data.facilities || []) }
    } catch { /* silent */ }
    setLoading(false)
  }, [authFetch])

  useEffect(() => { fetchFacilities() }, [fetchFacilities])

  const totals = facilities.reduce((acc, f) => {
    (f.campaigns || []).forEach(c => { acc.spend += Number(c.spend) || 0; acc.leads += Number(c.leads) || 0; acc.moveIns += Number(c.moveIns) || 0 })
    return acc
  }, { spend: 0, leads: 0, moveIns: 0 })
  const avgCpl = totals.leads > 0 ? totals.spend / totals.leads : 0

  const monthlyMap = new Map<string, { month: string; spend: number; leads: number; moveIns: number }>()
  facilities.forEach(f => {
    (f.campaigns || []).forEach(c => {
      const existing = monthlyMap.get(c.month) || { month: c.month, spend: 0, leads: 0, moveIns: 0 }
      existing.spend += Number(c.spend) || 0; existing.leads += Number(c.leads) || 0; existing.moveIns += Number(c.moveIns) || 0
      monthlyMap.set(c.month, existing)
    })
  })
  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
  const isAdmin = auth.user.role === 'org_admin'

  const handleOrgUpdate = (updatedOrg: Organization) => {
    setOrg(updatedOrg)
    updateOrg(updatedOrg)
  }

  const openBilling = async () => {
    try {
      const res = await authFetch('/api/create-billing-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { /* silent */ }
  }

  const TABS: [string, string, typeof BarChart3][] = [
    ['portfolio', 'Portfolio', BarChart3],
    ['earnings', 'Earnings', BadgeDollarSign],
    ['benchmarks', 'Benchmarks', Target],
    ...(isAdmin ? [['billing', 'Billing', DollarSign] as [string, string, typeof BarChart3]] : []),
    ...(isAdmin ? [['team', 'Team', Users] as [string, string, typeof BarChart3]] : []),
    ...(isAdmin ? [['branding', 'Branding', Palette] as [string, string, typeof BarChart3]] : []),
    ...(isAdmin ? [['developer', 'API', Code2] as [string, string, typeof BarChart3]] : []),
    ...(isAdmin ? [['settings', 'Settings', Settings] as [string, string, typeof BarChart3]] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft size={20} /></button>
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="h-7 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}><Building2 size={16} className="text-white" /></div>
            )}
            <div>
              <h1 className="text-base font-bold tracking-tight">{org.name}</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">{auth.user.name} — {auth.user.role === 'org_admin' ? 'Admin' : auth.user.role === 'facility_manager' ? 'Manager' : 'Viewer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider hidden sm:inline ${
              org.plan === 'enterprise' ? 'bg-amber-100 text-amber-700' : org.plan === 'growth' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>{org.plan}</span>
            <span className="text-xs text-slate-400 hidden sm:inline">{facilities.length} facilities</span>
            <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1.5"><LogOut size={14} /> Sign out</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px">
          {TABS.map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setActiveTab(id as PartnerTab); setSelectedFacility(null) }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === id ? 'text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              style={activeTab === id ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
            ><Icon size={15} />{label}</button>
          ))}
        </div>
      </header>

      {org.subscriptionStatus === 'past_due' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="text-sm text-amber-800">Your payment is past due. Please update your payment method to avoid service interruption.</p>
            </div>
            {isAdmin && org.hasStripe && (
              <button onClick={openBilling} className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">Update Payment</button>
            )}
          </div>
        </div>
      )}
      {org.subscriptionStatus === 'canceled' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm text-red-800">Your subscription has been canceled. Some features may be restricted.</p>
          </div>
        </div>
      )}

      {org.facilityLimit && org.facilityLimit < 999 && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
            <Gauge size={14} className="text-slate-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-slate-500">{facilities.length} / {org.facilityLimit} facilities used</span>
                {facilities.length >= org.facilityLimit && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Limit reached</span>}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${facilities.length >= org.facilityLimit ? 'bg-amber-500' : facilities.length >= org.facilityLimit * 0.8 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (facilities.length / org.facilityLimit) * 100)}%` }} />
              </div>
            </div>
            {isAdmin && facilities.length >= org.facilityLimit * 0.8 && org.hasStripe && (
              <button onClick={openBilling} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap">Upgrade Plan</button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'portfolio' && !selectedFacility && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Facilities" value={facilities.length.toString()} icon={Building2} color="bg-slate-700" />
              <StatCard label="Total Spend" value={`$${totals.spend.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
              <StatCard label="Total Leads" value={totals.leads.toString()} icon={Users} color="bg-indigo-500" />
              <StatCard label="Avg CPL" value={`$${avgCpl.toFixed(0)}`} icon={Target} color="bg-purple-500" />
            </div>
            {monthlyData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
                <h3 className="text-sm font-semibold mb-4">Portfolio Performance</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="leads" fill={primaryColor} radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="moveIns" fill="#10b981" radius={[4, 4, 0, 0]} name="Move-Ins" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Facilities ({facilities.length})</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : facilities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No facilities assigned yet</p>
                <p className="text-xs text-slate-400 mt-1">Contact your StowStack account manager to add facilities</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facilities.map(f => <FacilityRow key={f.id} facility={f} primaryColor={primaryColor} onSelect={() => setSelectedFacility(f)} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && selectedFacility && (
          <FacilityDetail facility={selectedFacility} primaryColor={primaryColor} onBack={() => setSelectedFacility(null)} />
        )}

        {activeTab === 'benchmarks' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Facility Benchmarks</h2>
            {facilities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <Target size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No facilities to benchmark yet</p>
              </div>
            ) : (() => {
              const benchmarks = facilities.map(f => {
                const campaigns = f.campaigns || []
                const t = campaigns.reduce((acc, c) => ({ spend: acc.spend + Number(c.spend), leads: acc.leads + Number(c.leads), moveIns: acc.moveIns + Number(c.moveIns) }), { spend: 0, leads: 0, moveIns: 0 })
                return { ...f, t, cpl: t.leads > 0 ? t.spend / t.leads : 0, cpmi: t.moveIns > 0 ? t.spend / t.moveIns : 0, roas: campaigns.length > 0 ? Number(campaigns[campaigns.length - 1].roas) : 0 }
              }).sort((a, b) => b.roas - a.roas)
              const benchAvgCpl = benchmarks.reduce((s, b) => s + b.cpl, 0) / (benchmarks.length || 1)
              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['#', 'Facility', 'Spend', 'Leads', 'CPL', 'Move-Ins', 'Cost/MI', 'ROAS', 'vs Avg CPL'].map((h, i) => (
                          <th key={h} className={`${i < 2 ? 'text-left' : 'text-right'} px-4 py-2.5 font-medium text-slate-600`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarks.map((b, i) => {
                        const diff = benchAvgCpl > 0 ? ((b.cpl - benchAvgCpl) / benchAvgCpl * 100) : 0
                        return (
                          <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className={`px-4 py-2.5 ${i === 0 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium">{b.name}<span className="block text-[10px] text-slate-400">{b.location}</span></td>
                            <td className="px-4 py-2.5 text-right">${b.t.spend.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right">{b.t.leads}</td>
                            <td className="px-4 py-2.5 text-right">${b.cpl.toFixed(0)}</td>
                            <td className="px-4 py-2.5 text-right">{b.t.moveIns}</td>
                            <td className="px-4 py-2.5 text-right">${b.cpmi.toFixed(0)}</td>
                            <td className={`px-4 py-2.5 text-right font-medium ${b.roas >= 3 ? 'text-green-600' : ''}`}>{b.roas.toFixed(1)}x</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-xs font-medium ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {diff < 0 ? <ArrowDownRight size={10} className="inline" /> : diff > 0 ? <ArrowUpRight size={10} className="inline" /> : <Minus size={10} className="inline" />}
                                {' '}{Math.abs(diff).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}

        {activeTab === 'earnings' && <RevenueShareTab facilities={facilities} />}

        {activeTab === 'billing' && isAdmin && (() => {
          const PLAN_PRICING: Record<string, number> = { starter: 499, growth: 1499, enterprise: 3999 }
          const baseFee = PLAN_PRICING[org.plan] || 499
          const perFacility = 99
          const totalMonthly = baseFee + perFacility * facilities.length
          const tier = getRevShareTier(facilities.length)
          const revShareEarnings = facilities.length * PER_FACILITY_MRR * (tier.pct / 100)
          const netCost = totalMonthly - revShareEarnings
          return (
            <div>
              <h2 className="text-lg font-bold mb-4">Billing</h2>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><BadgeDollarSign size={20} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-emerald-800">Revenue Share Credit</div>
                    <div className="text-xs text-emerald-600">{tier.name} tier &mdash; {tier.pct}% on {facilities.length} facilities</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-600">-${revShareEarnings.toLocaleString()}/mo</div>
                  <div className="text-[10px] text-emerald-500">applied to your bill</div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Platform Fee</p>
                  <p className="text-xl font-bold">${baseFee}/mo</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{org.plan} plan</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Facility Fees</p>
                  <p className="text-xl font-bold">${(perFacility * facilities.length).toLocaleString()}/mo</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{facilities.length} x ${perFacility}</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                  <p className="text-xs text-emerald-600 mb-1">Rev Share Credit</p>
                  <p className="text-xl font-bold text-emerald-600">-${revShareEarnings.toLocaleString()}/mo</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">{tier.pct}% rev share</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm" style={{ borderColor: primaryColor + '40' }}>
                  <p className="text-xs text-slate-500 mb-1">Net Monthly Cost</p>
                  <p className="text-xl font-bold" style={{ color: primaryColor }}>${netCost.toLocaleString()}/mo</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">excl. ad spend</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-sm font-semibold px-4 py-3 border-b border-slate-100">Per-Facility Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2 font-medium text-slate-600">Facility</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">Ad Spend (All Time)</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">Platform Fee</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">Your Earnings</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map(f => {
                      const totalSpend = (f.campaigns || []).reduce((s, c) => s + Number(c.spend), 0)
                      const facilityEarning = PER_FACILITY_MRR * (tier.pct / 100)
                      return (
                        <tr key={f.id} className="border-b border-slate-50">
                          <td className="px-4 py-2.5 font-medium">{f.name}<span className="block text-[10px] text-slate-400">{f.location}</span></td>
                          <td className="px-4 py-2.5 text-right">${totalSpend.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">${perFacility}/mo</td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-600">+${facilityEarning.toFixed(2)}/mo</td>
                          <td className="px-4 py-2.5 text-right"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>{f.status}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>Totals</td>
                      <td className="px-4 py-3 text-right">${totalMonthly.toLocaleString()}/mo</td>
                      <td className="px-4 py-3 text-right text-emerald-600">+${revShareEarnings.toLocaleString()}/mo</td>
                      <td className="px-4 py-3 text-right">Net: ${netCost.toLocaleString()}/mo</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        })()}

        {activeTab === 'team' && isAdmin && <TeamTab orgUser={auth.user} primaryColor={primaryColor} />}
        {activeTab === 'branding' && isAdmin && <BrandingTab org={org} onUpdate={handleOrgUpdate} />}
        {activeTab === 'developer' && isAdmin && <DeveloperTab primaryColor={primaryColor} />}
        {activeTab === 'settings' && isAdmin && <SettingsTab org={org} facilities={facilities} />}
      </div>

      {!org.whiteLabel && (
        <div className="border-t border-slate-200 py-4 text-center">
          <p className="text-xs text-slate-400">Powered by StowStack</p>
        </div>
      )}
    </div>
  )
}

/* ── Export ── */

export default function PartnerPortal({ onBack }: { onBack: () => void }) {
  const { auth, isLoading, login, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!auth) return <PartnerLoginComponent onLogin={login} />
  return <PartnerDashboardInner auth={auth} onLogout={logout} onBack={onBack} />
}
