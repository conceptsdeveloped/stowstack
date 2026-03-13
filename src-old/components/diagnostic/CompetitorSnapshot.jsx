import { Shield, Swords } from 'lucide-react'
import { getScoreColor } from '../../lib/scoreUtils'

export default function CompetitorSnapshot({ competitor, darkMode }) {
  if (!competitor) return null

  const score = competitor.competitive_score || 0
  const color = getScoreColor(score)

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Competitor Snapshot
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Score</span>
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>

      {/* Named competitors */}
      {competitor.competitors_named?.filter(Boolean).length > 0 && (
        <div className="mb-4">
          <h4 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>Competitors Watched</h4>
          <div className="flex flex-wrap gap-2">
            {competitor.competitors_named.filter(Boolean).map((name, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* What competitors do better */}
        {competitor.perceived_competitor_advantages && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-500/5 border border-red-500/10' : 'bg-red-50 border border-red-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Swords className="w-4 h-4 text-red-400" />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                They Do Better
              </h4>
            </div>
            <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {competitor.perceived_competitor_advantages}
            </p>
          </div>
        )}

        {/* Your advantages */}
        {competitor.facility_advantages && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/5 border border-green-500/10' : 'bg-green-50 border border-green-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <h4 className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                Your Advantage
              </h4>
            </div>
            <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {competitor.facility_advantages}
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {competitor.competitive_positioning_summary && (
        <p className={`text-sm leading-relaxed mt-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {competitor.competitive_positioning_summary}
        </p>
      )}
    </div>
  )
}
