import { TrendingUp, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { money, type ECRITenant, type IntelSummary, type StyleProps } from './RevenueTypes'

interface ECRITableProps extends StyleProps {
  ecriTenants: ECRITenant[]
  summary: IntelSummary & { total_discount_impact: number; discounted_tenants: number }
  ecriSort: 'lift' | 'variance' | 'days'
  onEcriSortChange: (sort: 'lift' | 'variance' | 'days') => void
  expanded: boolean
  onToggle: () => void
}

export default function ECRITable({ ecriTenants, summary: s, ecriSort, onEcriSortChange, expanded, onToggle, darkMode, card, text, sub, rowHover }: ECRITableProps) {
  const sortedEcri = [...ecriTenants].sort((a, b) => {
    if (ecriSort === 'lift') return (b.ecri_revenue_lift || 0) - (a.ecri_revenue_lift || 0)
    if (ecriSort === 'variance') return (a.rate_variance || 0) - (b.rate_variance || 0)
    return (b.days_as_tenant || 0) - (a.days_as_tenant || 0)
  })

  return (
    <div className={`border rounded-xl ${card}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="text-blue-600" />
          <div>
            <h3 className={`font-semibold ${text}`}>ECRI Recommendations</h3>
            <p className={`text-xs ${sub}`}>
              {ecriTenants.length > 0
                ? `${ecriTenants.length} tenants eligible \u00b7 +${money(s.ecri_monthly_lift)}/mo potential lift`
                : 'Import Rent Rates by Tenant report to power ECRI analysis'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className={sub} /> : <ChevronDown size={18} className={sub} />}
      </button>

      {expanded && ecriTenants.length > 0 && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {/* ECRI summary */}
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-xs font-medium ${sub}`}>Eligible Tenants</p>
                <p className="text-xl font-bold text-blue-600">{ecriTenants.length}</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className={`text-xs font-medium ${sub}`}>Monthly Lift</p>
                <p className="text-xl font-bold text-emerald-600">{money(s.ecri_monthly_lift)}</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className={`text-xs font-medium ${sub}`}>Annual Lift</p>
                <p className="text-xl font-bold text-emerald-600">{money(s.ecri_annual_lift)}</p>
              </div>
              <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-50 border border-slate-200'}`}>
                <p className={`text-xs font-medium ${sub}`}>Avg Tenure</p>
                <p className={`text-xl font-bold ${text}`}>
                  {Math.round(ecriTenants.reduce((s, t) => s + (t.days_as_tenant || 0), 0) / ecriTenants.length / 30)}mo
                </p>
              </div>
            </div>
          </div>

          {/* Sort controls */}
          <div className={`px-4 pb-2 flex gap-2`}>
            <span className={`text-xs ${sub} self-center`}>Sort by:</span>
            {(['lift', 'variance', 'days'] as const).map(sortKey => (
              <button
                key={sortKey}
                onClick={() => onEcriSortChange(sortKey)}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  ecriSort === sortKey
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sortKey === 'lift' ? 'Revenue Lift' : sortKey === 'variance' ? 'Underpaying' : 'Tenure'}
              </button>
            ))}
          </div>

          {/* ECRI tenant table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <th className={`text-left px-4 py-2 font-medium ${sub}`}>Unit</th>
                  <th className={`text-left px-3 py-2 font-medium ${sub}`}>Tenant</th>
                  <th className={`text-center px-3 py-2 font-medium ${sub}`}>Tenure</th>
                  <th className={`text-right px-3 py-2 font-medium ${sub}`}>Street</th>
                  <th className={`text-right px-3 py-2 font-medium ${sub}`}>Paying</th>
                  <th className={`text-right px-3 py-2 font-medium ${sub}`}>Gap</th>
                  <th className={`text-right px-3 py-2 font-medium ${sub}`}>Suggested</th>
                  <th className={`text-right px-4 py-2 font-medium ${sub}`}>Monthly Lift</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {sortedEcri.map((t, i) => (
                  <tr key={i} className={rowHover}>
                    <td className={`px-4 py-2 font-medium ${text}`}>{t.unit}</td>
                    <td className={`px-3 py-2 ${text}`}>{t.tenant_name}</td>
                    <td className={`px-3 py-2 text-center ${sub}`}>
                      {Math.round((t.days_as_tenant || 0) / 30)}mo
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${sub}`}>${t.standard_rate?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-500">${t.actual_rate?.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-500">
                      -${Math.abs(t.rate_variance || 0).toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">${t.ecri_suggested?.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600">+${t.ecri_revenue_lift?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expanded && ecriTenants.length === 0 && (
        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} p-6 text-center`}>
          <Users className={`mx-auto mb-2 ${sub}`} size={32} />
          <p className={`text-sm ${text}`}>No ECRI data available</p>
          <p className={`text-xs mt-1 ${sub}`}>Upload a "Rent Rates by Tenant" CSV from storEDGE to see tenant-level rate analysis</p>
        </div>
      )}
    </div>
  )
}
