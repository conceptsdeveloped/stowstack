import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts'

const IMPACT_MAP = { high: 90, medium: 50, low: 15 }
const EFFORT_MAP = { low: 15, medium: 50, high: 90 }

function CustomTooltip({ active, payload, darkMode }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className={`p-3 rounded-lg text-xs max-w-[200px] shadow-lg ${
      darkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 border border-slate-200'
    }`}>
      <p className="font-medium mb-1">{d.action}</p>
      <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
        Impact: {d.impactLabel} · Effort: {d.effortLabel}
      </p>
    </div>
  )
}

export default function ImpactEffortMatrix({ actions, darkMode }) {
  if (!actions?.length) return null

  const data = actions.map((a, i) => ({
    x: EFFORT_MAP[a.effort] || 50,
    y: IMPACT_MAP[a.impact] || 50,
    action: a.action,
    rank: a.rank,
    impactLabel: a.impact,
    effortLabel: a.effort,
    fill: a.impact === 'high' && a.effort !== 'high' ? '#22c55e' :
          a.impact === 'high' ? '#f59e0b' :
          a.effort === 'low' ? '#3b82f6' : '#94a3b8',
  }))

  const axisStyle = { fontSize: 10, fill: darkMode ? '#64748b' : '#94a3b8' }

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <h2 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        Impact / Effort Matrix
      </h2>
      <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Quick wins are top-left — high impact, low effort
      </p>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={darkMode ? '#334155' : '#e2e8f0'}
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
            >
              <Label value="Effort →" position="bottom" offset={10} style={{ ...axisStyle, fontSize: 11 }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
            >
              <Label value="Impact →" angle={-90} position="left" offset={10} style={{ ...axisStyle, fontSize: 11 }} />
            </YAxis>
            <ReferenceLine x={50} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <circle key={i} r={6} fill={entry.fill} opacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Quadrant labels */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          { label: 'Quick Wins', desc: 'High impact, low effort', color: 'text-green-400' },
          { label: 'Major Projects', desc: 'High impact, high effort', color: 'text-amber-400' },
          { label: 'Fill-Ins', desc: 'Low impact, low effort', color: 'text-blue-400' },
          { label: 'Low Priority', desc: 'Low impact, high effort', color: 'text-slate-400' },
        ].map((q, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${q.color.replace('text-', 'bg-')}`} />
            <span className={q.color}>{q.label}</span>
            <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>— {q.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
