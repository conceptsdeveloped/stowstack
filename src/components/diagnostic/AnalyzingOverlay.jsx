import { useState, useEffect } from 'react'
import { Brain, CheckCircle2 } from 'lucide-react'
import { CATEGORY_LABELS } from '../../lib/scoreUtils'

const ANALYSIS_STEPS = [
  'Parsing facility data...',
  ...Object.values(CATEGORY_LABELS).map(l => `Analyzing ${l}...`),
  'Calculating conversion funnel...',
  'Building action plan...',
  'Estimating revenue impact...',
  'Finalizing audit report...',
]

export default function AnalyzingOverlay({ facilityName }) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < ANALYSIS_STEPS.length - 1) return prev + 1
        return prev
      })
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const progress = ((currentStep + 1) / ANALYSIS_STEPS.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="w-full max-w-md text-center">
        {/* Animated brain icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 animate-pulse">
          <Brain className="w-10 h-10 text-green-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Analyzing {facilityName || 'Your Facility'}</h2>
        <p className="text-slate-400 mb-8">Our AI is reviewing 87 data points across 12 categories</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step list */}
        <div className="space-y-2 text-left max-h-80 overflow-y-auto px-2">
          {ANALYSIS_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i < currentStep ? 'text-green-400' :
                i === currentStep ? 'text-white' :
                'text-slate-600'
              }`}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
              ) : i === currentStep ? (
                <div className="w-4 h-4 shrink-0 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
              ) : (
                <div className="w-4 h-4 shrink-0 rounded-full border border-slate-600" />
              )}
              {step}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-6">This typically takes 15–30 seconds</p>
      </div>
    </div>
  )
}
