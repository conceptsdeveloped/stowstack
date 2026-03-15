import { useState, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Facility, AdVariation, ANGLE_ICONS, VARIATION_STATUS_COLORS } from './types'

/* ── Variation Card ── */

function VariationCard({
  v, darkMode, adminKey, onUpdate,
}: {
  v: AdVariation
  darkMode: boolean
  adminKey: string
  onUpdate: (updated: AdVariation) => void
}) {
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [editFields, setEditFields] = useState(v.content_json)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  async function patchVariation(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/facility-creatives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ variationId: v.id, ...body }),
      })
      const data = await res.json()
      if (data.variation) onUpdate(data.variation)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${card}`}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ANGLE_ICONS[v.angle] || '📝'}</span>
          <span className={`text-sm font-semibold ${text}`}>{v.content_json.angleLabel || v.angle}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
            {v.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${sub}`}>v{v.version}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            {v.platform.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Preview or edit mode */}
      <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Primary Text</label>
              <textarea
                value={editFields.primaryText}
                onChange={e => setEditFields({ ...editFields, primaryText: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.primaryText.length > 125 ? 'text-red-500' : sub}`}>{editFields.primaryText.length}/125</p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Headline</label>
              <input
                value={editFields.headline}
                onChange={e => setEditFields({ ...editFields, headline: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.headline.length > 40 ? 'text-red-500' : sub}`}>{editFields.headline.length}/40</p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Description</label>
              <input
                value={editFields.description}
                onChange={e => setEditFields({ ...editFields, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <p className={`text-xs mt-0.5 ${editFields.description.length > 30 ? 'text-red-500' : sub}`}>{editFields.description.length}/30</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>CTA</label>
                <select
                  value={editFields.cta}
                  onChange={e => setEditFields({ ...editFields, cta: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                >
                  {['Learn More', 'Get Quote', 'Book Now', 'Contact Us', 'Sign Up'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium uppercase ${sub} block mb-1`}>Targeting</label>
                <input
                  value={editFields.targetingNote}
                  onChange={e => setEditFields({ ...editFields, targetingNote: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { patchVariation({ content_json: editFields, status: 'approved' }); setEditing(false) }}
                disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save & Approve'}
              </button>
              <button
                onClick={() => { patchVariation({ content_json: editFields }); setEditing(false) }}
                disabled={saving}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
              >
                Save Draft
              </button>
              <button onClick={() => { setEditing(false); setEditFields(v.content_json) }} className={`px-3 py-1.5 text-xs ${sub} hover:underline`}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Meta ad preview mock */}
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <p className={`text-sm leading-relaxed ${text}`}>{v.content_json.primaryText}</p>
              <div className={`mt-3 border-t pt-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-xs uppercase tracking-wide ${sub}`}>stowstack.co</p>
                <p className={`font-semibold text-sm ${text}`}>{v.content_json.headline}</p>
                <p className={`text-xs ${sub}`}>{v.content_json.description}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {v.content_json.cta}
                </span>
                {v.content_json.targetingNote && (
                  <span className={`text-xs ${sub}`}>{v.content_json.targetingNote}</span>
                )}
              </div>
            </div>

            {/* Feedback display */}
            {v.feedback && (
              <div className={`mt-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-medium text-xs uppercase tracking-wide mb-1">Feedback</p>
                {v.feedback}
              </div>
            )}

            {/* Reject with feedback form */}
            {rejecting && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="What needs to change? Be specific so we can regenerate better copy..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { patchVariation({ status: 'rejected', feedback }); setRejecting(false); setFeedback('') }}
                    disabled={!feedback.trim() || saving}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-40"
                  >
                    {saving ? '...' : 'Reject with Notes'}
                  </button>
                  <button onClick={() => { setRejecting(false); setFeedback('') }} className={`px-3 py-1.5 text-xs ${sub} hover:underline`}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {v.status !== 'published' && !rejecting && (
              <div className="flex gap-2 mt-3">
                {v.status !== 'approved' && (
                  <button
                    onClick={() => patchVariation({ status: 'approved' })}
                    disabled={saving}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {saving ? '...' : 'Approve'}
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Edit
                </button>
                {v.status !== 'rejected' && (
                  <button
                    onClick={() => setRejecting(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                )}
                {v.status === 'approved' && (
                  <button
                    onClick={() => patchVariation({ status: 'draft' })}
                    disabled={saving}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
                  >
                    Unapprove
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Creative Tab ── */

export default function CreativeTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    fetch(`/api/facility-creatives?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => { if (data.variations) setVariations(data.variations) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function generateCopy(feedbackText?: string) {
    setGenerating(true)
    try {
      const body: Record<string, string> = { facilityId: facility.id }
      if (feedbackText) body.feedback = feedbackText

      const res = await fetch('/api/facility-creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.variations) setVariations(prev => [...data.variations, ...prev])
      setShowRegenInput(false)
      setRegenFeedback('')
    } finally {
      setGenerating(false)
    }
  }

  function handleUpdate(updated: AdVariation) {
    setVariations(prev => prev.map(v => v.id === updated.id ? updated : v))
  }

  const approved = variations.filter(v => v.status === 'approved' || v.status === 'published').length
  const total = variations.length

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-5">
      {/* Header with stats + generate button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${text}`}>Ad Variations</h3>
          {total > 0 && (
            <p className={`text-sm ${sub}`}>{approved}/{total} approved</p>
          )}
        </div>
        <div className="flex gap-2">
          {showRegenInput ? (
            <div className="flex items-end gap-2">
              <textarea
                value={regenFeedback}
                onChange={e => setRegenFeedback(e.target.value)}
                placeholder="Direction for new variations..."
                rows={2}
                className={`w-64 px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              />
              <button
                onClick={() => generateCopy(regenFeedback || undefined)}
                disabled={generating}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => { setShowRegenInput(false); setRegenFeedback('') }} className={`text-xs ${sub} hover:underline whitespace-nowrap`}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              {total > 0 && (
                <button
                  onClick={() => setShowRegenInput(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Regenerate with Notes
                </button>
              )}
              <button
                onClick={() => generateCopy()}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Generating...' : total > 0 ? 'Generate More' : 'Generate Ad Copy'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && !generating && (
        <div className={`text-center py-16 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <Sparkles size={32} className={`mx-auto mb-3 ${sub}`} />
          <p className={`font-medium ${text}`}>No ad variations yet</p>
          <p className={`text-sm ${sub} mt-1`}>Click "Generate Ad Copy" to create Meta ad variations using Claude AI</p>
        </div>
      )}

      {/* Version groups */}
      {total > 0 && (() => {
        const versions = [...new Set(variations.map(v => v.version))].sort((a, b) => b - a)
        return versions.map(ver => {
          const batch = variations.filter(v => v.version === ver)
          return (
            <div key={ver}>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-3`}>
                Version {ver} · {new Date(batch[0].created_at).toLocaleDateString()}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {batch.map(v => (
                  <VariationCard key={v.id} v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}
