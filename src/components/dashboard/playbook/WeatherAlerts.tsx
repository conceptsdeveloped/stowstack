import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import type { WeatherAlert } from './PlaybookData'

interface WeatherAlertsProps {
  alerts: WeatherAlert[]
  darkMode: boolean
  onViewPlaybook: (playbookId: string) => void
  onDismiss: (alertId: string) => void
}

export default function WeatherAlerts({ alerts, darkMode, onViewPlaybook, onDismiss }: WeatherAlertsProps) {
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-3 ${
          alert.severity === 'warning'
            ? darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
            : alert.severity === 'watch'
              ? darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
              : darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
        }`}>
          <AlertTriangle size={18} className={
            alert.severity === 'warning' ? 'text-red-500' : alert.severity === 'watch' ? 'text-amber-500' : 'text-blue-500'
          } />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-sm font-semibold ${text}`}>{alert.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                alert.severity === 'warning'
                  ? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'
                  : alert.severity === 'watch'
                    ? darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'
                    : darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>{alert.severity}</span>
              <span className={`text-[10px] ${sub}`}>{alert.region}</span>
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{alert.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[10px] flex items-center gap-1 ${sub}`}>
                <Clock size={10} /> Expires in {alert.expiresIn}
              </span>
              <button
                onClick={() => onViewPlaybook(alert.activatesPlaybook)}
                className="text-[10px] text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"
              >
                <ArrowRight size={10} /> View playbook
              </button>
            </div>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-white'}`}
          >
            <span className={`text-xs ${sub}`}>Dismiss</span>
          </button>
        </div>
      ))}
    </div>
  )
}
