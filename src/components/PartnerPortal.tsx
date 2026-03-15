import { useState, useEffect, useCallback } from 'react'
import {
  Building2, DollarSign, Users, BarChart3,
  ArrowLeft, Loader2, LogOut, MapPin, Settings,
  UserPlus, Trash2, ChevronRight, Mail,
  Target, CheckCircle2, Palette,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

/* ── Types ── */

interface OrgUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  last_login_at: string | null
  created_at: string
}

interface OrgFacility {
  id: string
  name: string
  location: string
  status: string
  occupancy_range: string
  total_units: string
  google_rating: number | null
  review_count: number | null
  created_at: string
  campaigns: CampaignEntry[] | null
  live_pages: number
  live_ads: number
}

interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  roas: number
  occupancyDelta: number
}

interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  whiteLabel: boolean
  plan: string
  settings: Record<string, unknown>
}

interface AuthState {
  token: string
  user: { id: string; email: string; name: string; role: string }
  organization: Organization
}

/* ── Constants ── */

const STORAGE_KEY = 'stowstack_partner'

const OCCUPANCY_LABELS: Record<string, string> = {
  'below-60': 'Below 60%',
  '60-75': '60–75%',
  '75-85': '75–85%',
  '85-95': '85–95%',
  'above-95': 'Above 95%',
}

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-slate-100 text-slate-600',
  scraped: 'bg-blue-100 text-blue-700',
  briefed: 'bg-indigo-100 text-indigo-700',
  generating: 'bg-purple-100 text-purple-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  live: 'bg-green-100 text-green-700',
  reporting: 'bg-teal-100 text-teal-700',
}

/* ── Login ── */

function PartnerLogin({ onAuth }: { onAuth: (auth: AuthState) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !orgSlug.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim(), password: password.trim(), orgSlug: orgSlug.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      onAuth(data)
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Partner Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your management dashboard</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder="Organization slug"
            value={orgSlug}
            onChange={e => setOrgSlug(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Stat Card ── */

function StatCard({ label, value, icon: Icon, trend, color }: { label: string; value: string; icon: typeof DollarSign; trend?: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

/* ── Facility Row ── */

function FacilityRow({ facility, primaryColor, onSelect }: { facility: OrgFacility; primaryColor: string; onSelect: () => void }) {
  const campaigns = facility.campaigns || []
  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + (Number(c.spend) || 0),
    leads: acc.leads + (Number(c.leads) || 0),
    moveIns: acc.moveIns + (Number(c.moveIns) || 0),
  }), { spend: 0, leads: 0, moveIns: 0 })
  const latestRoas = campaigns.length > 0 ? campaigns[campaigns.length - 1].roas : 0

  return (
    <button onClick={onSelect} className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-left">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{facility.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[facility.status] || 'bg-slate-100 text-slate-600'}`}>
              {facility.status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <MapPin size={11} />
            {facility.location}
            {facility.total_units && <span className="text-slate-300">|</span>}
            {facility.total_units && <span>{facility.total_units} units</span>}
            {facility.google_rating && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-amber-600">{facility.google_rating} ({facility.review_count})</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-600"><span className="font-medium text-slate-900">${totals.spend.toLocaleString()}</span> spend</span>
            <span className="text-slate-600"><span className="font-medium text-slate-900">{totals.leads}</span> leads</span>
            <span className="text-slate-600"><span className="font-medium text-slate-900">{totals.moveIns}</span> move-ins</span>
            {latestRoas > 0 && <span className="text-slate-600"><span className="font-medium" style={{ color: primaryColor }}>{latestRoas}x</span> ROAS</span>}
            {facility.live_pages > 0 && <span className="text-slate-400">{facility.live_pages} pages</span>}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 mt-1 shrink-0" />
      </div>
    </button>
  )
}

/* ── Facility Detail ── */

function FacilityDetail({ facility, primaryColor, onBack }: { facility: OrgFacility; primaryColor: string; onBack: () => void }) {
  const campaigns = facility.campaigns || []
  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + (Number(c.spend) || 0),
    leads: acc.leads + (Number(c.leads) || 0),
    moveIns: acc.moveIns + (Number(c.moveIns) || 0),
  }), { spend: 0, leads: 0, moveIns: 0 })
  const avgCpl = totals.leads > 0 ? totals.spend / totals.leads : 0
  const avgCpmi = totals.moveIns > 0 ? totals.spend / totals.moveIns : 0

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to portfolio
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
          <Building2 size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{facility.name}</h2>
          <p className="text-xs text-slate-500">{facility.location} {facility.occupancy_range && `| ${OCCUPANCY_LABELS[facility.occupancy_range] || facility.occupancy_range} occupancy`}</p>
        </div>
        <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[facility.status] || 'bg-slate-100 text-slate-600'}`}>
          {facility.status}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Spend" value={`$${totals.spend.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
        <StatCard label="Total Leads" value={totals.leads.toString()} icon={Users} color="bg-indigo-500" />
        <StatCard label="Move-Ins" value={totals.moveIns.toString()} icon={CheckCircle2} color="bg-green-500" />
        <StatCard label="Avg CPL" value={`$${avgCpl.toFixed(0)}`} icon={Target} color="bg-purple-500" />
      </div>

      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
          <h3 className="text-sm font-semibold mb-4">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={campaigns}>
              <defs>
                <linearGradient id="facilitySpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="leads" stroke={primaryColor} fill="url(#facilitySpend)" strokeWidth={2} />
              <Area type="monotone" dataKey="moveIns" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Month</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Spend</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Leads</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">CPL</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Move-Ins</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.month} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-medium">{c.month}</td>
                  <td className="px-4 py-2.5 text-right">${Number(c.spend).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">{c.leads}</td>
                  <td className="px-4 py-2.5 text-right">${Number(c.cpl).toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-right">{c.moveIns}</td>
                  <td className="px-4 py-2.5 text-right font-medium" style={{ color: Number(c.roas) >= 3 ? '#16a34a' : undefined }}>
                    {Number(c.roas).toFixed(1)}x
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">${totals.spend.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">{totals.leads}</td>
                <td className="px-4 py-2.5 text-right">${avgCpl.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-right">{totals.moveIns}</td>
                <td className="px-4 py-2.5 text-right">${avgCpmi.toFixed(0)}/MI</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <BarChart3 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No campaign data yet for this facility</p>
          <p className="text-xs text-slate-400 mt-1">Campaign metrics will appear once campaigns are live</p>
        </div>
      )}
    </div>
  )
}

/* ── Team Tab ── */

function TeamTab({ orgToken, orgUser, primaryColor }: { orgToken: string; orgUser: AuthState['user']; primaryColor: string }) {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/org-users', { headers: { 'X-Org-Token': orgToken } })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [orgToken])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await fetch('/api/org-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Token': orgToken },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
      })
      setInviteName('')
      setInviteEmail('')
      setShowInvite(false)
      fetchUsers()
    } catch { /* silent */ }
    setInviting(false)
  }

  const removeUser = async (userId: string) => {
    if (userId === orgUser.id) return
    await fetch('/api/org-users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Org-Token': orgToken },
      body: JSON.stringify({ userId }),
    })
    fetchUsers()
  }

  const isAdmin = orgUser.role === 'org_admin'

  const ROLE_LABELS: Record<string, string> = {
    org_admin: 'Admin',
    facility_manager: 'Manager',
    viewer: 'Viewer',
  }

  const ROLE_COLORS: Record<string, string> = {
    org_admin: 'bg-purple-100 text-purple-700',
    facility_manager: 'bg-blue-100 text-blue-700',
    viewer: 'bg-slate-100 text-slate-600',
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Team Members</h2>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: primaryColor }}
          >
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={invite} className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="viewer">Viewer</option>
              <option value="facility_manager">Facility Manager</option>
              <option value="org_admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.status === 'invited' && <span className="text-[10px] text-amber-600 font-medium">Pending</span>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail size={10} /> {u.email}
                  {u.last_login_at && <span className="text-slate-300 ml-2">Last login: {new Date(u.last_login_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
            {isAdmin && u.id !== orgUser.id && (
              <button onClick={() => removeUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Remove user">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-500">No team members yet. Invite your first team member above.</div>
        )}
      </div>
    </div>
  )
}

/* ── Branding Tab ── */

function BrandingTab({ org, orgToken, onUpdate }: { org: Organization; orgToken: string; onUpdate: (org: Organization) => void }) {
  const [name, setName] = useState(org.name)
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor)
  const [accentColor, setAccentColor] = useState(org.accentColor)
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Org-Token': orgToken },
        body: JSON.stringify({ name, primaryColor, accentColor, logoUrl: logoUrl || null }),
      })
      if (res.ok) {
        await res.json()
        onUpdate({ ...org, name, primaryColor, accentColor, logoUrl: logoUrl || null })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Branding & White-Label</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {logoUrl && (
            <div className="mt-2 p-3 bg-slate-50 rounded-lg">
              <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="h-12 flex items-center px-4 gap-3" style={{ background: primaryColor }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <Building2 size={18} className="text-white" />
              )}
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
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>}
        </div>
      </div>
    </div>
  )
}

/* ── Main Partner Portal ── */

type PartnerTab = 'portfolio' | 'team' | 'branding' | 'settings'

function PartnerDashboardInner({ auth, onLogout, onBack }: { auth: AuthState; onLogout: () => void; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<PartnerTab>('portfolio')
  const [facilities, setFacilities] = useState<OrgFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState<OrgFacility | null>(null)
  const [org, setOrg] = useState(auth.organization)

  const primaryColor = org.primaryColor || '#16a34a'
  const orgToken = auth.token

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await fetch('/api/org-facilities', { headers: { 'X-Org-Token': orgToken } })
      if (res.ok) {
        const data = await res.json()
        setFacilities(data.facilities || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [orgToken])

  useEffect(() => { fetchFacilities() }, [fetchFacilities])

  // Portfolio aggregates
  const totals = facilities.reduce((acc, f) => {
    const campaigns = f.campaigns || []
    campaigns.forEach(c => {
      acc.spend += Number(c.spend) || 0
      acc.leads += Number(c.leads) || 0
      acc.moveIns += Number(c.moveIns) || 0
    })
    return acc
  }, { spend: 0, leads: 0, moveIns: 0 })
  const avgCpl = totals.leads > 0 ? totals.spend / totals.leads : 0

  // Monthly rollup for chart
  const monthlyMap = new Map<string, { month: string; spend: number; leads: number; moveIns: number }>()
  facilities.forEach(f => {
    (f.campaigns || []).forEach(c => {
      const existing = monthlyMap.get(c.month) || { month: c.month, spend: 0, leads: 0, moveIns: 0 }
      existing.spend += Number(c.spend) || 0
      existing.leads += Number(c.leads) || 0
      existing.moveIns += Number(c.moveIns) || 0
      monthlyMap.set(c.month, existing)
    })
  })
  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  const isAdmin = auth.user.role === 'org_admin'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="h-7 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
                <Building2 size={16} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-base font-bold tracking-tight">{org.name}</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">{auth.user.name} — {auth.user.role === 'org_admin' ? 'Admin' : auth.user.role === 'facility_manager' ? 'Manager' : 'Viewer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{facilities.length} facilities</span>
            <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1.5">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px">
          {([
            ['portfolio', 'Portfolio', BarChart3],
            ...(isAdmin ? [['team', 'Team', Users]] : []),
            ...(isAdmin ? [['branding', 'Branding', Palette]] : []),
            ...(isAdmin ? [['settings', 'Settings', Settings]] : []),
          ] as [string, string, typeof BarChart3][]).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id as PartnerTab); setSelectedFacility(null) }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? 'text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              style={activeTab === id ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && !selectedFacility && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Facilities" value={facilities.length.toString()} icon={Building2} color="bg-slate-700" />
              <StatCard label="Total Spend" value={`$${totals.spend.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
              <StatCard label="Total Leads" value={totals.leads.toString()} icon={Users} color="bg-indigo-500" />
              <StatCard label="Avg CPL" value={`$${avgCpl.toFixed(0)}`} icon={Target} color="bg-purple-500" />
            </div>

            {/* Portfolio chart */}
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

            {/* Facility list */}
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
                {facilities.map(f => (
                  <FacilityRow key={f.id} facility={f} primaryColor={primaryColor} onSelect={() => setSelectedFacility(f)} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && selectedFacility && (
          <FacilityDetail facility={selectedFacility} primaryColor={primaryColor} onBack={() => setSelectedFacility(null)} />
        )}

        {activeTab === 'team' && isAdmin && (
          <TeamTab orgToken={orgToken} orgUser={auth.user} primaryColor={primaryColor} />
        )}

        {activeTab === 'branding' && isAdmin && (
          <BrandingTab org={org} orgToken={orgToken} onUpdate={setOrg} />
        )}

        {activeTab === 'settings' && isAdmin && (
          <div>
            <h2 className="text-lg font-bold mb-4">Organization Settings</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium">Plan</p>
                  <p className="text-xs text-slate-500">Current subscription tier</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">{org.plan}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium">White-Label</p>
                  <p className="text-xs text-slate-500">Remove StowStack branding from all client-facing pages</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${org.whiteLabel ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {org.whiteLabel ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium">Organization Slug</p>
                  <p className="text-xs text-slate-500">Used for login and URLs</p>
                </div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{org.slug}</code>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Facilities</p>
                  <p className="text-xs text-slate-500">Active facility count</p>
                </div>
                <span className="text-sm font-medium">{facilities.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
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
  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  if (!auth) {
    return <PartnerLogin onAuth={setAuth} />
  }

  return <PartnerDashboardInner auth={auth} onLogout={handleLogout} onBack={onBack} />
}
