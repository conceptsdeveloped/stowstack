import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, FileSpreadsheet } from 'lucide-react'

export default function UploadPanel({ onFileSelect, error }) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      return
    }
    setFileName(file.name)
    onFileSelect(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="w-full max-w-xl">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">StowStack</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Facility Diagnostic</h1>
          <p className="text-slate-400 text-lg">
            Upload your Google Sheets diagnostic CSV to generate a comprehensive facility audit
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed p-12
            transition-all duration-200 text-center
            ${dragOver
              ? 'border-green-400 bg-green-400/10 scale-[1.02]'
              : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800/80'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
            dragOver ? 'bg-green-500/20' : 'bg-slate-700'
          }`}>
            <Upload className={`w-8 h-8 ${dragOver ? 'text-green-400' : 'text-slate-400'}`} />
          </div>

          <p className="text-lg font-medium text-white mb-1">
            {dragOver ? 'Drop your CSV here' : 'Drag & drop your diagnostic CSV'}
          </p>
          <p className="text-sm text-slate-500">
            or click to browse — accepts .csv files exported from Google Sheets
          </p>

          {fileName && !error && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <FileText className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">{fileName}</span>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Upload Error</p>
              <p className="text-sm text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3">How it works</h3>
          <ol className="space-y-2">
            {[
              'Export your diagnostic form responses from Google Sheets as CSV',
              'Upload the CSV file here (one facility per row)',
              'Our AI analyzes 87 data points across 12 categories',
              'Get an interactive audit dashboard + downloadable report',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
