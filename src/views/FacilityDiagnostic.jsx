import { useState, useRef } from 'react'
import { useDiagnostic } from '../hooks/useDiagnostic'
import UploadPanel from '../components/diagnostic/UploadPanel'
import AnalyzingOverlay from '../components/diagnostic/AnalyzingOverlay'
import DiagnosticHeader from '../components/diagnostic/DiagnosticHeader'
import HealthScoreGauge from '../components/diagnostic/HealthScoreGauge'
import CategoryGrid from '../components/diagnostic/CategoryGrid'
import ConversionFunnel from '../components/diagnostic/ConversionFunnel'
import FindingsPanel from '../components/diagnostic/FindingsPanel'
import ActionPlanTable from '../components/diagnostic/ActionPlanTable'
import ImpactEffortMatrix from '../components/diagnostic/ImpactEffortMatrix'
import RevenueImpactChart from '../components/diagnostic/RevenueImpactChart'
import CompetitorSnapshot from '../components/diagnostic/CompetitorSnapshot'
import OperatorAlignment from '../components/diagnostic/OperatorAlignment'
import StowStackCTA from '../components/diagnostic/StowStackCTA'
import DecayProjector from '../components/diagnostic/DecayProjector'
import { generateReport } from '../lib/reportGenerator'

export default function FacilityDiagnostic({ onBack }) {
  const { state, processFile, toggleDarkMode, reset } = useDiagnostic()
  const { phase, auditResult, error, darkMode, csvMeta } = state
  const [expandedCategory, setExpandedCategory] = useState('occupancy_momentum')
  const [shareUrl, setShareUrl] = useState(null)
  const findingsRef = useRef(null)

  function handleExpandCategory(key) {
    setExpandedCategory(key)
    findingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleDownloadReport() {
    if (!auditResult) return
    try {
      await generateReport(auditResult)
    } catch (err) {
      console.error('Report generation failed:', err)
    }
  }

  async function handleShare() {
    if (!auditResult) return
    try {
      const res = await fetch('/api/audit-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit: auditResult }),
      })
      if (!res.ok) throw new Error('Failed to save audit')
      const { url } = await res.json()
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  // Upload phase
  if (phase === 'upload' || phase === 'parsing') {
    return <UploadPanel onFileSelect={processFile} error={error} />
  }

  // Analyzing phase
  if (phase === 'analyzing') {
    return <AnalyzingOverlay facilityName={csvMeta?.facilityName} />
  }

  // Error phase (during analysis)
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Dashboard phase
  const dm = darkMode
  const audit = auditResult
  if (!audit) return null

  return (
    <div data-theme={dm ? 'dark' : 'light'} className={dm ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}>
      <DiagnosticHeader
        facility={audit.facility_summary}
        darkMode={dm}
        onToggleDarkMode={toggleDarkMode}
        onReset={reset}
        onBack={onBack}
        onDownloadReport={handleDownloadReport}
        onShare={handleShare}
        shareUrl={shareUrl}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Facility info bar */}
        {audit.facility_summary && (
          <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-xs ${
            dm ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {audit.facility_summary.address && <span>{audit.facility_summary.address}</span>}
            {audit.facility_summary.stage && <span>{audit.facility_summary.stage}</span>}
            {audit.facility_summary.unit_count_range && <span>{audit.facility_summary.unit_count_range} units</span>}
            {audit.facility_summary.occupancy_range && <span>{audit.facility_summary.occupancy_range} occupancy</span>}
            {audit.facility_summary.pms && <span>PMS: {audit.facility_summary.pms}</span>}
          </div>
        )}

        {/* Overall score */}
        <HealthScoreGauge
          score={audit.overall_score?.score || 0}
          summary={audit.overall_score?.summary}
          topIssues={audit.overall_score?.top_3_issues}
          topStrengths={audit.overall_score?.top_3_strengths}
          darkMode={dm}
        />

        {/* Category grid */}
        <CategoryGrid
          categories={audit.categories}
          darkMode={dm}
          onExpandCategory={handleExpandCategory}
        />

        {/* Conversion funnel */}
        <ConversionFunnel funnel={audit.conversion_funnel} darkMode={dm} />

        {/* Findings deep-dive */}
        <div ref={findingsRef}>
          <FindingsPanel
            categories={audit.categories}
            expandedCategory={expandedCategory}
            onChangeCategory={setExpandedCategory}
            darkMode={dm}
          />
        </div>

        {/* Action plan + matrix side by side on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <ActionPlanTable actions={audit.priority_action_plan} darkMode={dm} />
          <ImpactEffortMatrix actions={audit.priority_action_plan} darkMode={dm} />
        </div>

        {/* Revenue impact */}
        <RevenueImpactChart revenue={audit.revenue_impact} darkMode={dm} />

        {/* Decay projector — "What happens if you do nothing" */}
        <DecayProjector audit={audit} darkMode={dm} />

        {/* Operator alignment */}
        <OperatorAlignment alignment={audit.operator_alignment} darkMode={dm} />

        {/* Competitor snapshot */}
        <CompetitorSnapshot competitor={audit.competitor_analysis} darkMode={dm} />

        {/* StowStack CTA */}
        <StowStackCTA opportunities={audit.stowstack_opportunities} darkMode={dm} />

        {/* Footer */}
        <div className={`text-center py-8 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
          Generated by StowStack Facility Diagnostic · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </main>
    </div>
  )
}
