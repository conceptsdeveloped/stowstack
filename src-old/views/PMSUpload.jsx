import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, FileSpreadsheet, Building2 } from 'lucide-react'
import Papa from 'papaparse'

const REPORT_TYPES = [
  { value: 'unit_inventory', label: 'Unit Inventory / Availability Report' },
  { value: 'occupancy_history', label: 'Occupancy History Report' },
  { value: 'rent_roll', label: 'Rent Roll / Current Tenants' },
  { value: 'move_in_out', label: 'Move-In / Move-Out Report' },
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'rate_comparison', label: 'Rate Comparison / Street Rates' },
  { value: 'delinquency', label: 'Delinquency / Collections Report' },
  { value: 'other', label: 'Other Report' },
]

export default function PMSUpload({ onBack }) {
  const [step, setStep] = useState('info') // info | upload | success
  const [facilityName, setFacilityName] = useState('')
  const [email, setEmail] = useState('')
  const [reportType, setReportType] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'tsv', 'txt'].includes(ext)) {
      setError('Please upload a CSV, TSV, or TXT file exported from your PMS.')
      return
    }
    setFile(f)
    setError(null)
  }

  async function handleSubmit() {
    if (!facilityName.trim() || !email.trim()) {
      setError('Please enter your facility name and email.')
      return
    }
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Parse CSV client-side
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (err) => reject(err),
        })
      })

      if (!parsed.data || parsed.data.length === 0) {
        throw new Error('The file appears to be empty or could not be parsed.')
      }

      const res = await fetch('/api/pms-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityName: facilityName.trim(),
          email: email.trim().toLowerCase(),
          reportType,
          fileName: file.name,
          reportData: {
            headers: parsed.meta.fields,
            rowCount: parsed.data.length,
            preview: parsed.data.slice(0, 5), // first 5 rows as preview
            allData: parsed.data,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }

      setStep('success')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Report Uploaded</h2>
          <p className="text-slate-400 text-sm mb-2">
            Thank you! We received your PMS report for <strong className="text-white">{facilityName}</strong>.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            We will use this data to validate and enhance your facility audit with real numbers. You will hear from us soon.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setStep('info'); setFile(null); setReportType(''); }}
              className="px-5 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              Upload Another
            </button>
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Back to StowStack
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      <div className="max-w-xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">PMS Report Upload</h1>
              <p className="text-xs text-slate-500">Share your data so we can validate your audit with real numbers</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Facility name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Facility Name</label>
            <input
              value={facilityName}
              onChange={e => setFacilityName(e.target.value)}
              placeholder="e.g. MidWay Self Storage"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Your Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Report type */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Report Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-slate-600 appearance-none"
            >
              <option value="">Select report type...</option>
              {REPORT_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">PMS Report File</label>
            <div
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                dragOver
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-300">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-green-400' : 'text-slate-500'}`} />
                  <p className="text-sm text-slate-400">Drag and drop your CSV export here</p>
                  <p className="text-xs text-slate-600 mt-1">Accepts .csv, .tsv, .txt from storEDGE, SiteLink, etc.</p>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Report
              </>
            )}
          </button>

          {/* Info box */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 mb-2">What reports help the most?</h3>
            <ul className="space-y-1.5">
              {[
                'Unit inventory with sizes, types, and current rates',
                'Occupancy history (last 6-12 months)',
                'Move-in / move-out report (last 90 days)',
                'Rent roll showing current tenants and rates',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-600 mt-3">
              Your data is kept confidential and used only for your facility audit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
