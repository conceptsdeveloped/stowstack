import { Sun, Moon, ArrowLeft, Download, RefreshCw } from 'lucide-react'

export default function DiagnosticHeader({ facility, darkMode, onToggleDarkMode, onReset, onBack, onDownloadReport }) {
  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
      darkMode
        ? 'bg-slate-900/80 border-slate-700/50'
        : 'bg-white/80 border-slate-200'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: back + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              StowStack
            </span>
          </div>
          {facility && (
            <>
              <span className={`text-sm ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>/</span>
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {facility.name}
              </span>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadReport}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
          <button
            onClick={onReset}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="New Audit"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
