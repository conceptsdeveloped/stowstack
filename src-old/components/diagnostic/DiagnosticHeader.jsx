import { useState } from 'react'
import { Sun, Moon, ArrowLeft, Download, RefreshCw, Share2, Check, Link2 } from 'lucide-react'

export default function DiagnosticHeader({ facility, darkMode, onToggleDarkMode, onReset, onBack, onDownloadReport, onShare, shareUrl, readOnly }) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    if (shareUrl) {
      // Already shared — copy URL
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    setSharing(true)
    try {
      await onShare?.()
    } finally {
      setSharing(false)
    }
  }

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
      darkMode
        ? 'bg-slate-900/80 border-slate-700/50'
        : 'bg-white/80 border-slate-200'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: back + logo */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
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
          {/* Share button */}
          {!readOnly && onShare && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                shareUrl
                  ? copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              {sharing ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : shareUrl ? (
                <Link2 className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {sharing ? 'Saving...' : copied ? 'Copied!' : shareUrl ? 'Copy Link' : 'Share'}
            </button>
          )}

          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Report
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="New Audit"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
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
