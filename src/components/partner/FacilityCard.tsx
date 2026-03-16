import {
  Building2, DollarSign, Users, BarChart3,
  ArrowLeft, MapPin, Target, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { STATUS_COLORS, OCCUPANCY_LABELS } from './PartnerTypes'
import type { OrgFacility } from './PartnerTypes'

/* ── Stat Card (internal helper) ── */

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

export { StatCard }

/* ── Facility Row ── */

export interface FacilityRowProps {
  facility: OrgFacility
  primaryColor: string
  onSelect: () => void
}

export function FacilityRow({ facility, primaryColor, onSelect }: FacilityRowProps) {
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

export interface FacilityDetailProps {
  facility: OrgFacility
  primaryColor: string
  onBack: () => void
}

export function FacilityDetail({ facility, primaryColor, onBack }: FacilityDetailProps) {
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
