import { useState, useEffect } from 'react'
import { getScoreColor, getLetterGrade } from '../../lib/scoreUtils'

export default function HealthScoreGauge({ score, summary, topIssues, topStrengths, darkMode }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1500
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const color = getScoreColor(score)
  const grade = getLetterGrade(score)
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${
      darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
    }`}>
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Gauge */}
        <div className="relative shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={darkMode ? '#1e293b' : '#f1f5f9'}
              strokeWidth="12"
            />
            {/* Score ring */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold" style={{ color }}>{animatedScore}</span>
            <span className="text-lg font-bold mt-1" style={{ color }}>{grade}</span>
          </div>
        </div>

        {/* Summary + pills */}
        <div className="flex-1 text-center lg:text-left">
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Overall Health Score
          </h2>
          <p className={`text-sm leading-relaxed mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {summary}
          </p>

          {/* Top issues */}
          {topIssues?.length > 0 && (
            <div className="mb-3">
              <span className={`text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>Top Issues</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {topIssues.map((issue, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top strengths */}
          {topStrengths?.length > 0 && (
            <div>
              <span className={`text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>Strengths</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {topStrengths.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
