import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Plus, Users, Loader2, Palette, ChevronRight, ArrowLeft,
  Link2, Unlink, Search, TrendingUp, DollarSign, Target,
  CheckCircle2, AlertTriangle, BarChart3, Trophy, ArrowUpRight, ArrowDownRight, Minus,
  CreditCard, Receipt, Mail, BadgeDollarSign, Star, Award, Crown, Sparkles
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  contact_email: string | null
  billing_email: string | null
  plan: string
  white_label: boolean
  facility_limit: number
  status: string
  facility_count: number
  user_count: number
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
  campaigns: { month: string; spend: number; leads: number; cpl: number; moveIns: number; roas: number }[] | null
  live_pages: number
  live_ads: number
}

interface UnassignedFacility {
  id: string
  name: string
  location: string
  status: string
  total_units: string
}

const REV_SHARE_TIERS = [
  { name: 'Bronze', min: 1, max: 10, pct: 20, icon: Star, color: '#cd7f32' },
  { name: 'Silver', min: 11, max: 25, pct: 25, icon: Award, color: '#94a3b8' },
  { name: 'Gold', min: 26, max: 50, pct: 30, icon: Crown, color: '#eab308' },
  { name: 'Platinum', min: 51, max: Infinity, pct: 35, icon: Sparkles, color: '#8b5cf6' },
]

const PER_FACILITY_MRR = 99

function getRevShareTier(facilityCount: number) {
  return REV_SHARE_TIERS.find(t => facilityCount >= t.min && facilityCount <= t.max) || REV_SHARE_TIERS[0]
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  growth: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const PLAN_PRICING: Record<string, number> = {
  starter: 499,
  growth: 1499,
  enterprise: 3999,
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

/* ── Org Detail View ── */

function OrgDetailView({ org, adminKey, darkMode, onBack }: { org: Organization; adminKey: string; darkMode?: boolean; onBack: () => void }) {
  const [facilities, setFacilities] = useState<OrgFacility[]>([])
  const [unassigned, setUnassigned] = useState<UnassignedFacility[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'facilities' | 'benchmarks' | 'billing' | 'revshare' | 'activity'>('facilities')

  const dm = darkMode

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await fetch(`/api/org-facilities?orgId=${org.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setFacilities(data.facilities || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [org.id, adminKey])

  const fetchUnassigned = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-leads', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        const leads = data.leads || []
        // Filter to facilities not assigned to any org
        const assignedIds = new Set(facilities.map(f => f.id))
        setUnassigned(leads
          .filter((l: any) => !assignedIds.has(l.id))
          .map((l: any) => ({ id: l.id, name: l.facilityName, location: l.location, status: l.status, total_units: l.totalUnits }))
        )
      }
    } catch { /* silent */ }
  }, [adminKey, facilities])

  useEffect(() => { fetchFacilities() }, [fetchFacilities])
  useEffect(() => { if (showAssign) fetchUnassigned() }, [showAssign, fetchUnassigned])

  const assignFacility = async (facilityId: string) => {
    setAssigning(facilityId)
    try {
      await fetch('/api/org-facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId, orgId: org.id }),
      })
      fetchFacilities()
      setUnassigned(prev => prev.filter(f => f.id !== facilityId))
    } catch { /* silent */ }
    setAssigning(null)
  }

  const removeFacility = async (facilityId: string) => {
    setRemoving(facilityId)
    try {
      await fetch('/api/org-facilities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId, action: 'remove', orgId: org.id }),
      })
      fetchFacilities()
    } catch { /* silent */ }
    setRemoving(null)
  }

  // Compute benchmarks
  const benchmarks = facilities.map(f => {
    const campaigns = f.campaigns || []
    const totals = campaigns.reduce((acc, c) => ({
      spend: acc.spend + Number(c.spend),
      leads: acc.leads + Number(c.leads),
      moveIns: acc.moveIns + Number(c.moveIns),
    }), { spend: 0, leads: 0, moveIns: 0 })
    const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0
    const cpmi = totals.moveIns > 0 ? totals.spend / totals.moveIns : 0
    const latestRoas = campaigns.length > 0 ? Number(campaigns[campaigns.length - 1].roas) : 0
    return { ...f, totals, cpl, cpmi, latestRoas }
  }).sort((a, b) => b.latestRoas - a.latestRoas)

  const portfolioTotals = benchmarks.reduce((acc, b) => ({
    spend: acc.spend + b.totals.spend,
    leads: acc.leads + b.totals.leads,
    moveIns: acc.moveIns + b.totals.moveIns,
  }), { spend: 0, leads: 0, moveIns: 0 })
  const portfolioAvgCpl = portfolioTotals.leads > 0 ? portfolioTotals.spend / portfolioTotals.leads : 0
  const portfolioAvgCpmi = portfolioTotals.moveIns > 0 ? portfolioTotals.spend / portfolioTotals.moveIns : 0

  // Monthly rollup for billing
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
  const baseFee = PLAN_PRICING[org.plan] || 499
  const perFacilityFee = 99

  const filteredUnassigned = unassigned.filter(f =>
    !searchFilter || f.name.toLowerCase().includes(searchFilter.toLowerCase()) || f.location.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div>
      <button onClick={onBack} className={`flex items-center gap-1.5 text-sm mb-4 transition-colors ${dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
        <ArrowLeft size={14} /> Back to partners
      </button>

      {/* Org header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: org.primary_color }}>
          {org.logo_url ? <img src={org.logo_url} alt="" className="h-7 object-contain" /> : <Building2 size={22} className="text-white" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{org.name}</h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PLAN_COLORS[org.plan]}`}>{org.plan}</span>
            {org.white_label && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">White-label</span>}
          </div>
          <div className={`text-xs flex items-center gap-3 mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-mono">{org.slug}</span>
            {org.contact_email && <span>{org.contact_email}</span>}
            <span>{facilities.length} / {org.facility_limit} facilities</span>
            <span>Since {new Date(org.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full border border-slate-200" style={{ background: org.primary_color }} title="Primary" />
          <div className="w-5 h-5 rounded-full border border-slate-200" style={{ background: org.accent_color }} title="Accent" />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className={`flex gap-1 mb-5 border-b ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
        {(['facilities', 'benchmarks', 'billing', 'revshare', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all capitalize ${
              activeSubTab === tab
                ? `border-indigo-600 ${dm ? 'text-indigo-400' : 'text-indigo-700'}`
                : `border-transparent ${dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Facilities Sub-tab */}
      {activeSubTab === 'facilities' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
              Assigned Facilities ({facilities.length})
            </h3>
            <button
              onClick={() => setShowAssign(!showAssign)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Link2 size={14} /> Assign Facility
            </button>
          </div>

          {showAssign && (
            <div className={`rounded-xl border p-4 mb-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Search size={14} className="text-slate-400" />
                <input
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search unassigned facilities..."
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`}
                />
              </div>
              {filteredUnassigned.length === 0 ? (
                <p className={`text-sm ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No unassigned facilities found</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {filteredUnassigned.map(f => (
                    <div key={f.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${dm ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <div>
                        <span className={`text-sm font-medium ${dm ? 'text-white' : ''}`}>{f.name}</span>
                        <span className={`text-xs ml-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{f.location}</span>
                      </div>
                      <button
                        onClick={() => assignFacility(f.id)}
                        disabled={assigning === f.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {assigning === f.id ? <Loader2 size={12} className="animate-spin" /> : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : facilities.length === 0 ? (
            <div className={`rounded-xl border p-8 text-center ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <Building2 size={28} className="text-slate-300 mx-auto mb-2" />
              <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>No facilities assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {facilities.map(f => {
                const campaigns = f.campaigns || []
                const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0)
                const totalLeads = campaigns.reduce((s, c) => s + Number(c.leads), 0)
                const totalMoveIns = campaigns.reduce((s, c) => s + Number(c.moveIns), 0)
                return (
                  <div key={f.id} className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{f.name}</h4>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>{f.status}</span>
                        </div>
                        <div className={`text-xs mt-0.5 flex items-center gap-3 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span>{f.location}</span>
                          <span>${totalSpend.toLocaleString()} spend</span>
                          <span>{totalLeads} leads</span>
                          <span>{totalMoveIns} move-ins</span>
                          {f.live_pages > 0 && <span>{f.live_pages} pages</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFacility(f.id)}
                        disabled={removing === f.id}
                        className={`p-1.5 rounded transition-colors ${dm ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                        title="Remove from org"
                      >
                        {removing === f.id ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Benchmarks Sub-tab */}
      {activeSubTab === 'benchmarks' && (
        <div>
          {/* Portfolio summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className="text-blue-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Spend</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${portfolioTotals.spend.toLocaleString()}</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-purple-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Avg CPL</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${portfolioAvgCpl.toFixed(0)}</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 size={14} className="text-green-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Total Move-Ins</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>{portfolioTotals.moveIns}</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-emerald-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Avg Cost/Move-In</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${portfolioAvgCpmi.toFixed(0)}</div>
            </div>
          </div>

          {/* Portfolio chart */}
          {monthlyData.length > 0 && (
            <div className={`rounded-xl border p-5 mb-5 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold mb-4 ${dm ? 'text-white' : ''}`}>Monthly Portfolio Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: dm ? '#94a3b8' : undefined }} />
                  <YAxis tick={{ fontSize: 11, fill: dm ? '#94a3b8' : undefined }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill={org.primary_color} radius={[4, 4, 0, 0]} name="Leads" />
                  <Bar dataKey="moveIns" fill="#10b981" radius={[4, 4, 0, 0]} name="Move-Ins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Facility comparison table */}
          <div className={`rounded-xl border overflow-hidden ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-sm font-semibold px-4 py-3 border-b ${dm ? 'text-white border-slate-700' : 'border-slate-100'}`}>
              <Trophy size={14} className="inline mr-1.5 text-amber-500" /> Facility Benchmarks
            </h3>
            {benchmarks.length === 0 ? (
              <p className={`px-4 py-6 text-sm text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No campaign data to benchmark</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${dm ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <th className={`text-left px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>#</th>
                    <th className={`text-left px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Facility</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Spend</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Leads</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>CPL</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Move-Ins</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Cost/MI</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>ROAS</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b, i) => {
                    const cplDiff = portfolioAvgCpl > 0 ? ((b.cpl - portfolioAvgCpl) / portfolioAvgCpl * 100) : 0
                    return (
                      <tr key={b.id} className={`border-b ${dm ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                        <td className={`px-4 py-2.5 ${i === 0 ? 'text-amber-500 font-bold' : dm ? 'text-slate-500' : 'text-slate-400'}`}>
                          {i === 0 ? <Trophy size={14} /> : i + 1}
                        </td>
                        <td className={`px-4 py-2.5 font-medium ${dm ? 'text-white' : ''}`}>
                          {b.name}
                          <span className={`block text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{b.location}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${b.totals.spend.toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>{b.totals.leads}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${b.cpl.toFixed(0)}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>{b.totals.moveIns}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${b.cpmi.toFixed(0)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${b.latestRoas >= 3 ? 'text-green-600' : dm ? 'text-slate-300' : ''}`}>{b.latestRoas.toFixed(1)}x</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cplDiff < 0 ? 'text-green-600' : cplDiff > 0 ? 'text-red-500' : dm ? 'text-slate-500' : 'text-slate-400'}`}>
                            {cplDiff < 0 ? <ArrowDownRight size={10} /> : cplDiff > 0 ? <ArrowUpRight size={10} /> : <Minus size={10} />}
                            {Math.abs(cplDiff).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Billing Sub-tab */}
      {activeSubTab === 'billing' && (() => {
        const tier = getRevShareTier(facilities.length)
        const revShareAmount = facilities.length * PER_FACILITY_MRR * (tier.pct / 100)
        const grossRevenue = baseFee + perFacilityFee * facilities.length
        const netRevenue = grossRevenue - revShareAmount
        return (
        <div>
          {/* Rev share summary banner */}
          <div className={`rounded-xl border p-4 mb-5 flex items-center justify-between ${dm ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-3">
              <BadgeDollarSign size={20} className="text-emerald-500" />
              <div>
                <div className={`text-sm font-bold ${dm ? 'text-emerald-300' : 'text-emerald-800'}`}>Revenue Share: {tier.name} Tier ({tier.pct}%)</div>
                <div className={`text-xs ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>{facilities.length} facilities — partner earns ${revShareAmount.toLocaleString()}/mo</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>Net: ${netRevenue.toLocaleString()}/mo</div>
              <div className={`text-[10px] ${dm ? 'text-emerald-500' : 'text-emerald-500'}`}>StowStack retains after rev share</div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><CreditCard size={14} className="text-indigo-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Base Fee</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${baseFee.toLocaleString()}</div>
              <div className={`text-[10px] mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{org.plan} plan</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><Building2 size={14} className="text-emerald-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Facility Fees</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${(perFacilityFee * facilities.length).toLocaleString()}</div>
              <div className={`text-[10px] mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{facilities.length} x ${perFacilityFee}/facility</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-red-900/20 border-red-800/50' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1"><BadgeDollarSign size={14} className="text-red-500" /><span className={`text-xs ${dm ? 'text-red-400' : 'text-red-500'}`}>Rev Share Payout</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-red-400' : 'text-red-600'}`}>-${revShareAmount.toLocaleString()}</div>
              <div className={`text-[10px] mt-0.5 ${dm ? 'text-red-500' : 'text-red-400'}`}>{tier.pct}% to partner</div>
            </div>
            <div className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1"><Receipt size={14} className="text-purple-500" /><span className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Net Revenue</span></div>
              <div className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>${netRevenue.toLocaleString()}</div>
              <div className={`text-[10px] mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>StowStack keeps</div>
            </div>
          </div>

          {/* Monthly ad spend breakdown */}
          <div className={`rounded-xl border overflow-hidden ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-sm font-semibold px-4 py-3 border-b ${dm ? 'text-white border-slate-700' : 'border-slate-100'}`}>
              Monthly Revenue & Payout History
            </h3>
            {monthlyData.length === 0 ? (
              <p className={`px-4 py-6 text-sm text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No billing data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${dm ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <th className={`text-left px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Month</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Ad Spend</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Platform Fee</th>
                    <th className={`text-right px-4 py-2 font-medium text-red-500`}>Rev Share</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Net to SS</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map(m => {
                    const platformFee = baseFee + perFacilityFee * facilities.length
                    return (
                      <tr key={m.month} className={`border-b ${dm ? 'border-slate-700/50' : 'border-slate-50'}`}>
                        <td className={`px-4 py-2.5 font-medium ${dm ? 'text-white' : ''}`}>{m.month}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${m.spend.toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${platformFee.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">-${revShareAmount.toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${dm ? 'text-white' : ''}`}>${(platformFee - revShareAmount).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )
      })()}

      {/* Rev Share Sub-tab (admin view) */}
      {activeSubTab === 'revshare' && (() => {
        const tier = getRevShareTier(facilities.length)
        const TierIcon = tier.icon
        const monthlyPayout = facilities.length * PER_FACILITY_MRR * (tier.pct / 100)
        const annualPayout = monthlyPayout * 12
        return (
          <div>
            {/* Partner's tier and earnings */}
            <div className={`rounded-xl border p-5 mb-5 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: tier.color + '20' }}>
                    <TierIcon size={24} style={{ color: tier.color }} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{tier.name} Tier — {tier.pct}% Revenue Share</h3>
                    <p className={`text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      {facilities.length} facilities ({tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`} range)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>${monthlyPayout.toLocaleString()}<span className="text-sm font-medium opacity-60">/mo</span></div>
                  <div className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>${annualPayout.toLocaleString()}/year to partner</div>
                </div>
              </div>

              {/* Tier breakdown */}
              <div className="grid grid-cols-4 gap-2">
                {REV_SHARE_TIERS.map(t => {
                  const isActive = tier.name === t.name
                  const TIcon = t.icon
                  return (
                    <div key={t.name} className={`rounded-lg border p-3 text-center ${isActive ? (dm ? 'border-emerald-500 bg-emerald-900/30' : 'border-emerald-500 bg-emerald-50') : (dm ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200')}`}>
                      <TIcon size={16} className="mx-auto mb-1" style={{ color: t.color }} />
                      <div className={`text-xs font-bold ${dm ? 'text-white' : ''}`} style={{ color: t.color }}>{t.name}</div>
                      <div className={`text-lg font-black ${isActive ? 'text-emerald-600' : dm ? 'text-slate-400' : 'text-slate-500'}`}>{t.pct}%</div>
                      <div className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} facilities</div>
                      {isActive && <div className="mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-200 rounded-full px-1.5 py-0.5 inline-block">CURRENT</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-facility payout table */}
            <div className={`rounded-xl border overflow-hidden ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold px-4 py-3 border-b flex items-center justify-between ${dm ? 'text-white border-slate-700' : 'border-slate-100'}`}>
                <span>Per-Facility Rev Share Payout</span>
                <span className={`text-xs font-normal ${dm ? 'text-slate-400' : 'text-slate-500'}`}>${PER_FACILITY_MRR}/facility x {tier.pct}% = ${(PER_FACILITY_MRR * tier.pct / 100).toFixed(2)}/facility</span>
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${dm ? 'border-slate-700 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <th className={`text-left px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Facility</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>MRR</th>
                    <th className={`text-right px-4 py-2 font-medium text-red-500`}>Partner Payout</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>SS Keeps</th>
                    <th className={`text-right px-4 py-2 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map(f => {
                    const payout = PER_FACILITY_MRR * (tier.pct / 100)
                    const ssKeeps = PER_FACILITY_MRR - payout
                    return (
                      <tr key={f.id} className={`border-b ${dm ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                        <td className={`px-4 py-2.5 font-medium ${dm ? 'text-white' : ''}`}>
                          {f.name}
                          <span className={`block text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{f.location}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${PER_FACILITY_MRR}/mo</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-500">-${payout.toFixed(2)}/mo</td>
                        <td className={`px-4 py-2.5 text-right ${dm ? 'text-slate-300' : ''}`}>${ssKeeps.toFixed(2)}/mo</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[f.status] || 'bg-slate-100 text-slate-600'}`}>{f.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className={`font-semibold ${dm ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <td className={`px-4 py-3 ${dm ? 'text-white' : ''}`}>{facilities.length} Facilities</td>
                    <td className={`px-4 py-3 text-right ${dm ? 'text-white' : ''}`}>${(facilities.length * PER_FACILITY_MRR).toLocaleString()}/mo</td>
                    <td className="px-4 py-3 text-right text-red-500">-${monthlyPayout.toLocaleString()}/mo</td>
                    <td className={`px-4 py-3 text-right ${dm ? 'text-white' : ''}`}>${(facilities.length * PER_FACILITY_MRR - monthlyPayout).toLocaleString()}/mo</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Activity Sub-tab */}
      {activeSubTab === 'activity' && (
        <ActivityFeed orgId={org.id} adminKey={adminKey} darkMode={darkMode} />
      )}
    </div>
  )
}

/* ── Activity Feed ── */

function ActivityFeed({ orgId, adminKey, darkMode }: { orgId: string; adminKey: string; darkMode?: boolean }) {
  const [activities, setActivities] = useState<{ id: string; type: string; facility_name: string; detail: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const dm = darkMode

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`/api/org-activity?orgId=${orgId}`, { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetch_()
  }, [orgId, adminKey])

  const ACTIVITY_ICONS: Record<string, typeof CheckCircle2> = {
    facility_assigned: Link2,
    facility_removed: Unlink,
    user_invited: Mail,
    campaign_launched: TrendingUp,
    status_changed: AlertTriangle,
    default: BarChart3,
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>

  return (
    <div>
      <h3 className={`text-sm font-semibold mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>Recent Activity</h3>
      {activities.length === 0 ? (
        <div className={`rounded-xl border p-8 text-center ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <BarChart3 size={28} className="text-slate-300 mx-auto mb-2" />
          <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => {
            const Icon = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.default
            return (
              <div key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Icon size={14} className={dm ? 'text-slate-400' : 'text-slate-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${dm ? 'text-white' : ''}`}>{a.detail}</p>
                  <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    {a.facility_name && <span>{a.facility_name}</span>}
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main PartnersView ── */

export default function PartnersView({ adminKey, darkMode }: { adminKey: string; darkMode?: boolean }) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [plan, setPlan] = useState('starter')
  const [whiteLabel, setWhiteLabel] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#16a34a')
  const [accentColor, setAccentColor] = useState('#4f46e5')

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setOrgs(data.organizations || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [adminKey])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''), contactEmail, plan, whiteLabel, primaryColor, accentColor }),
      })
      if (res.ok) {
        setShowCreate(false)
        setName(''); setSlug(''); setContactEmail(''); setPlan('starter'); setWhiteLabel(false)
        setPrimaryColor('#16a34a'); setAccentColor('#4f46e5')
        fetchOrgs()
      }
    } catch { /* silent */ }
    setCreating(false)
  }

  const dm = darkMode

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>

  if (selectedOrg) {
    return <OrgDetailView org={selectedOrg} adminKey={adminKey} darkMode={darkMode} onBack={() => { setSelectedOrg(null); fetchOrgs() }} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>Partner Organizations</h2>
          <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            Management companies with white-label access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> New Partner
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createOrg} className={`rounded-xl border p-5 mb-5 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${dm ? 'text-white' : ''}`}>Create Partner Organization</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Storage Management"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="acme-storage"
                className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Contact Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="admin@acme.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="starter">Starter (10 facilities) — $499/mo</option>
                <option value="growth">Growth (50 facilities) — $1,499/mo</option>
                <option value="enterprise">Enterprise (unlimited) — $3,999/mo</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border" />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded border" />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
              </div>
            </div>
            <div className="flex items-end">
              <label className={`flex items-center gap-2 text-sm cursor-pointer ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                <input type="checkbox" checked={whiteLabel} onChange={e => setWhiteLabel(e.target.checked)} className="rounded" />
                White-label (remove StowStack branding)
              </label>
            </div>
          </div>
          <button type="submit" disabled={creating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      )}

      {orgs.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>No partner organizations yet</p>
          <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Create one to start onboarding management companies</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(o => {
            const tier = getRevShareTier(o.facility_count)
            const TIcon = tier.icon
            const monthlyPayout = o.facility_count * PER_FACILITY_MRR * (tier.pct / 100)
            return (
            <button
              key={o.id}
              onClick={() => setSelectedOrg(o)}
              className={`w-full rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'} shadow-sm text-left transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: o.primary_color }}>
                    {o.logo_url ? <img src={o.logo_url} alt="" className="h-6 object-contain" /> : <Building2 size={18} className="text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{o.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLAN_COLORS[o.plan] || 'bg-slate-100 text-slate-600'}`}>{o.plan}</span>
                      {o.white_label && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700"><Palette size={8} className="inline mr-0.5" /> White-label</span>}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-0.5" style={{ background: tier.color + '20', color: tier.color }}>
                        <TIcon size={8} /> {tier.name} {tier.pct}%
                      </span>
                    </div>
                    <div className={`flex items-center gap-3 text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="font-mono">{o.slug}</span>
                      {o.contact_email && <span>{o.contact_email}</span>}
                      <span className="flex items-center gap-1"><Building2 size={10} /> {o.facility_count} facilities</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {o.user_count} users</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium"><BadgeDollarSign size={10} /> ${monthlyPayout.toLocaleString()}/mo payout</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: o.primary_color }} title="Primary" />
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: o.accent_color }} title="Accent" />
                  </div>
                  <ChevronRight size={16} className={dm ? 'text-slate-600' : 'text-slate-300'} />
                </div>
              </div>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
