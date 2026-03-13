import { Rocket, Target, DollarSign, BarChart3, ArrowRight } from 'lucide-react'

export default function StowStackCTA({ opportunities, darkMode }) {
  if (!opportunities) return null

  const fitColors = {
    strong: { bg: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Strong Fit' },
    moderate: { bg: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Moderate Fit' },
    weak: { bg: 'from-slate-500/20 to-slate-600/20', border: 'border-slate-500/30', text: 'text-slate-400', label: 'Exploratory' },
  }
  const fit = fitColors[opportunities.meta_ads_fit] || fitColors.moderate

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-green-500/20' : 'border-green-200'
    }`}>
      {/* Header with gradient */}
      <div className={`p-6 bg-gradient-to-r ${fit.bg}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              What StowStack Can Fix
            </h2>
            <span className={`text-xs font-medium ${fit.text}`}>
              Meta Ads Fit: {fit.label}
            </span>
          </div>
        </div>
        {opportunities.meta_ads_rationale && (
          <p className={`text-sm leading-relaxed mt-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {opportunities.meta_ads_rationale}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className={`p-6 ${darkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: DollarSign,
              label: 'Recommended Budget',
              value: opportunities.recommended_monthly_budget || '—',
            },
            {
              icon: Target,
              label: 'Cost per Lead',
              value: opportunities.expected_cost_per_lead || '—',
            },
            {
              icon: BarChart3,
              label: 'Cost per Move-In',
              value: opportunities.expected_cost_per_movein || '—',
            },
            {
              icon: Rocket,
              label: 'Add\'l Move-Ins/Mo',
              value: opportunities.projected_additional_moveins_per_month || '—',
            },
          ].map((stat, i) => (
            <div key={i} className={`p-3 rounded-xl ${
              darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
            }`}>
              <stat.icon className={`w-4 h-4 mb-1.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <p className={`text-xs mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {stat.label}
              </p>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Other services */}
        {opportunities.other_services?.filter(Boolean).length > 0 && (
          <div className="mb-6">
            <h4 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Additional Services</h4>
            <div className="space-y-1.5">
              {opportunities.other_services.filter(Boolean).map((service, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <ArrowRight className="w-3 h-3 text-green-400 shrink-0" />
                  {service}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA button */}
        <a
          href="https://stowstack.co"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
        >
          Get Started with StowStack
        </a>
      </div>
    </div>
  )
}
