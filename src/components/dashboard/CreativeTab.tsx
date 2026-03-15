import { useState, useEffect } from 'react'
import { Loader2, Sparkles, Search, FileText, Mail, ChevronDown, ChevronUp, Copy, Check, Rocket, Globe, Zap } from 'lucide-react'
import {
  Facility, AdVariation, MetaAdContent, GoogleRSAContent, LandingPageContent, EmailDripContent,
  ANGLE_ICONS, VARIATION_STATUS_COLORS, PLATFORM_LABELS, PLATFORM_ICONS,
  type GenerationPlatform,
} from './types'

/* ═══════════════════════════════════════════════════════════════
   META AD VARIATION CARD (existing, refined)
   ═══════════════════════════════════════════════════════════════ */

function MetaVariationCard({
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
  const content = v.content_json as MetaAdContent
  const [editFields, setEditFields] = useState(content)

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
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ANGLE_ICONS[v.angle] || '📝'}</span>
          <span className={`text-sm font-semibold ${text}`}>{content.angleLabel || v.angle}</span>
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
              <button onClick={() => { setEditing(false); setEditFields(content) }} className={`px-3 py-1.5 text-xs ${sub} hover:underline`}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <p className={`text-sm leading-relaxed ${text}`}>{content.primaryText}</p>
              <div className={`mt-3 border-t pt-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-xs uppercase tracking-wide ${sub}`}>stowstack.co</p>
                <p className={`font-semibold text-sm ${text}`}>{content.headline}</p>
                <p className={`text-xs ${sub}`}>{content.description}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {content.cta}
                </span>
                {content.targetingNote && (
                  <span className={`text-xs ${sub}`}>{content.targetingNote}</span>
                )}
              </div>
            </div>

            {v.feedback && (
              <div className={`mt-3 p-3 rounded-lg border text-sm ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-medium text-xs uppercase tracking-wide mb-1">Feedback</p>
                {v.feedback}
              </div>
            )}

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

            <VariationActions v={v} saving={saving} darkMode={darkMode}
              onApprove={() => patchVariation({ status: 'approved' })}
              onEdit={() => setEditing(true)}
              onReject={() => setRejecting(true)}
              onUnapprove={() => patchVariation({ status: 'draft' })}
              rejecting={rejecting}
            />
          </>
        )}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   GOOGLE RSA CARD
   ═══════════════════════════════════════════════════════════════ */

function GoogleRSACard({ v, darkMode, adminKey, onUpdate }: {
  v: AdVariation; darkMode: boolean; adminKey: string; onUpdate: (updated: AdVariation) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const content = v.content_json as GoogleRSAContent

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const headlines = content.headlines || []
  const descriptions = content.descriptions || []
  const sitelinks = content.sitelinks || []

  return (
    <div className={`border rounded-xl overflow-hidden ${card}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-blue-500" />
          <span className={`text-sm font-semibold ${text}`}>Google Responsive Search Ad</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
            {v.status}
          </span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className={`text-xs ${sub} hover:underline flex items-center gap-1`}>
          {expanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand</>}
        </button>
      </div>

      <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        {/* Google Search Preview */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <p className="text-xs text-green-700 dark:text-green-400 mb-0.5">Ad · stowstack.co{content.finalUrl || '/'}</p>
          <p className={`text-base font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'} leading-snug`}>
            {headlines.slice(0, 3).map(h => h.text).join(' | ')}
          </p>
          <p className={`text-sm ${sub} mt-1 leading-relaxed`}>
            {descriptions[0]?.text || ''}
          </p>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Headlines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Headlines ({headlines.length}/15)</p>
                <button
                  onClick={() => copyToClipboard(headlines.map(h => h.text).join('\n'), 'headlines')}
                  className={`text-xs flex items-center gap-1 ${sub} hover:underline`}
                >
                  {copied === 'headlines' ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {headlines.map((h, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                    <span className={text}>{h.text}</span>
                    <span className={`text-[10px] ${h.text.length > 30 ? 'text-red-500' : sub}`}>{h.text.length}/30</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Descriptions ({descriptions.length}/4)</p>
                <button
                  onClick={() => copyToClipboard(descriptions.map(d => d.text).join('\n'), 'descriptions')}
                  className={`text-xs flex items-center gap-1 ${sub} hover:underline`}
                >
                  {copied === 'descriptions' ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
                </button>
              </div>
              {descriptions.map((d, i) => (
                <div key={i} className={`px-3 py-2 rounded text-sm mb-1 ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                  <span className={text}>{d.text}</span>
                  <span className={`text-[10px] ml-2 ${d.text.length > 90 ? 'text-red-500' : sub}`}>{d.text.length}/90</span>
                </div>
              ))}
            </div>

            {/* Sitelinks */}
            {sitelinks.length > 0 && (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Sitelink Extensions</p>
                <div className="grid grid-cols-2 gap-2">
                  {sitelinks.map((s, i) => (
                    <div key={i} className={`px-3 py-2 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                      <p className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{s.title}</p>
                      <p className={`text-xs ${sub}`}>{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {content.keywords?.length ? (
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Suggested Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {content.keywords.map((kw, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{kw}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <VariationActions v={v} saving={saving} darkMode={darkMode}
          onApprove={() => patchVariation({ status: 'approved' })}
          onReject={() => patchVariation({ status: 'rejected' })}
          onUnapprove={() => patchVariation({ status: 'draft' })}
          rejecting={false}
        />
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE COPY CARD
   ═══════════════════════════════════════════════════════════════ */

function LandingPageCard({ v, darkMode, adminKey, onUpdate }: {
  v: AdVariation; darkMode: boolean; adminKey: string; onUpdate: (updated: AdVariation) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ slug: string; url: string } | null>(null)
  const content = v.content_json as LandingPageContent

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

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
      if (data.landingPage) setDeployResult(data.landingPage)
    } finally {
      setSaving(false)
      setDeploying(false)
    }
  }

  async function deployToLandingPage() {
    setDeploying(true)
    await patchVariation({ deploy: 'landing_page' })
  }

  const sections = content.sections || []
  const heroConfig = sections.find(s => s.section_type === 'hero')?.config as Record<string, string> | undefined

  return (
    <div className={`border rounded-xl overflow-hidden ${card}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-indigo-500" />
          <span className={`text-sm font-semibold ${text}`}>Landing Page Copy</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
            {v.status}
          </span>
          <span className={`text-xs ${sub}`}>{sections.length} sections</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className={`text-xs ${sub} hover:underline flex items-center gap-1`}>
          {expanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand</>}
        </button>
      </div>

      <div className={`border-t px-4 py-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        {/* Hero preview */}
        {heroConfig && (
          <div className={`rounded-lg p-5 ${darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-900 to-slate-800'} text-white`}>
            {heroConfig.badgeText && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                {heroConfig.badgeText}
              </span>
            )}
            <h3 className="text-lg font-bold leading-tight mb-2">{heroConfig.headline}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{heroConfig.subheadline}</p>
            {heroConfig.ctaText && (
              <span className="inline-block mt-3 text-xs px-4 py-1.5 bg-emerald-600 rounded-full font-semibold">{heroConfig.ctaText}</span>
            )}
          </div>
        )}

        {/* SEO meta preview */}
        {content.meta_title && (
          <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <p className="text-xs text-green-700 dark:text-green-400">stowstack.co/storage/...</p>
            <p className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{content.meta_title}</p>
            <p className={`text-xs ${sub} mt-0.5`}>{content.meta_description}</p>
          </div>
        )}

        {expanded && (
          <div className="mt-4 space-y-3">
            {sections.map((section, i) => {
              const cfg = section.config as Record<string, unknown>
              return (
                <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                      {section.section_type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${sub}`}>#{section.sort_order}</span>
                  </div>
                  {(cfg.headline as string) && <p className={`text-sm font-semibold ${text}`}>{cfg.headline as string}</p>}
                  {(cfg.subheadline as string) && <p className={`text-xs ${sub} mt-0.5`}>{cfg.subheadline as string}</p>}
                  {Array.isArray(cfg.items) && (
                    <ul className="mt-2 space-y-1">
                      {(cfg.items as { title?: string; text?: string; q?: string }[]).slice(0, 3).map((item, j) => (
                        <li key={j} className={`text-xs ${sub}`}>• {item.title || item.text || item.q || JSON.stringify(item).slice(0, 80)}</li>
                      ))}
                      {(cfg.items as unknown[]).length > 3 && <li className={`text-xs ${sub}`}>...and {(cfg.items as unknown[]).length - 3} more</li>}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Deploy action */}
        {(v.status === 'approved' || v.status === 'draft') && !deployResult && (
          <button
            onClick={deployToLandingPage}
            disabled={deploying || saving}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {deploying ? <><Loader2 size={14} className="animate-spin" /> Deploying...</> : <><Rocket size={14} /> Deploy to Landing Page</>}
          </button>
        )}

        {deployResult && (
          <div className={`mt-3 p-3 rounded-lg border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-emerald-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                Deployed! Page live at <code className="text-xs">{deployResult.url}</code>
              </span>
            </div>
          </div>
        )}

        {v.status === 'published' && !deployResult && (
          <div className={`mt-3 flex items-center gap-2 text-xs ${sub}`}>
            <Check size={12} className="text-emerald-500" /> Published to landing page
          </div>
        )}

        <VariationActions v={v} saving={saving} darkMode={darkMode}
          onApprove={() => patchVariation({ status: 'approved' })}
          onReject={() => patchVariation({ status: 'rejected' })}
          onUnapprove={() => patchVariation({ status: 'draft' })}
          rejecting={false}
        />
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   EMAIL DRIP CARD
   ═══════════════════════════════════════════════════════════════ */

function EmailDripCard({ v, darkMode, adminKey, onUpdate }: {
  v: AdVariation; darkMode: boolean; adminKey: string; onUpdate: (updated: AdVariation) => void
}) {
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [dripActivated, setDripActivated] = useState(false)
  const content = v.content_json as EmailDripContent

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

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
      if (data.dripActivated) setDripActivated(true)
    } finally {
      setSaving(false)
      setDeploying(false)
    }
  }

  async function activateDrip() {
    setDeploying(true)
    await patchVariation({ deploy: 'email_drip' })
  }

  const sequence = content.sequence || []

  return (
    <div className={`border rounded-xl overflow-hidden ${card}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-amber-500" />
          <span className={`text-sm font-semibold ${text}`}>Email Drip Sequence</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VARIATION_STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
            {v.status}
          </span>
          <span className={`text-xs ${sub}`}>{sequence.length} emails</span>
        </div>
      </div>

      <div className={`border-t px-4 py-4 space-y-2 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        {sequence.map((email, i) => (
          <div key={i} className={`rounded-lg overflow-hidden ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
            <button
              onClick={() => setExpandedEmail(expandedEmail === i ? null : i)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:${darkMode ? 'bg-slate-700' : 'bg-slate-50'} transition-colors`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  Day {email.delayDays}
                </span>
                <div>
                  <p className={`text-sm font-medium ${text}`}>{email.subject}</p>
                  <p className={`text-xs ${sub}`}>{email.label}</p>
                </div>
              </div>
              {expandedEmail === i ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
            </button>

            {expandedEmail === i && (
              <div className={`px-4 pb-4 border-t ${darkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                {email.preheader && (
                  <p className={`text-xs ${sub} mt-3 mb-2 italic`}>Preheader: {email.preheader}</p>
                )}
                <div className={`text-sm ${text} leading-relaxed whitespace-pre-line mt-2`}>{email.body}</div>
                {email.ctaText && (
                  <span className="inline-block mt-3 text-xs px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold">{email.ctaText}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Deploy action */}
        {(v.status === 'approved' || v.status === 'draft') && !dripActivated && (
          <button
            onClick={activateDrip}
            disabled={deploying || saving}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            {deploying ? <><Loader2 size={14} className="animate-spin" /> Activating...</> : <><Zap size={14} /> Activate Drip Sequence</>}
          </button>
        )}

        {dripActivated && (
          <div className={`mt-3 p-3 rounded-lg border ${darkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                Drip sequence activated and ready for enrollment
              </span>
            </div>
          </div>
        )}

        {v.status === 'published' && !dripActivated && (
          <div className={`mt-3 flex items-center gap-2 text-xs ${sub}`}>
            <Check size={12} className="text-emerald-500" /> Drip sequence activated
          </div>
        )}

        <VariationActions v={v} saving={saving} darkMode={darkMode}
          onApprove={() => patchVariation({ status: 'approved' })}
          onReject={() => patchVariation({ status: 'rejected' })}
          onUnapprove={() => patchVariation({ status: 'draft' })}
          rejecting={false}
        />
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   SHARED ACTION BUTTONS
   ═══════════════════════════════════════════════════════════════ */

function VariationActions({ v, saving, darkMode, onApprove, onEdit, onReject, onUnapprove, rejecting }: {
  v: AdVariation
  saving: boolean
  darkMode: boolean
  onApprove: () => void
  onEdit?: () => void
  onReject: () => void
  onUnapprove: () => void
  rejecting: boolean
}) {
  if (v.status === 'published' || rejecting) return null

  return (
    <div className="flex gap-2 mt-3">
      {v.status !== 'approved' && (
        <button onClick={onApprove} disabled={saving}
          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40">
          {saving ? '...' : 'Approve'}
        </button>
      )}
      {onEdit && (
        <button onClick={onEdit}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          Edit
        </button>
      )}
      {v.status !== 'rejected' && (
        <button onClick={onReject}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
          Reject
        </button>
      )}
      {v.status === 'approved' && (
        <button onClick={onUnapprove} disabled={saving}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}>
          Unapprove
        </button>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   VARIATION ROUTER — renders the right card per platform
   ═══════════════════════════════════════════════════════════════ */

function VariationCard({ v, darkMode, adminKey, onUpdate }: {
  v: AdVariation; darkMode: boolean; adminKey: string; onUpdate: (updated: AdVariation) => void
}) {
  switch (v.platform) {
    case 'google_search':
      return <GoogleRSACard v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={onUpdate} />
    case 'landing_page':
      return <LandingPageCard v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={onUpdate} />
    case 'email_drip':
      return <EmailDripCard v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={onUpdate} />
    default:
      return <MetaVariationCard v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={onUpdate} />
  }
}


/* ═══════════════════════════════════════════════════════════════
   CREATIVE TAB — main component
   ═══════════════════════════════════════════════════════════════ */

const GENERATION_OPTIONS: { id: GenerationPlatform; label: string; icon: string; desc: string }[] = [
  { id: 'meta_feed', label: 'Meta Ads', icon: '📱', desc: '4 ad variations with distinct angles' },
  { id: 'google_search', label: 'Google RSA', icon: '🔍', desc: '15 headlines + 4 descriptions + sitelinks' },
  { id: 'landing_page', label: 'Landing Page', icon: '📄', desc: 'Full page copy — hero, features, FAQ, CTA' },
  { id: 'email_drip', label: 'Email Drip', icon: '📧', desc: '4-email nurture sequence' },
  { id: 'all', label: 'Generate All', icon: '✨', desc: 'All platforms in one shot' },
]

export default function CreativeTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genPlatform, setGenPlatform] = useState<GenerationPlatform | null>(null)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')

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

  async function generateCopy(platform: GenerationPlatform, feedbackText?: string) {
    setGenerating(true)
    setGenPlatform(platform)
    try {
      const body: Record<string, string> = { facilityId: facility.id, platform }
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
      setGenPlatform(null)
    } catch (err) {
      console.error('Generation failed:', err)
      setGenPlatform(null)
    } finally {
      setGenerating(false)
    }
  }

  function handleUpdate(updated: AdVariation) {
    setVariations(prev => prev.map(v => v.id === updated.id ? updated : v))
  }

  // Platform breakdown
  const platforms = [...new Set(variations.map(v => v.platform))]
  const filtered = filterPlatform === 'all' ? variations : variations.filter(v => v.platform === filterPlatform)
  const approved = variations.filter(v => v.status === 'approved' || v.status === 'published').length
  const total = variations.length

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className={`font-semibold ${text}`}>Creative Studio</h3>
          {total > 0 && <p className={`text-sm ${sub}`}>{approved}/{total} approved across {platforms.length} platform{platforms.length !== 1 ? 's' : ''}</p>}
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
              <div className="flex flex-col gap-1">
                {GENERATION_OPTIONS.filter(o => o.id !== 'all').map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => generateCopy(opt.id, regenFeedback || undefined)}
                    disabled={generating}
                    className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
                  >
                    {generating && genPlatform === opt.id ? 'Generating...' : `${opt.icon} ${opt.label}`}
                  </button>
                ))}
              </div>
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
            </>
          )}
        </div>
      </div>

      {/* Generation buttons */}
      {!showRegenInput && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {GENERATION_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => generateCopy(opt.id)}
              disabled={generating}
              className={`flex flex-col items-start p-3 border rounded-xl transition-all ${
                generating && genPlatform === opt.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : darkMode ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{opt.icon}</span>
                <span className={`text-sm font-semibold ${text}`}>{opt.label}</span>
              </div>
              <span className={`text-[11px] ${sub} leading-snug`}>
                {generating && genPlatform === opt.id ? (
                  <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Generating...</span>
                ) : opt.desc}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Platform filter tabs */}
      {platforms.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterPlatform('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filterPlatform === 'all'
                ? 'bg-emerald-600 text-white'
                : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            All ({total})
          </button>
          {platforms.map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filterPlatform === p
                  ? 'bg-emerald-600 text-white'
                  : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {PLATFORM_ICONS[p] || '📝'} {PLATFORM_LABELS[p] || p} ({variations.filter(v => v.platform === p).length})
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !generating && (
        <div className={`text-center py-16 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <Sparkles size={32} className={`mx-auto mb-3 ${sub}`} />
          <p className={`font-medium ${text}`}>No creative content yet</p>
          <p className={`text-sm ${sub} mt-1 max-w-md mx-auto`}>
            Choose a platform above to generate ad copy, landing page content, or email sequences using AI — enriched with your facility's real data.
          </p>
        </div>
      )}

      {/* Variation cards grouped by version */}
      {filtered.length > 0 && (() => {
        const versions = [...new Set(filtered.map(v => v.version))].sort((a, b) => b - a)
        return versions.map(ver => {
          const batch = filtered.filter(v => v.version === ver)
          // Group by platform within a version
          const batchPlatforms = [...new Set(batch.map(v => v.platform))]

          return (
            <div key={ver}>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-3`}>
                Version {ver} · {new Date(batch[0].created_at).toLocaleDateString()}
              </p>
              {batchPlatforms.map(plat => {
                const platBatch = batch.filter(v => v.platform === plat)
                const isMetaFeed = plat === 'meta_feed'
                return (
                  <div key={plat} className="mb-4">
                    {batchPlatforms.length > 1 && (
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${sub} mb-2 flex items-center gap-1.5`}>
                        {PLATFORM_ICONS[plat]} {PLATFORM_LABELS[plat] || plat}
                      </p>
                    )}
                    <div className={isMetaFeed ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
                      {platBatch.map(v => (
                        <VariationCard key={v.id} v={v} darkMode={darkMode} adminKey={adminKey} onUpdate={handleUpdate} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      })()}
    </div>
  )
}
