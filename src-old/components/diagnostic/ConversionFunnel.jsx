import { getFunnelStatusColor } from '../../lib/scoreUtils'

const STAGE_WIDTHS = [100, 82, 64, 48, 36]

export default function ConversionFunnel({ funnel, darkMode }) {
  if (!funnel) return null

  const stages = funnel.stages || []

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <h2 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        Conversion Funnel
      </h2>
      <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Where leads are leaking in your rental pipeline
      </p>

      {/* Funnel visualization */}
      <div className="space-y-2 mb-6">
        {stages.map((stage, i) => {
          const color = getFunnelStatusColor(stage.status)
          const width = STAGE_WIDTHS[i] || 30
          const leak = stage.leak_percentage_estimate

          return (
            <div key={i} className="relative group">
              <div className="flex items-center gap-4">
                {/* Bar */}
                <div className="flex-1">
                  <div
                    className="h-10 rounded-lg flex items-center px-4 transition-all relative overflow-hidden"
                    style={{
                      width: `${width}%`,
                      backgroundColor: `${color}20`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <span className={`text-xs font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {stage.name}
                    </span>
                  </div>
                </div>

                {/* Status + leak */}
                <div className="shrink-0 w-24 text-right">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {stage.status}
                  </span>
                  {leak > 0 && (
                    <div className="text-[10px] text-red-400 mt-0.5">
                      -{leak}% leak
                    </div>
                  )}
                </div>
              </div>

              {/* Tooltip with evidence */}
              {stage.evidence && (
                <div className={`hidden group-hover:block absolute left-0 top-full mt-1 z-10 p-3 rounded-lg text-xs max-w-sm ${
                  darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {stage.evidence}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Biggest leak callout */}
      {funnel.biggest_leak && (
        <div className={`rounded-lg p-3 mb-4 ${
          darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <span className="text-xs font-medium text-red-400">Biggest Leak:</span>
          <p className={`text-sm mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
            {funnel.biggest_leak}
          </p>
        </div>
      )}

      {/* Narrative */}
      {funnel.funnel_narrative && (
        <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {funnel.funnel_narrative}
        </p>
      )}
    </div>
  )
}
