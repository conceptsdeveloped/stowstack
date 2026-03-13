import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'

function parseDollar(str) {
  if (!str) return 0
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0
}

function formatDollar(n) {
  return `$${n.toLocaleString()}`
}

function CustomTooltip({ active, payload, darkMode }) {
  if (!active || !payload?.[0]) return null
  return (
    <div className={`p-2 rounded-lg text-xs shadow-lg ${
      darkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 border border-slate-200'
    }`}>
      <p>{payload[0].payload.label}: <strong>{formatDollar(payload[0].value)}</strong>/mo</p>
    </div>
  )
}

export default function RevenueImpactChart({ revenue, darkMode }) {
  if (!revenue) return null

  const current = parseDollar(revenue.current_estimated_monthly_revenue)
  const potential = parseDollar(revenue.potential_monthly_revenue_with_fixes)
  const gap = parseDollar(revenue.estimated_monthly_gap)

  const data = [
    { label: 'Current Revenue', value: current, color: darkMode ? '#475569' : '#94a3b8' },
    { label: 'Potential Revenue', value: potential, color: '#22c55e' },
  ]

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Revenue Impact
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Estimated monthly revenue opportunity
          </p>
        </div>
        {gap > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400">+{formatDollar(gap)}/mo</span>
          </div>
        )}
      </div>

      <div className="h-[200px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={60} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: darkMode ? '#64748b' : '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key levers */}
      {revenue.key_revenue_levers?.length > 0 && (
        <div>
          <h4 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>Key Revenue Levers</h4>
          <ul className="space-y-1">
            {revenue.key_revenue_levers.filter(Boolean).map((lever, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                <span className="text-green-400 mt-1">•</span>
                {lever}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {revenue.assumptions && (
        <p className={`text-[10px] mt-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Assumptions: {revenue.assumptions}
        </p>
      )}
    </div>
  )
}
