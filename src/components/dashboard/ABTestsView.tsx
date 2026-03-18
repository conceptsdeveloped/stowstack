import { useState, useEffect } from 'react'
import {
  Loader2, Plus, Play, Pause, Trophy, BarChart3,
  CheckCircle2, ChevronDown, Beaker
} from 'lucide-react'

interface ABTest {
  id: string
  facilityId: string
  facilityName?: string
  name: string
  description: string
  status: string
  variants: { id: string; name: string; slug: string; weight: number }[]
  metrics: { primary: string; secondary?: string[] }
  landingPageIds: string[]
  startDate: string
  endDate: string | null
  winnerVariantId: string | null
  createdAt: string
  results?: {
    variants: {
      variantId: string
      variantName: string
      visitors: number
      conversions: number
      conversionRate: number
      revenue: number
    }[]
    significance: { isSignificant: boolean; confidence: number; chiSquare: number }
    totalVisitors: number
    totalConversions: number
  }
}

interface Lead {
  id: string
  name: string
  accessCode?: string
  status: string
}

export default function ABTestsView({ leads, adminKey }: { leads: Lead[]; adminKey: string }) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [newTest, setNewTest] = useState({
    facilityId: '',
    name: '',
    description: '',
    variantA: 'Control',
    variantB: 'Variant B',
    metric: 'reservation_completed',
    weightA: 50,
  })
  const [creating, setCreating] = useState(false)

  const signedClients = leads.filter(l => l.status === 'client_signed')

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/ab-tests?all=true', {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setTests(data.data || data.tests || [])
      }
    } catch (err) {
      console.warn('Failed to fetch A/B tests:', err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchTests() }, [adminKey])

  const createTest = async () => {
    if (!newTest.facilityId || !newTest.name) return
    setCreating(true)

    try {
      const res = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: newTest.facilityId,
          name: newTest.name,
          description: newTest.description,
          variants: [
            { name: newTest.variantA, weight: newTest.weightA },
            { name: newTest.variantB, weight: 100 - newTest.weightA },
          ],
          metrics: { primary: newTest.metric },
        }),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewTest({ facilityId: '', name: '', description: '', variantA: 'Control', variantB: 'Variant B', metric: 'reservation_completed', weightA: 50 })
        fetchTests()
      }
    } catch (err) {
      console.error('Create test error:', err)
    }
    setCreating(false)
  }

  const updateTestStatus = async (testId: string, status: string) => {
    try {
      await fetch(`/api/ab-tests?id=${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ status }),
      })
      fetchTests()
    } catch (err) {
      console.error('Update test error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading A/B tests...
      </div>
    )
  }

  const activeTests = tests.filter(t => t.status === 'active')
  const completedTests = tests.filter(t => t.status === 'completed')
  const pausedTests = tests.filter(t => t.status === 'paused')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{activeTests.length} active, {completedTests.length} completed</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={14} /> New Test
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold mb-4">Create A/B Test</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Facility</label>
              <select
                value={newTest.facilityId}
                onChange={e => setNewTest({ ...newTest, facilityId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select facility...</option>
                {signedClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Test Name</label>
              <input
                type="text"
                value={newTest.name}
                onChange={e => setNewTest({ ...newTest, name: e.target.value })}
                placeholder="e.g., Climate CTA headline test"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={newTest.description}
                onChange={e => setNewTest({ ...newTest, description: e.target.value })}
                placeholder="What are you testing?"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Variant A (Control)</label>
              <input
                type="text"
                value={newTest.variantA}
                onChange={e => setNewTest({ ...newTest, variantA: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Variant B (Treatment)</label>
              <input
                type="text"
                value={newTest.variantB}
                onChange={e => setNewTest({ ...newTest, variantB: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Primary Metric</label>
              <select
                value={newTest.metric}
                onChange={e => setNewTest({ ...newTest, metric: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="reservation_completed">Reservation completed</option>
                <option value="lead_form_submitted">Lead form submitted</option>
                <option value="phone_call_clicked">Phone call clicked</option>
                <option value="unit_selected">Unit selected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Traffic Split (A/B): {newTest.weightA}/{100 - newTest.weightA}</label>
              <input
                type="range"
                min={10}
                max={90}
                step={10}
                value={newTest.weightA}
                onChange={e => setNewTest({ ...newTest, weightA: parseInt(e.target.value) })}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={createTest}
              disabled={creating || !newTest.facilityId || !newTest.name}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Test'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Tests</p>
          <p className="text-2xl font-bold">{tests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{activeTests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Winners Found</p>
          <p className="text-2xl font-bold text-blue-600">{completedTests.filter(t => t.winnerVariantId).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Paused</p>
          <p className="text-2xl font-bold text-slate-400">{pausedTests.length}</p>
        </div>
      </div>

      {/* Test List */}
      {tests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Beaker size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No A/B tests yet</p>
          <p className="text-sm mt-1">Create your first test to start optimizing landing page conversions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <div key={test.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    test.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                    test.status === 'completed' ? 'bg-blue-500' :
                    'bg-slate-300'
                  }`} />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                    <p className="text-xs text-slate-500">{test.description || `${test.variants?.length || 2} variants`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    test.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    test.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {test.status}
                  </span>
                  {test.winnerVariantId && <Trophy size={14} className="text-amber-500" />}
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedTest === test.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedTest === test.id && (
                <div className="border-t border-slate-100 p-4">
                  {/* Variant Results */}
                  {test.results ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {test.results.variants.map(v => {
                          const isWinner = test.winnerVariantId === v.variantId
                          return (
                            <div key={v.variantId} className={`p-4 rounded-lg border ${isWinner ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">{v.variantName}</span>
                                {isWinner && <Trophy size={14} className="text-amber-500" />}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <p className="text-[10px] text-slate-500">Visitors</p>
                                  <p className="text-sm font-bold">{v.visitors}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">Conversions</p>
                                  <p className="text-sm font-bold text-emerald-600">{v.conversions}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">Conv. Rate</p>
                                  <p className="text-sm font-bold">{(v.conversionRate * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Significance */}
                      <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${
                        test.results.significance.isSignificant
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {test.results.significance.isSignificant
                          ? <><CheckCircle2 size={14} /> Statistically significant ({(test.results.significance.confidence * 100).toFixed(0)}% confidence)</>
                          : <><BarChart3 size={14} /> Not yet significant — need more traffic. {test.results.totalVisitors} visitors so far.</>
                        }
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No results data yet. Waiting for traffic.</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    {test.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateTestStatus(test.id, 'paused')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                        >
                          <Pause size={12} /> Pause
                        </button>
                        <button
                          onClick={() => updateTestStatus(test.id, 'completed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          <Trophy size={12} /> End Test
                        </button>
                      </>
                    )}
                    {test.status === 'paused' && (
                      <button
                        onClick={() => updateTestStatus(test.id, 'active')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                      >
                        <Play size={12} /> Resume
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      Started {new Date(test.startDate || test.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
