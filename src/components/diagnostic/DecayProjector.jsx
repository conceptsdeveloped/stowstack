import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts'
import { TrendingDown, Zap, Rocket, AlertTriangle } from 'lucide-react'
import { calculateProjections } from '../../lib/projectionModel'

function formatDollar(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n.toLocaleString()}`
}

function CustomTooltip({ active, payload, label, darkMode }) {
  if (!active || !payload?.length) return null
  return (
    <div className={`p-3 rounded-lg text-xs shadow-xl border ${
      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <p className={`font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Month {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-medium">{formatDollar(entry.value)}/mo</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <span className="text-red-400 font-medium">
            Gap: {formatDollar(payload[payload.length - 1].value - payload[0].value)}/mo
          </span>
        </div>
      )}
    </div>
  )
}

export default function DecayProjector({ audit, darkMode }) {
  const projections = useMemo(() => calculateProjections(audit), [audit])

  if (!projections) return null

  const { scenarios, summary } = projections

  // Merge data for the chart
  const chartData = scenarios.doNothing.map((d, i) => ({
    month: d.month,
    doNothing: d.revenue,
    quickWins: scenarios.quickWins[i].revenue,
    fullPlan: scenarios.fullPlan[i].revenue,
  }))

  const axisStyle = { fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      {/* Warning header */}
      <div className={`px-6 py-4 border-b ${
        darkMode ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              What Happens If You Do Nothing
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Projected revenue over 18 months across three scenarios
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Loss callout */}
        <div className={`rounded-xl p-4 mb-6 text-center ${
          darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm mb-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
            Estimated revenue left on the table over 12 months by doing nothing:
          </p>
          <p className="text-3xl font-bold text-red-400">
            {formatDollar(summary.revenueLostDoingNothing12)}
          </p>
        </div>

        {/* Chart */}
        <div className="h-[320px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
              <XAxis
                dataKey="month"
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                label={{ value: 'Months', position: 'bottom', offset: -5, style: { ...axisStyle, fontSize: 11 } }}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
              <ReferenceLine x={6} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />
              <ReferenceLine x={12} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />

              {/* Do Nothing area + line */}
              <Area
                type="monotone"
                dataKey="doNothing"
                fill="url(#gradientRed)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="doNothing"
                name="Do Nothing"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />

              {/* Quick Wins */}
              <Line
                type="monotone"
                dataKey="quickWins"
                name="Quick Wins"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b' }}
              />

              {/* Full Plan area + line */}
              <Area
                type="monotone"
                dataKey="fullPlan"
                fill="url(#gradientGreen)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="fullPlan"
                name="Full StowStack Plan"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          {[
            { color: '#ef4444', label: 'Do Nothing', dash: false },
            { color: '#f59e0b', label: 'Quick Wins Only', dash: true },
            { color: '#22c55e', label: 'Full StowStack Plan', dash: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-5 h-0.5 rounded" style={{
                backgroundColor: item.dash ? 'transparent' : item.color,
                backgroundImage: item.dash ? `repeating-linear-gradient(90deg, ${item.color} 0px, ${item.color} 4px, transparent 4px, transparent 7px)` : 'none',
              }} />
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* 12-month summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Do Nothing */}
          <div className={`rounded-xl p-4 border ${
            darkMode ? 'bg-red-500/5 border-red-500/15' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className={`text-xs font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                Do Nothing
              </span>
            </div>
            <p className="text-xl font-bold text-red-400">{formatDollar(summary.month12.doNothing)}</p>
            <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              12-month total revenue
            </p>
          </div>

          {/* Quick Wins */}
          <div className={`rounded-xl p-4 border ${
            darkMode ? 'bg-amber-500/5 border-amber-500/15' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className={`text-xs font-medium ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                Quick Wins ({summary.quickWinCount})
              </span>
            </div>
            <p className="text-xl font-bold text-amber-400">{formatDollar(summary.month12.quickWins)}</p>
            <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              +{formatDollar(summary.month12.quickWins - summary.month12.doNothing)} vs doing nothing
            </p>
          </div>

          {/* Full Plan */}
          <div className={`rounded-xl p-4 border ${
            darkMode ? 'bg-green-500/5 border-green-500/15' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-green-400" />
              <span className={`text-xs font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                Full StowStack Plan
              </span>
            </div>
            <p className="text-xl font-bold text-green-400">{formatDollar(summary.month12.fullPlan)}</p>
            <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              +{formatDollar(summary.month12.fullPlan - summary.month12.doNothing)} vs doing nothing
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
