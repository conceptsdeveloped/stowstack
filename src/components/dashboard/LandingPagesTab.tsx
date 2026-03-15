import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, ArrowLeft, ChevronUp, ChevronDown,
  FileText, ExternalLink, Copy, X as XIcon, Image, Palette, Link2
} from 'lucide-react'
import { Facility } from './types'
import { RenderSection } from '../LandingPageView'

/* ── Local Types ── */

interface LPSection {
  id: string
  section_type: string
  sort_order: number
  config: Record<string, any>
}

interface LandingPageRecord {
  id: string
  facility_id: string
  slug: string
  title: string
  status: string
  variation_ids?: string[]
  meta_title?: string
  meta_description?: string
  theme?: Record<string, any>
  sections?: LPSection[]
  created_at: string
  updated_at: string
  published_at?: string
}

/* ── Constants ── */

const SECTION_TYPE_META: Record<string, { label: string; icon: string; defaultConfig: Record<string, any> }> = {
  hero: { label: 'Hero', icon: '🎯', defaultConfig: { headline: '', subheadline: '', ctaText: 'Reserve Now', ctaUrl: '#cta', badgeText: '', style: 'dark' } },
  trust_bar: { label: 'Trust Bar', icon: '✅', defaultConfig: { items: [{ icon: 'check', text: '' }] } },
  features: { label: 'Features', icon: '⚡', defaultConfig: { headline: '', items: [{ icon: 'check', title: '', desc: '' }] } },
  unit_types: { label: 'Unit Types', icon: '📦', defaultConfig: { headline: 'Available Units', units: [{ name: '', size: '', price: '', features: [] }] } },
  gallery: { label: 'Photo Gallery', icon: '📷', defaultConfig: { headline: 'Our Facility', images: [] } },
  testimonials: { label: 'Testimonials', icon: '⭐', defaultConfig: { headline: 'What Our Customers Say', items: [{ name: '', text: '', role: '', metric: '' }] } },
  faq: { label: 'FAQ', icon: '❓', defaultConfig: { headline: 'Frequently Asked Questions', items: [{ q: '', a: '' }] } },
  cta: { label: 'Call to Action', icon: '📣', defaultConfig: { headline: '', subheadline: '', ctaText: 'Reserve Your Unit', ctaUrl: '#', phone: '', style: 'gradient' } },
  location_map: { label: 'Location & Map', icon: '📍', defaultConfig: { headline: 'Find Us', address: '', directions: '' } },
}

const PAGE_TEMPLATES: Record<string, { label: string; icon: string; desc: string; sectionTypes: string[] }> = {
  standard: { label: 'Standard', icon: '📋', desc: 'Hero + Trust Bar + Features + Gallery + CTA', sectionTypes: ['hero', 'trust_bar', 'features', 'gallery', 'cta'] },
  minimal: { label: 'Minimal', icon: '✨', desc: 'Hero + CTA — quick and simple', sectionTypes: ['hero', 'cta'] },
  full: { label: 'Full', icon: '🏢', desc: 'All 9 sections — the works', sectionTypes: ['hero', 'trust_bar', 'features', 'unit_types', 'gallery', 'testimonials', 'faq', 'cta', 'location_map'] },
  custom: { label: 'Blank', icon: '📄', desc: 'Start from scratch', sectionTypes: [] },
}

/* ── Asset Picker Modal ── */

function AssetPickerModal({ facilityId, adminKey, darkMode, onSelect, onClose }: {
  facilityId: string; adminKey: string; darkMode: boolean
  onSelect: (url: string) => void; onClose: () => void
}) {
  const [assets, setAssets] = useState<{ id: string; url: string; metadata?: any }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/facility-assets?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => setAssets((data.assets || []).filter((a: any) => a.type === 'photo' || a.url?.match(/\.(jpg|jpeg|png|webp|gif)/i))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [facilityId, adminKey])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative w-full max-w-2xl max-h-[70vh] rounded-2xl border overflow-hidden flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Select from Assets</h3>
          <button onClick={onClose} className={darkMode ? 'text-slate-400' : 'text-slate-500'}><XIcon size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading assets...</p>}
          {!loading && assets.length === 0 && (
            <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No images found. Upload some in the Assets tab first.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {assets.map(a => (
              <button
                key={a.id}
                onClick={() => { onSelect(a.url); onClose() }}
                className={`rounded-lg overflow-hidden border-2 hover:border-emerald-500 transition-colors aspect-square ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}
              >
                <img src={a.url} alt={a.metadata?.alt || ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Section Config Editor ── */

function SectionEditor({
  section, darkMode, isFirst, isLast, inputClass, textareaClass, onUpdate, onRemove, onMove, onPickAsset,
}: {
  section: LPSection
  darkMode: boolean
  isFirst: boolean
  isLast: boolean
  inputClass: string
  textareaClass: string
  onUpdate: (config: Record<string, any>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  onPickAsset?: (field: string, arrayKey?: string, arrayIdx?: number) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const meta = SECTION_TYPE_META[section.section_type]
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const config = section.config

  function set(key: string, val: any) {
    onUpdate({ ...config, [key]: val })
  }

  function setItem(arrayKey: string, idx: number, field: string, val: any) {
    const arr = [...(config[arrayKey] || [])]
    arr[idx] = { ...arr[idx], [field]: val }
    onUpdate({ ...config, [arrayKey]: arr })
  }

  function addItem(arrayKey: string, template: Record<string, any>) {
    onUpdate({ ...config, [arrayKey]: [...(config[arrayKey] || []), template] })
  }

  function removeItem(arrayKey: string, idx: number) {
    onUpdate({ ...config, [arrayKey]: (config[arrayKey] || []).filter((_: any, i: number) => i !== idx) })
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
      {/* Section header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta?.icon || '📄'}</span>
          <span className={`text-sm font-medium ${text}`}>{meta?.label || section.section_type}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isFirst && (
            <button onClick={e => { e.stopPropagation(); onMove('up') }} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
              <ChevronUp size={12} className={sub} />
            </button>
          )}
          {!isLast && (
            <button onClick={e => { e.stopPropagation(); onMove('down') }} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
              <ChevronDown size={12} className={sub} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove() }} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
            <Trash2 size={12} className="text-red-400" />
          </button>
          {expanded ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
        </div>
      </div>

      {/* Section config form */}
      {expanded && (
        <div className={`px-4 pb-4 pt-1 space-y-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {/* Hero */}
          {section.section_type === 'hero' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} placeholder="Main headline" />
              </div>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Subheadline</label>
                <textarea className={textareaClass} rows={2} value={config.subheadline || ''} onChange={e => set('subheadline', e.target.value)} placeholder="Supporting text" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>CTA Text</label>
                  <input className={inputClass} value={config.ctaText || ''} onChange={e => set('ctaText', e.target.value)} />
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Badge Text</label>
                  <input className={inputClass} value={config.badgeText || ''} onChange={e => set('badgeText', e.target.value)} placeholder="Optional badge" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Background Image URL</label>
                  <div className="flex gap-1">
                    <input className={`${inputClass} flex-1`} value={config.backgroundImage || ''} onChange={e => set('backgroundImage', e.target.value)} placeholder="https://..." />
                    {onPickAsset && <button onClick={() => onPickAsset('backgroundImage')} className={`shrink-0 px-2 rounded-lg text-xs font-medium ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Browse assets"><Image size={14} /></button>}
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Style</label>
                  <select
                    className={inputClass}
                    value={config.style || 'dark'}
                    onChange={e => set('style', e.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Trust Bar */}
          {section.section_type === 'trust_bar' && (
            <>
              {(config.items || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <select className={`${inputClass} w-20`} value={item.icon || 'check'} onChange={e => setItem('items', i, 'icon', e.target.value)}>
                    <option value="check">✓</option>
                    <option value="star">★</option>
                    <option value="shield">🛡</option>
                    <option value="clock">⏰</option>
                    <option value="truck">🚚</option>
                    <option value="building">🏢</option>
                  </select>
                  <input className={`${inputClass} flex-1`} value={item.text || ''} onChange={e => setItem('items', i, 'text', e.target.value)} placeholder="Trust item text" />
                  <button onClick={() => removeItem('items', i)} className="text-red-400 p-1"><Trash2 size={12} /></button>
                </div>
              ))}
              <button onClick={() => addItem('items', { icon: 'check', text: '' })} className={`text-xs font-medium text-emerald-600 hover:text-emerald-700`}>
                + Add item
              </button>
            </>
          )}

          {/* Features */}
          {section.section_type === 'features' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              {(config.items || []).map((item: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${sub}`}>Feature {i + 1}</span>
                    <button onClick={() => removeItem('items', i)} className="text-red-400"><Trash2 size={12} /></button>
                  </div>
                  <input className={`${inputClass} mb-2`} value={item.title || ''} onChange={e => setItem('items', i, 'title', e.target.value)} placeholder="Title" />
                  <textarea className={textareaClass} rows={2} value={item.desc || ''} onChange={e => setItem('items', i, 'desc', e.target.value)} placeholder="Description" />
                </div>
              ))}
              <button onClick={() => addItem('items', { icon: 'check', title: '', desc: '' })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                + Add feature
              </button>
            </>
          )}

          {/* Unit Types */}
          {section.section_type === 'unit_types' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              {(config.units || []).map((unit: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${sub}`}>Unit {i + 1}</span>
                    <button onClick={() => removeItem('units', i)} className="text-red-400"><Trash2 size={12} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input className={inputClass} value={unit.name || ''} onChange={e => setItem('units', i, 'name', e.target.value)} placeholder="Name" />
                    <input className={inputClass} value={unit.size || ''} onChange={e => setItem('units', i, 'size', e.target.value)} placeholder="Size (e.g. 10x10)" />
                    <input className={inputClass} value={unit.price || ''} onChange={e => setItem('units', i, 'price', e.target.value)} placeholder="$XX" />
                  </div>
                </div>
              ))}
              <button onClick={() => addItem('units', { name: '', size: '', price: '', features: [] })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                + Add unit type
              </button>
            </>
          )}

          {/* Gallery */}
          {section.section_type === 'gallery' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              {(config.images || []).map((img: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputClass} flex-1`} value={img.url || ''} onChange={e => setItem('images', i, 'url', e.target.value)} placeholder="Image URL" />
                  {onPickAsset && <button onClick={() => onPickAsset('url', 'images', i)} className={`shrink-0 px-2 py-1.5 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Browse assets"><Image size={12} /></button>}
                  <input className={`${inputClass} w-28`} value={img.alt || ''} onChange={e => setItem('images', i, 'alt', e.target.value)} placeholder="Alt text" />
                  <button onClick={() => removeItem('images', i)} className="text-red-400 p-1"><Trash2 size={12} /></button>
                </div>
              ))}
              <button onClick={() => addItem('images', { url: '', alt: '' })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                + Add image
              </button>
            </>
          )}

          {/* Testimonials */}
          {section.section_type === 'testimonials' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              {(config.items || []).map((item: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${sub}`}>Review {i + 1}</span>
                    <button onClick={() => removeItem('items', i)} className="text-red-400"><Trash2 size={12} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input className={inputClass} value={item.name || ''} onChange={e => setItem('items', i, 'name', e.target.value)} placeholder="Name" />
                    <input className={inputClass} value={item.metric || ''} onChange={e => setItem('items', i, 'metric', e.target.value)} placeholder="Metric (e.g. 3yr tenant)" />
                  </div>
                  <textarea className={textareaClass} rows={2} value={item.text || ''} onChange={e => setItem('items', i, 'text', e.target.value)} placeholder="Review text" />
                </div>
              ))}
              <button onClick={() => addItem('items', { name: '', text: '', role: '', metric: '' })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                + Add testimonial
              </button>
            </>
          )}

          {/* FAQ */}
          {section.section_type === 'faq' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              {(config.items || []).map((item: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${sub}`}>Q{i + 1}</span>
                    <button onClick={() => removeItem('items', i)} className="text-red-400"><Trash2 size={12} /></button>
                  </div>
                  <input className={`${inputClass} mb-2`} value={item.q || ''} onChange={e => setItem('items', i, 'q', e.target.value)} placeholder="Question" />
                  <textarea className={textareaClass} rows={2} value={item.a || ''} onChange={e => setItem('items', i, 'a', e.target.value)} placeholder="Answer" />
                </div>
              ))}
              <button onClick={() => addItem('items', { q: '', a: '' })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                + Add question
              </button>
            </>
          )}

          {/* CTA */}
          {section.section_type === 'cta' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Subheadline</label>
                <textarea className={textareaClass} rows={2} value={config.subheadline || ''} onChange={e => set('subheadline', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>CTA Text</label>
                  <input className={inputClass} value={config.ctaText || ''} onChange={e => set('ctaText', e.target.value)} />
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>CTA URL</label>
                  <input className={inputClass} value={config.ctaUrl || ''} onChange={e => set('ctaUrl', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Phone</label>
                  <input className={inputClass} value={config.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Style</label>
                  <select className={inputClass} value={config.style || 'gradient'} onChange={e => set('style', e.target.value)}>
                    <option value="gradient">Dark Gradient</option>
                    <option value="simple">Simple</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Location Map */}
          {section.section_type === 'location_map' && (
            <>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Headline</label>
                <input className={inputClass} value={config.headline || ''} onChange={e => set('headline', e.target.value)} />
              </div>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Address</label>
                <input className={inputClass} value={config.address || ''} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, State" />
              </div>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Directions / Notes</label>
                <textarea className={textareaClass} rows={2} value={config.directions || ''} onChange={e => set('directions', e.target.value)} placeholder="Driving directions or access notes" />
              </div>
              <div>
                <label className={`text-xs ${sub} mb-1 block`}>Google Maps Embed URL (optional)</label>
                <input className={inputClass} value={config.googleMapsEmbed || ''} onChange={e => set('googleMapsEmbed', e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Landing Pages Tab ── */

export default function LandingPagesTab({ facility, adminKey, darkMode }: { facility: Facility; adminKey: string; darkMode: boolean }) {
  const [pages, setPages] = useState<LandingPageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<LandingPageRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [assetPicker, setAssetPicker] = useState<{ field: string; sectionId?: string; arrayKey?: string; arrayIdx?: number } | null>(null)
  const [variations, setVariations] = useState<{ id: string; platform: string; angle?: string; content_json?: any }[]>([])

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputClass = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-all ${
    darkMode
      ? 'bg-slate-700 border border-slate-600 text-slate-200 focus:border-emerald-500/50'
      : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
  }`
  const textareaClass = `w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none ${
    darkMode
      ? 'bg-slate-700 border border-slate-600 text-slate-200 focus:border-emerald-500/50'
      : 'bg-white border border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
  }`

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch(`/api/landing-pages?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to fetch pages')
      const data = await res.json()
      setPages(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [facility.id, adminKey])

  useEffect(() => { fetchPages() }, [fetchPages])

  // Fetch ad variations for linking
  useEffect(() => {
    fetch(`/api/ad-variations?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(data => setVariations(data.data || []))
      .catch(() => {})
  }, [facility.id, adminKey])

  function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function buildSectionDefaults(sectionType: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      hero: { headline: facility.name || 'Self Storage', subheadline: facility.location ? `Convenient storage in ${facility.location}` : 'Secure, affordable self storage near you', ctaText: 'Reserve Your Unit', ctaUrl: '#cta', badgeText: facility.google_rating ? `★ ${facility.google_rating} rated on Google` : '', style: 'dark', facilityName: facility.name },
      trust_bar: { items: [{ icon: 'shield', text: '24/7 Security' }, { icon: 'clock', text: 'Easy Access Hours' }, { icon: 'star', text: facility.google_rating ? `${facility.google_rating}★ Google Rating` : 'Top Rated' }] },
      features: { headline: 'Why Choose Us', items: [{ icon: 'shield', title: 'Secure Storage', desc: 'State-of-the-art security systems and 24/7 monitoring.' }, { icon: 'clock', title: 'Easy Access', desc: 'Flexible access hours that work with your schedule.' }, { icon: 'truck', title: 'Drive-Up Units', desc: 'Easy loading and unloading with drive-up access.' }] },
      unit_types: { headline: 'Available Units', units: [{ name: 'Small', size: '5x5', price: '$49', features: ['Climate controlled'] }, { name: 'Medium', size: '10x10', price: '$89', features: ['Drive-up access'] }, { name: 'Large', size: '10x20', price: '$139', features: ['Drive-up access', 'Extra height'] }] },
      gallery: { headline: 'Our Facility', images: [] },
      testimonials: { headline: 'What Our Customers Say', items: [{ name: 'Happy Customer', text: 'Great facility with friendly staff. I highly recommend it!', metric: 'Long-term tenant' }] },
      faq: { headline: 'Frequently Asked Questions', items: [{ q: 'What are your access hours?', a: 'Our facility offers convenient access hours. Contact us for specific times.' }, { q: 'Do you offer climate-controlled units?', a: 'Yes! We have a variety of climate-controlled options available.' }] },
      cta: { headline: 'Reserve Your Unit Today', subheadline: 'Limited availability. Secure your space before it is gone.', ctaText: 'Check Availability', phone: facility.contact_phone || '', email: facility.contact_email || '', style: 'gradient' },
      location_map: { headline: 'Find Us', address: (facility as any).google_address || facility.location || '', directions: '' },
    }
    return defaults[sectionType] || SECTION_TYPE_META[sectionType]?.defaultConfig || {}
  }

  function createFromTemplate(templateKey: string) {
    const template = PAGE_TEMPLATES[templateKey]
    if (!template) return
    const sections: LPSection[] = template.sectionTypes.map((type, i) => ({
      id: crypto.randomUUID(),
      section_type: type,
      sort_order: i,
      config: buildSectionDefaults(type),
    }))

    setEditingPage({
      id: '',
      facility_id: facility.id,
      slug: slugify(facility.name || 'landing-page'),
      title: `${facility.name || 'Landing Page'} — Campaign A`,
      status: 'draft',
      meta_title: `${facility.name || 'Self Storage'} | Reserve Online`,
      meta_description: '',
      theme: {},
      sections,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setShowTemplatePicker(false)
  }

  async function clonePage(pageId: string) {
    try {
      const res = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ cloneFrom: pageId }),
      })
      if (!res.ok) throw new Error('Clone failed')
      const data = await res.json()
      fetchPages()
      setEditingPage(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function savePage() {
    if (!editingPage) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        facilityId: facility.id,
        title: editingPage.title,
        slug: editingPage.slug,
        metaTitle: editingPage.meta_title,
        metaDescription: editingPage.meta_description,
        theme: editingPage.theme,
        status: editingPage.status,
        variationIds: editingPage.variation_ids || [],
        sections: (editingPage.sections || []).map((s, i) => ({
          sectionType: s.section_type,
          sortOrder: i,
          config: s.config,
        })),
      }

      const isNew = !editingPage.id
      const url = isNew ? '/api/landing-pages' : `/api/landing-pages?id=${editingPage.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.fields?.slug || 'Save failed')

      setEditingPage(data.data)
      fetchPages()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function publishPage() {
    if (!editingPage?.id) {
      await savePage()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/landing-pages?id=${editingPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ status: 'published' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      setEditingPage({ ...editingPage, status: 'published', published_at: new Date().toISOString() })
      fetchPages()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(id: string) {
    try {
      await fetch(`/api/landing-pages?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      })
      fetchPages()
      if (editingPage?.id === id) setEditingPage(null)
    } catch { /* silent */ }
  }

  async function openPageForEdit(pageId: string) {
    try {
      const res = await fetch(`/api/landing-pages?id=${pageId}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to load page')
      const data = await res.json()
      setEditingPage(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  function updateSection(sectionId: string, config: Record<string, any>) {
    if (!editingPage) return
    setEditingPage({
      ...editingPage,
      sections: (editingPage.sections || []).map(s =>
        s.id === sectionId ? { ...s, config } : s
      ),
    })
  }

  function removeSection(sectionId: string) {
    if (!editingPage) return
    setEditingPage({
      ...editingPage,
      sections: (editingPage.sections || []).filter(s => s.id !== sectionId),
    })
  }

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    if (!editingPage?.sections) return
    const sections = [...editingPage.sections]
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return
    ;[sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]]
    setEditingPage({ ...editingPage, sections: sections.map((s, i) => ({ ...s, sort_order: i })) })
  }

  function addSection(sectionType: string) {
    if (!editingPage) return
    const meta = SECTION_TYPE_META[sectionType]
    if (!meta) return
    const newSection: LPSection = {
      id: crypto.randomUUID(),
      section_type: sectionType,
      sort_order: (editingPage.sections || []).length,
      config: JSON.parse(JSON.stringify(meta.defaultConfig)),
    }
    setEditingPage({
      ...editingPage,
      sections: [...(editingPage.sections || []), newSection],
    })
    setShowAddSection(false)
  }

  /* ── TEMPLATE PICKER ── */
  if (showTemplatePicker) {
    return (
      <div className={`border rounded-xl ${card}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-lg font-bold ${text}`}>Choose a Template</h3>
              <p className={`text-sm ${sub}`}>Pick a starting layout for your landing page</p>
            </div>
            <button onClick={() => setShowTemplatePicker(false)} className={sub}><XIcon size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(PAGE_TEMPLATES).map(([key, tmpl]) => (
              <button
                key={key}
                onClick={() => createFromTemplate(key)}
                className={`p-5 rounded-xl border text-left transition-all hover:shadow-md ${
                  darkMode ? 'border-slate-700 hover:border-emerald-600' : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl block mb-2">{tmpl.icon}</span>
                <p className={`text-sm font-semibold ${text} mb-1`}>{tmpl.label}</p>
                <p className={`text-xs ${sub}`}>{tmpl.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── PAGE LIST VIEW ── */
  if (!editingPage) {
    return (
      <div className={`border rounded-xl ${card}`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-lg font-bold ${text}`}>Landing Pages</h3>
              <p className={`text-sm ${sub}`}>Ad-specific pages for this facility</p>
            </div>
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} /> Create Page
            </button>
          </div>

          {loading && <p className={`text-sm ${sub}`}>Loading...</p>}

          {!loading && pages.length === 0 && (
            <div className={`text-center py-12 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <FileText size={32} className={`mx-auto mb-3 ${sub}`} />
              <p className={`text-sm font-medium ${text} mb-1`}>No landing pages yet</p>
              <p className={`text-xs ${sub} mb-4`}>Create your first ad-specific landing page for this facility</p>
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus size={14} /> Create Page
              </button>
            </div>
          )}

          {pages.length > 0 && (
            <div className="space-y-2">
              {pages.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
                    darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-100 hover:border-slate-200'
                  }`}
                  onClick={() => openPageForEdit(p.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${text} truncate`}>{p.title}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'archived' ? 'bg-slate-100 text-slate-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                      {p.variation_ids && p.variation_ids.length > 0 && (
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                          {p.variation_ids.length} ad{p.variation_ids.length > 1 ? 's' : ''} linked
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${sub} mt-0.5`}>/lp/{p.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/lp/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      title="Open preview"
                    >
                      <ExternalLink size={14} className={sub} />
                    </a>
                    <button
                      onClick={e => { e.stopPropagation(); clonePage(p.id) }}
                      className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      title="Duplicate page"
                    >
                      <Copy size={14} className={sub} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deletePage(p.id) }}
                      className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                      title="Delete page"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                    <ChevronDown size={14} className={sub} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── PAGE EDITOR VIEW ── */
  const sections = editingPage.sections || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setEditingPage(null)}
          className={`flex items-center gap-2 text-sm ${sub} hover:${text} transition-colors`}
        >
          <ArrowLeft size={14} /> Back to pages
        </button>
        <div className="flex items-center gap-2">
          {editingPage.id && (
            <a
              href={`/lp/${editingPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Preview
            </a>
          )}
          <button
            onClick={savePage}
            disabled={saving}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'} disabled:opacity-40`}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={publishPage}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
          >
            {editingPage.status === 'published' ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Page settings */}
          <div className={`border rounded-xl p-5 ${card}`}>
            <h4 className={`text-sm font-semibold ${text} mb-3`}>Page Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>Page Title</label>
                <input
                  className={inputClass}
                  value={editingPage.title}
                  onChange={e => setEditingPage({ ...editingPage, title: e.target.value, slug: !editingPage.id ? slugify(e.target.value) : editingPage.slug })}
                  placeholder="e.g. Climate Controlled — Paw Paw A"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>URL Slug</label>
                <div className="flex items-center gap-0">
                  <span className={`text-xs ${sub} px-2 py-2 rounded-l-lg border border-r-0 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>/lp/</span>
                  <input
                    className={`${inputClass} rounded-l-none`}
                    value={editingPage.slug}
                    onChange={e => setEditingPage({ ...editingPage, slug: slugify(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>SEO Title</label>
                <input
                  className={inputClass}
                  value={editingPage.meta_title || ''}
                  onChange={e => setEditingPage({ ...editingPage, meta_title: e.target.value })}
                  placeholder="Page title for search engines"
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${sub} mb-1 block`}>SEO Description</label>
                <input
                  className={inputClass}
                  value={editingPage.meta_description || ''}
                  onChange={e => setEditingPage({ ...editingPage, meta_description: e.target.value })}
                  placeholder="Short description for search results"
                />
              </div>
            </div>

            {/* Theme */}
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Palette size={14} className={sub} />
                <span className={`text-xs font-semibold ${text}`}>Theme Colors</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Primary</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(editingPage.theme as any)?.primaryColor || '#10b981'}
                      onChange={e => setEditingPage({ ...editingPage, theme: { ...editingPage.theme, primaryColor: e.target.value } })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <span className={`text-xs ${sub}`}>{(editingPage.theme as any)?.primaryColor || '#10b981'}</span>
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} mb-1 block`}>Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(editingPage.theme as any)?.accentColor || '#0f172a'}
                      onChange={e => setEditingPage({ ...editingPage, theme: { ...editingPage.theme, accentColor: e.target.value } })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <span className={`text-xs ${sub}`}>{(editingPage.theme as any)?.accentColor || '#0f172a'}</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setEditingPage({ ...editingPage, theme: {} })}
                    className={`text-xs ${sub} hover:text-red-400 transition-colors`}
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            </div>

            {/* Linked Ad Variations */}
            {variations.length > 0 && (
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={14} className={sub} />
                  <span className={`text-xs font-semibold ${text}`}>Linked Ad Variations</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {variations.map(v => {
                    const isLinked = (editingPage.variation_ids || []).includes(v.id)
                    const label = v.content_json?.headline || v.content_json?.primary_text?.substring(0, 40) || `${v.platform} — ${v.angle || 'ad'}`
                    return (
                      <label key={v.id} className={`flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={() => {
                            const ids = isLinked
                              ? (editingPage.variation_ids || []).filter(id => id !== v.id)
                              : [...(editingPage.variation_ids || []), v.id]
                            setEditingPage({ ...editingPage, variation_ids: ids })
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={`${text} truncate`}>{label}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                          {v.platform}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className={`border rounded-xl ${card}`}>
            <div className="p-5">
              <h4 className={`text-sm font-semibold ${text} mb-3`}>Sections</h4>
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    darkMode={darkMode}
                    isFirst={idx === 0}
                    isLast={idx === sections.length - 1}
                    inputClass={inputClass}
                    textareaClass={textareaClass}
                    onUpdate={config => updateSection(section.id, config)}
                    onRemove={() => removeSection(section.id)}
                    onMove={dir => moveSection(section.id, dir)}
                    onPickAsset={(field, arrayKey, arrayIdx) => setAssetPicker({ sectionId: section.id, field, arrayKey, arrayIdx })}
                  />
                ))}
              </div>

              {/* Add section */}
              <div className="mt-4">
                {showAddSection ? (
                  <div className={`border rounded-xl p-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-semibold ${text}`}>Add Section</p>
                      <button onClick={() => setShowAddSection(false)} className={sub}><XIcon size={14} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(SECTION_TYPE_META).map(([type, meta]) => (
                        <button
                          key={type}
                          onClick={() => addSection(type)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            darkMode
                              ? 'border-slate-700 hover:border-emerald-600 hover:bg-slate-700'
                              : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="text-lg">{meta.icon}</span>
                          <p className={`text-xs font-medium ${text} mt-1`}>{meta.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddSection(true)}
                    className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${
                      darkMode
                        ? 'border-slate-700 text-slate-400 hover:border-emerald-600 hover:text-emerald-400'
                        : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <Plus size={14} className="inline mr-1" /> Add Section
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Live preview */}
        <div className="lg:col-span-2">
          <div className={`border rounded-xl ${card} sticky top-4`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-xs font-semibold ${text}`}>Preview</p>
              <div className={`flex items-center gap-1 p-0.5 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    previewDevice === 'mobile'
                      ? 'bg-emerald-600 text-white'
                      : darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Mobile
                </button>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    previewDevice === 'desktop'
                      ? 'bg-emerald-600 text-white'
                      : darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Desktop
                </button>
              </div>
            </div>
            <div className="p-3">
              <div
                className={`rounded-lg overflow-hidden overflow-y-auto border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}
                style={{ maxHeight: 600, width: previewDevice === 'mobile' ? 375 : '100%', margin: previewDevice === 'mobile' ? '0 auto' : undefined }}
              >
                <div className="bg-white" style={{ transformOrigin: 'top left' }}>
                  {sections.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-slate-300 text-sm">
                      Add sections to see preview
                    </div>
                  ) : (
                    sections
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map(section => (
                        <RenderSection key={section.id} section={section} theme={editingPage.theme} />
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Picker Modal */}
      {assetPicker && (
        <AssetPickerModal
          facilityId={facility.id}
          adminKey={adminKey}
          darkMode={darkMode}
          onClose={() => setAssetPicker(null)}
          onSelect={(url) => {
            if (!editingPage) return
            const { sectionId, field, arrayKey, arrayIdx } = assetPicker
            if (sectionId && arrayKey !== undefined && arrayIdx !== undefined) {
              setEditingPage({
                ...editingPage,
                sections: (editingPage.sections || []).map(s => {
                  if (s.id !== sectionId) return s
                  const arr = [...(s.config[arrayKey!] || [])]
                  arr[arrayIdx!] = { ...arr[arrayIdx!], [field]: url }
                  return { ...s, config: { ...s.config, [arrayKey!]: arr } }
                }),
              })
            } else if (sectionId) {
              updateSection(sectionId, { ...(editingPage.sections || []).find(s => s.id === sectionId)?.config, [field]: url })
            }
          }}
        />
      )}
    </div>
  )
}
