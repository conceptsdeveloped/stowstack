import { useState } from 'react'
import {
  Building2, Users, DollarSign, Target, TrendingUp, Phone,
  BarChart3, AlertTriangle, CheckCircle2, Clock, XCircle,
  ChevronRight, ArrowUpRight, ArrowDownRight, Search,
  Eye, Megaphone, FileText, Star, MessageSquare, Zap,
  Filter, Plus, RefreshCw, Settings, Bell, User,
  MapPin, Percent, Hash, Activity, ArrowRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import {
  clients, dashboardStats, leadData, channelData,
  unitPerformance, leads, strategyNotes, clientAudits
} from '../data/mockData'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'clients', label: 'Clients', icon: Building2 },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'onboarding', label: 'Launch Tracker', icon: Activity },
  { id: 'campaigns', label: 'Campaign Builder', icon: Megaphone },
  { id: 'reports', label: 'Reporting', icon: TrendingUp },
  { id: 'notes', label: 'Strategy Notes', icon: MessageSquare },
]

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function Sidebar({ active, setActive }) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900 border-r border-slate-800 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">StowStack</span>
            <p className="text-[10px] text-slate-500 -mt-0.5">Self-Storage Ad Engine</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              active === id
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
            <User size={14} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">Blake B.</p>
            <p className="text-[10px] text-slate-500">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function StatCard({ label, value, change, icon: Icon, positive }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-slate-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {change && (
        <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </p>
      )}
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agency Dashboard</h1>
          <p className="text-sm text-slate-500">Occupancy growth across all managed facilities</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">March 2026</span>
          <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
            <RefreshCw size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Clients" value={dashboardStats.totalClients} change="+1 this month" icon={Building2} positive />
        <StatCard label="Ad Spend" value={`$${dashboardStats.totalAdSpend.toLocaleString()}`} change="+12% MoM" icon={DollarSign} positive />
        <StatCard label="Active Campaigns" value={dashboardStats.activeCampaigns} icon={Megaphone} />
        <StatCard label="Total Leads" value={dashboardStats.totalLeads} change="+18% MoM" icon={Users} positive />
        <StatCard label="Est. Move-Ins" value={dashboardStats.estimatedMoveIns} change="+15% MoM" icon={TrendingUp} positive />
        <StatCard label="Avg CPL" value={`$${dashboardStats.avgCPL}`} change="-12% MoM" icon={Target} positive />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Leads & Move-Ins by Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="leads" fill="#22c55e" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="moveIns" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Move-Ins" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Channel Performance</h3>
          <div className="space-y-3">
            {channelData.map((ch, i) => (
              <div key={ch.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{ch.name}</span>
                    <span className="text-xs text-slate-500">{ch.leads} leads · ${ch.cpl} CPL</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(ch.leads / 89) * 100}%`, backgroundColor: COLORS[i] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vacancy Pressure */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Vacancy Pressure by Client</h3>
        <div className="space-y-3">
          {clients.sort((a, b) => b.vacantUnits - a.vacantUnits).map((c) => (
            <div key={c.id} className="flex items-center gap-4">
              <div className="w-36 text-sm font-medium text-slate-700 truncate">{c.name}</div>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.occupancy < 70 ? 'bg-red-500' : c.occupancy < 80 ? 'bg-amber-500' : c.occupancy < 90 ? 'bg-blue-500' : 'bg-green-500'}`}
                  style={{ width: `${c.occupancy}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">{c.occupancy}%</span>
              <span className="text-xs text-slate-500 w-24 text-right">{c.vacantUnits} vacant</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Performance */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Performance by Unit Type (All Clients)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase">Unit Type</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Leads</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Move-Ins</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">CPL</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Conv Rate</th>
              </tr>
            </thead>
            <tbody>
              {unitPerformance.map((u) => (
                <tr key={u.type} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2.5 font-medium text-slate-700">{u.type}</td>
                  <td className="py-2.5 text-right text-slate-600">{u.leads}</td>
                  <td className="py-2.5 text-right text-slate-600">{u.moveIns}</td>
                  <td className="py-2.5 text-right text-slate-600">${u.cpl.toFixed(2)}</td>
                  <td className="py-2.5 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      (u.moveIns / u.leads) > 0.3 ? 'bg-green-100 text-green-700' :
                      (u.moveIns / u.leads) > 0.2 ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {((u.moveIns / u.leads) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ClientsTab() {
  const [selected, setSelected] = useState(null)

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    optimization: 'bg-blue-100 text-blue-700',
    launch: 'bg-amber-100 text-amber-700',
    paused: 'bg-slate-100 text-slate-600',
  }

  const healthColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    moderate: 'text-amber-600',
    poor: 'text-red-600',
  }

  const AuditBar = ({ score, max = 10 }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score <= 3 ? 'bg-red-500' : score <= 5 ? 'bg-amber-500' : score <= 7 ? 'bg-blue-500' : 'bg-green-500'}`}
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-6 text-right">{score}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Client Facilities</h1>
          <p className="text-sm text-slate-500">{clients.length} active clients</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 cursor-pointer">
          <Plus size={14} /> Add Client
        </button>
      </div>

      <div className="grid gap-4">
        {clients.map((c) => {
          const audit = clientAudits[c.id]
          const isOpen = selected === c.id
          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setSelected(isOpen ? null : c.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building2 size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{c.name}</h3>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColors[c.campaignStatus]}`}>
                          {c.campaignStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={10} /> {c.market}</span>
                        <span>{c.totalUnits} units</span>
                        <span className={healthColors[c.followUpHealth]}>Follow-up: {c.followUpHealth}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">{c.occupancy}%</p>
                      <p className="text-xs text-slate-500">Occupancy</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-bold text-slate-900">{c.vacantUnits}</p>
                      <p className="text-xs text-slate-500">Vacant</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-bold text-slate-900">{c.leads}</p>
                      <p className="text-xs text-slate-500">Leads</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-bold text-slate-900">{c.moveIns}</p>
                      <p className="text-xs text-slate-500">Move-Ins</p>
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {isOpen && audit && (
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Client Details */}
                    <div className="p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700">Facility Details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Monthly Budget</p>
                          <p className="text-lg font-bold text-slate-900">${c.monthlyBudget.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Cost Per Lead</p>
                          <p className="text-lg font-bold text-slate-900">{c.cpl ? `$${c.cpl.toFixed(2)}` : '—'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Website Strength</p>
                          <p className="text-sm font-semibold capitalize text-slate-700">{c.websiteStrength}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500">Move-In Friction</p>
                          <p className="text-sm font-semibold text-slate-700">{c.moveInFriction}/10</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-2">High Vacancy Unit Types</p>
                        <div className="flex flex-wrap gap-2">
                          {c.highVacancy.map((u) => (
                            <span key={u} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">{u}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Facility Audit */}
                    <div className="p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700">Facility Audit</h4>
                      <div className="space-y-3">
                        {Object.entries({
                          'Offer Quality': audit.offerQuality,
                          'Ad Angle Quality': audit.adAngleQuality,
                          'Website Conversion': audit.websiteConversion,
                          'Call Answering': audit.callAnswering,
                          'Review Strength': audit.reviewStrength,
                          'Online Move-In': audit.onlineMoveIn,
                          'Competitor Pressure': audit.competitorPressure,
                        }).map(([label, score]) => (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600">{label}</span>
                            </div>
                            <AuditBar score={score} />
                          </div>
                        ))}
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700">Biggest Bottleneck</p>
                            <p className="text-xs text-amber-600 mt-0.5">{audit.bottleneck}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeadsTab() {
  const statusConfig = {
    new: { color: 'bg-green-100 text-green-700', icon: Zap },
    contacted: { color: 'bg-blue-100 text-blue-700', icon: Phone },
    missed: { color: 'bg-red-100 text-red-700', icon: XCircle },
    stale: { color: 'bg-slate-100 text-slate-600', icon: Clock },
  }

  const counts = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    missed: leads.filter(l => l.status === 'missed').length,
    stale: leads.filter(l => l.status === 'stale').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lead Pipeline</h1>
          <p className="text-sm text-slate-500">{leads.length} total leads this period</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase">New</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{counts.new}</p>
          <p className="text-xs text-green-600 mt-0.5">Needs immediate contact</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase">Contacted</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{counts.contacted}</p>
          <p className="text-xs text-blue-600 mt-0.5">In follow-up sequence</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase">Missed</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{counts.missed}</p>
          <p className="text-xs text-red-600 mt-0.5">Needs recovery outreach</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-slate-600" />
            <span className="text-xs font-semibold text-slate-600 uppercase">Stale</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{counts.stale}</p>
          <p className="text-xs text-slate-500 mt-0.5">No response in 48h+</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Trigger</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const config = statusConfig[lead.status]
                return (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.source}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.unitType}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{lead.trigger}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${config.color}`}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{lead.time}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-Up Recommendations */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 text-sm mb-3 flex items-center gap-2">
          <AlertTriangle size={16} /> Follow-Up Recommendations
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <ArrowRight size={14} className="shrink-0 mt-0.5" />
            <span><strong>2 missed leads</strong> — initiate SMS recovery within 1 hour. Call back immediately during office hours.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <ArrowRight size={14} className="shrink-0 mt-0.5" />
            <span><strong>1 stale lead</strong> — send "Still looking for storage?" text with a limited-time offer.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <ArrowRight size={14} className="shrink-0 mt-0.5" />
            <span><strong>New leads within 15 min</strong> — must be contacted before they call a competitor.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OnboardingTab() {
  const launchClients = [
    {
      name: 'SecureBox Storage',
      market: 'Lansing, MI',
      startDate: 'Mar 6',
      steps: [
        { label: 'Zoom Strategy Call', status: 'done', date: 'Mar 6' },
        { label: 'Facility Audit & Research', status: 'done', date: 'Mar 7' },
        { label: 'Campaign Build', status: 'active', date: 'Mar 8' },
        { label: 'Campaign Live', status: 'pending', date: 'Mar 8–9' },
      ]
    },
    {
      name: 'Harbor View Storage',
      market: 'Muskegon, MI',
      startDate: 'Mar 5',
      steps: [
        { label: 'Zoom Strategy Call', status: 'done', date: 'Mar 5' },
        { label: 'Facility Audit & Research', status: 'done', date: 'Mar 6' },
        { label: 'Campaign Build', status: 'done', date: 'Mar 7' },
        { label: 'Campaign Live', status: 'done', date: 'Mar 7' },
      ]
    },
  ]

  const statusIcon = (s) => {
    if (s === 'done') return <CheckCircle2 size={16} className="text-green-500" />
    if (s === 'active') return <Activity size={16} className="text-blue-500 animate-pulse" />
    return <Clock size={16} className="text-slate-300" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Launch Tracker</h1>
          <p className="text-sm text-slate-500">48–72 hour campaign launch pipeline</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 cursor-pointer">
          <Plus size={14} /> New Launch
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">2</p>
          <p className="text-xs text-slate-500 mt-1">In Pipeline</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">1</p>
          <p className="text-xs text-green-600 mt-1">Launched This Week</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">52hrs</p>
          <p className="text-xs text-blue-600 mt-1">Avg Launch Time</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">1</p>
          <p className="text-xs text-amber-600 mt-1">Building Now</p>
        </div>
      </div>

      {/* Launch Cards */}
      {launchClients.map((client) => {
        const allDone = client.steps.every(s => s.status === 'done')
        return (
          <div key={client.name} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 size={18} className="text-slate-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{client.name}</h3>
                  <p className="text-xs text-slate-500">{client.market} — Started {client.startDate}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {allDone ? 'Launched' : 'In Progress'}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2">
                {client.steps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2 flex-1">
                    <div className={`flex-1 rounded-lg p-3 border ${
                      step.status === 'done' ? 'bg-green-50 border-green-200' :
                      step.status === 'active' ? 'bg-blue-50 border-blue-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon(step.status)}
                        <span className="text-xs font-medium text-slate-700">{step.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{step.date}</p>
                    </div>
                    {i < client.steps.length - 1 && (
                      <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* 48-72hr Promise */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Activity size={20} className="text-brand-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-brand-800">48–72 Hour Launch Guarantee</h3>
            <p className="text-sm text-brand-700 mt-1">
              Every new client goes from Zoom strategy call to live Meta campaign in 48–72 hours. Our team handles facility audit,
              campaign build, creative, targeting, and launch — all within that window. No onboarding delays.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CampaignBuilderTab() {
  const [objective, setObjective] = useState('lead_generation')
  const [trigger, setTrigger] = useState('moving')
  const [unitFocus, setUnitFocus] = useState('10x10_standard')
  const [offerType, setOfferType] = useState('first_month_free')

  const headlines = [
    'Need Storage in [City]? First Month Free.',
    'Moving? Reserve Your Unit Online in 2 Minutes.',
    'Declutter Your Life. Climate-Controlled Units from $49/mo.',
    '[City] Self Storage — Secure, Clean, Move In Today.',
    'Downsizing? We Will Hold Your Stuff While You Figure It Out.',
  ]

  const adAngles = [
    { angle: 'Life Event — Moving', hook: 'Moving soon? Get storage locked in before the truck arrives.' },
    { angle: 'Urgency — Limited Availability', hook: 'Only 3 drive-up units left at [Facility]. Reserve yours now.' },
    { angle: 'Convenience — Easy Move-In', hook: 'Reserve online. Show up. Move in. No appointment needed.' },
    { angle: 'Trust — Local & Secure', hook: 'Locally owned. 24/7 access. Security cameras on every unit.' },
    { angle: 'Price — Introductory Offer', hook: 'First month free on select units. No hidden fees. Cancel anytime.' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Campaign Builder</h1>
        <p className="text-sm text-slate-500">Configure and generate campaign assets for client facilities</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Campaign Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Campaign Objective</label>
                <select value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                  <option value="lead_generation">Lead Generation</option>
                  <option value="calls">Phone Calls</option>
                  <option value="website_traffic">Website Traffic</option>
                  <option value="retargeting">Retargeting Conversions</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Target Life-Event Trigger</label>
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                  <option value="moving">Moving / Relocation</option>
                  <option value="downsizing">Downsizing</option>
                  <option value="divorce">Divorce / Breakup</option>
                  <option value="remodeling">Home Remodeling</option>
                  <option value="estate">Estate Cleanout</option>
                  <option value="business">Business Overflow</option>
                  <option value="vehicle">Vehicle / RV Storage</option>
                  <option value="college">College Transition</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Unit Type Focus</label>
                <select value={unitFocus} onChange={(e) => setUnitFocus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                  <option value="5x5_standard">5x5 Standard</option>
                  <option value="5x10_standard">5x10 Standard</option>
                  <option value="10x10_standard">10x10 Standard</option>
                  <option value="10x10_climate">10x10 Climate Controlled</option>
                  <option value="10x15_standard">10x15 Standard</option>
                  <option value="10x20_driveup">10x20 Drive-Up</option>
                  <option value="10x30_vehicle">10x30 Vehicle</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Offer Type</label>
                <select value={offerType} onChange={(e) => setOfferType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                  <option value="first_month_free">First Month Free</option>
                  <option value="50_percent_off">50% Off First Month</option>
                  <option value="no_deposit">No Deposit Required</option>
                  <option value="price_lock">Price Lock Guarantee</option>
                  <option value="free_truck">Free Move-In Truck Use</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Geographic Targeting</label>
                <input type="text" placeholder="e.g., 15-mile radius from facility" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Generated Assets */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Generated Headlines</h3>
            <div className="space-y-2">
              {headlines.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <p className="text-sm text-slate-700 font-medium">{h}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Ad Angles & Hooks</h3>
            <div className="space-y-3">
              {adAngles.map((a, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-[10px] font-semibold text-brand-600 uppercase">{a.angle}</span>
                  <p className="text-sm text-slate-700 mt-1">{a.hook}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">CTA Options</h3>
            <div className="flex flex-wrap gap-2">
              {['Reserve Your Unit', 'Get First Month Free', 'Check Availability', 'Call Now', 'See Prices & Sizes', 'Book a Tour'].map((cta) => (
                <span key={cta} className="text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-full">{cta}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ad Preview Mockup */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Ad Preview Mockup</h3>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Facebook Feed Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-w-sm">
            <div className="p-3 flex items-center gap-2 border-b border-slate-100">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">[Facility Name]</p>
                <p className="text-[10px] text-slate-500">Sponsored</p>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm text-slate-700 leading-relaxed">{headlines[0]}</p>
            </div>
            <div className="bg-slate-100 h-40 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Eye size={24} className="mx-auto mb-1" />
                <p className="text-xs">Ad creative image</p>
              </div>
            </div>
            <div className="p-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">[facility-website.com]</p>
                  <p className="text-[10px] text-slate-500">Reserve your unit online today</p>
                </div>
                <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-3 py-1.5 rounded">Learn More</span>
              </div>
            </div>
          </div>

          {/* Instagram Story Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-w-[200px]">
            <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-4 h-80 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center">
                  <Building2 size={10} className="text-white" />
                </div>
                <p className="text-[10px] font-semibold text-white">[Facility]</p>
                <span className="text-[8px] text-slate-400 ml-auto">Sponsored</span>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm leading-tight mb-3">{headlines[0]}</p>
                <div className="bg-white text-slate-900 text-xs font-semibold px-4 py-2 rounded-full inline-block">
                  Reserve Now
                </div>
              </div>
              <div className="h-1 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full w-1/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsTab() {
  const weeklyData = [
    { day: 'Mon', leads: 8, calls: 5, moveIns: 2 },
    { day: 'Tue', leads: 12, calls: 8, moveIns: 3 },
    { day: 'Wed', leads: 10, calls: 7, moveIns: 2 },
    { day: 'Thu', leads: 15, calls: 11, moveIns: 4 },
    { day: 'Fri', leads: 11, calls: 6, moveIns: 3 },
    { day: 'Sat', leads: 7, calls: 3, moveIns: 1 },
    { day: 'Sun', leads: 5, calls: 2, moveIns: 1 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Performance Reporting</h1>
          <p className="text-sm text-slate-500">March 2026 — All clients aggregated</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
            <option>All Clients</option>
            {clients.map(c => <option key={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value="197" change="+18% vs Feb" icon={Users} positive />
        <StatCard label="Avg CPL" value="$36.18" change="-12% vs Feb" icon={DollarSign} positive />
        <StatCard label="Phone Calls" value="134" change="+22% vs Feb" icon={Phone} positive />
        <StatCard label="Move-Ins" value="57" change="+15% vs Feb" icon={TrendingUp} positive />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Weekly Lead Flow</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Line type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Leads" />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Calls" />
              <Line type="monotone" dataKey="moveIns" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Move-Ins" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Performance by Unit Type</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={unitPerformance} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="leads" fill="#22c55e" radius={[0, 4, 4, 0]} name="Leads" />
              <Bar dataKey="moveIns" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Move-Ins" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Client Scorecards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4">Client Scorecard</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase">Facility</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">Ad Spend</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">Leads</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">CPL</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">Move-Ins</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 uppercase">Occupancy</th>
                <th className="text-right py-2 pl-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 text-right text-slate-600">${c.adSpend.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{c.leads}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{c.cpl ? `$${c.cpl.toFixed(2)}` : '—'}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{c.moveIns}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.occupancy < 70 ? 'bg-red-100 text-red-700' :
                      c.occupancy < 80 ? 'bg-amber-100 text-amber-700' :
                      c.occupancy < 90 ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {c.occupancy}%
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      c.campaignStatus === 'active' ? 'bg-green-100 text-green-700' :
                      c.campaignStatus === 'optimization' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {c.campaignStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Performing */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-brand-700 uppercase mb-1">Best Ad Angle</p>
          <p className="text-sm font-bold text-brand-900">Life Event — Moving</p>
          <p className="text-xs text-brand-600 mt-1">38% of all conversions</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Best Unit Type</p>
          <p className="text-sm font-bold text-blue-900">10x10 Standard</p>
          <p className="text-xs text-blue-600 mt-1">34.6% conversion rate</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Best Channel</p>
          <p className="text-sm font-bold text-amber-900">Retargeting</p>
          <p className="text-xs text-amber-600 mt-1">$24.80 CPL — lowest across all</p>
        </div>
      </div>
    </div>
  )
}

function StrategyNotesTab() {
  const priorityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const categoryIcons = {
    offer: Target,
    website: Eye,
    operations: Phone,
    campaign: Megaphone,
    strategy: FileText,
    sales: TrendingUp,
  }

  const grouped = {}
  strategyNotes.forEach((n) => {
    if (!grouped[n.client]) grouped[n.client] = []
    grouped[n.client].push(n)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Strategy Notes</h1>
          <p className="text-sm text-slate-500">Operator insights and actionable observations per client</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 cursor-pointer">
          <Plus size={14} /> Add Note
        </button>
      </div>

      {Object.entries(grouped).map(([client, notes]) => (
        <div key={client} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              {client}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {notes.map((note, i) => {
              const Icon = categoryIcons[note.category] || FileText
              return (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{note.note}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${priorityColors[note.priority]}`}>
                        {note.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">{note.category}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  const TabContent = {
    overview: OverviewTab,
    clients: ClientsTab,
    leads: LeadsTab,
    onboarding: OnboardingTab,
    campaigns: CampaignBuilderTab,
    reports: ReportsTab,
    notes: StrategyNotesTab,
  }

  const ActiveComponent = TabContent[activeTab]

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar active={activeTab} setActive={setActiveTab} />
      <main className="ml-56 p-6">
        <ActiveComponent />
      </main>
    </div>
  )
}
