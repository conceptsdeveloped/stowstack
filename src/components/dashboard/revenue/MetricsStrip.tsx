import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { money, pct, type IntelSummary, type StyleProps } from './RevenueTypes'

interface MetricsStripProps extends StyleProps {
  summary: IntelSummary & { total_discount_impact: number; discounted_tenants: number }
}

export default function MetricsStrip({ summary: s, text, sub, card }: MetricsStripProps) {
  return (
    <div className={`border rounded-xl ${card} p-5`}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Gross Potential */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Gross Potential</p>
          <p className={`text-2xl font-bold ${text}`}>{money(s.total_gross_potential)}</p>
          <p className={`text-xs ${sub}`}>at street rates</p>
        </div>

        {/* Actual Revenue */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Actual MRR</p>
          <p className={`text-2xl font-bold text-emerald-600`}>{money(s.total_actual_revenue)}</p>
          <p className={`text-xs ${sub}`}>
            {s.revenue_trend_pct != null && (
              <span className={s.revenue_trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {s.revenue_trend_pct >= 0 ? '\u2191' : '\u2193'} {Math.abs(s.revenue_trend_pct)}% MoM
              </span>
            )}
          </p>
        </div>

        {/* Lost Revenue */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Lost to Vacancy</p>
          <p className="text-2xl font-bold text-red-500">{money(s.total_lost_revenue)}</p>
          <p className={`text-xs ${sub}`}>{money(s.total_lost_revenue * 12)}/yr</p>
        </div>

        {/* Revenue Capture */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Revenue Capture</p>
          <p className={`text-2xl font-bold ${s.revenue_capture_pct >= 85 ? 'text-emerald-600' : s.revenue_capture_pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
            {pct(s.revenue_capture_pct)}
          </p>
          <p className={`text-xs ${sub}`}>actual &divide; potential</p>
        </div>

        {/* ECRI Opportunity */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>ECRI Opportunity</p>
          <p className="text-2xl font-bold text-blue-600">{money(s.ecri_monthly_lift)}</p>
          <p className={`text-xs ${sub}`}>{s.ecri_eligible_count} tenants &middot; {money(s.ecri_annual_lift)}/yr</p>
        </div>

        {/* Rate Distribution */}
        <div className="text-center">
          <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Rate Position</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-emerald-600 text-sm font-bold">{s.tenants_above_street}</span>
            <ArrowUpRight size={14} className="text-emerald-600" />
            <span className={`text-sm font-bold ${sub}`}>{s.tenants_at_street}</span>
            <Minus size={14} className={sub} />
            <span className="text-red-500 text-sm font-bold">{s.tenants_below_street}</span>
            <ArrowDownRight size={14} className="text-red-500" />
          </div>
          <p className={`text-xs ${sub}`}>{s.total_tenants_rated} rated</p>
        </div>
      </div>
    </div>
  )
}
