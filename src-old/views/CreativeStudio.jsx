import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Download, Eye, Paintbrush, Type, Layout, Image as ImageIcon,
  Sparkles, ChevronDown, Check, RotateCcw, Copy, Smartphone, Monitor,
  RectangleHorizontal, X, Upload, Layers, Palette, Grid3X3, Wand2,
  ZoomIn, ZoomOut, SlidersHorizontal, Search, Undo2, Redo2, Shuffle,
  LetterText, ALargeSmall, CaseSensitive, Sun, Contrast, EyeOff, Grid2X2,
  Maximize2, CircleDot, PenLine, Lightbulb, MousePointerClick, Hash,
  ChevronRight, Star, Clock, Filter, Heart, Save, FolderOpen, Trash2,
  FileText, AlignLeft, Package, ChevronLeft, Plus, Minus, SquareStack
} from 'lucide-react'
import {
  TEMPLATES, CATEGORIES, AD_FORMATS, PALETTES, LAYOUTS, DECORATIONS,
  COPY_SUGGESTIONS, AD_COPY_PRESETS, renderTemplate, generateVariations,
  loadBrandKits, saveBrandKit, deleteBrandKit,
  loadFavorites, toggleFavorite, loadRecent, addRecent,
  generateColorHarmony
} from '../lib/studioTemplates'

/* ─────────────────────────────────────────────────────────── */
/*  CREATIVE STUDIO v3 — Full Campaign Builder                  */
/* ─────────────────────────────────────────────────────────── */

const FORMAT_ICONS = { feed: Grid3X3, story: Smartphone, landscape: RectangleHorizontal }

// ── Simple undo/redo hook ──
function useHistory(initialState) {
  const [states, setStates] = useState([initialState])
  const [index, setIndex] = useState(0)
  const current = states[index]

  const set = useCallback((updater) => {
    setStates(prev => {
      const next = typeof updater === 'function' ? updater(prev[index]) : updater
      const newStates = prev.slice(0, index + 1)
      newStates.push(next)
      if (newStates.length > 40) newStates.shift()
      setIndex(newStates.length - 1)
      return newStates
    })
  }, [index])

  const undo = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const redo = useCallback(() => setIndex(i => Math.min(states.length - 1, i + 1)), [states.length])
  const canUndo = index > 0
  const canRedo = index < states.length - 1

  return [current, set, { undo, redo, canUndo, canRedo }]
}

/* ─────────────── TEMPLATE CARD ─────────────── */
function TemplateCard({ template, onClick, isFavorite, onToggleFavorite }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1080; canvas.height = 1080
    renderTemplate(canvas.getContext('2d'), template, {}, 'feed')
  }, [template])

  return (
    <div onClick={onClick} className="group relative bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 transition-all cursor-pointer text-left" role="button" tabIndex={0}>
      <div className="aspect-square overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-3 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{template.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{template.category}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(template.id) }}
          className={`shrink-0 p-1 rounded-md transition-all cursor-pointer ${isFavorite ? 'text-red-400 hover:text-red-300' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
        <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">Customize →</span>
      </div>
    </div>
  )
}

/* ─────────────── TEMPLATE GALLERY (v3 — favorites, recents, batch export) ─────────────── */
function TemplateGallery({ onSelect, onBatchExport }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(loadFavorites)
  const [recent, setRecent] = useState(loadRecent)
  const [showFilter, setShowFilter] = useState('all') // 'all', 'favorites', 'recent'

  const handleToggleFavorite = (id) => {
    setFavorites(toggleFavorite(id))
  }

  const handleSelect = (template) => {
    setRecent(addRecent(template.id))
    onSelect(template)
  }

  const filtered = useMemo(() => {
    let list = TEMPLATES

    // Filter by favorites/recent first
    if (showFilter === 'favorites') {
      list = list.filter(t => favorites.includes(t.id))
    } else if (showFilter === 'recent') {
      const recentIds = recent
      list = recentIds.map(id => TEMPLATES.find(t => t.id === id)).filter(Boolean)
    }

    // Then by category
    if (category !== 'all') {
      list = list.filter(t => t.category === category)
    }

    // Then by search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q)
      )
    }
    return list
  }, [category, search, showFilter, favorites, recent])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-500/30">
            <Sparkles size={14} /> Campaign Creative Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Create Scroll-Stopping Ads</h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Choose a template, customize copy and colors, and download Meta-ready ad creatives in seconds.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search templates... (e.g. 'moving', 'free', 'security')"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Quick filters: All / Favorites / Recent */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[
            { id: 'all', label: 'All', icon: SquareStack },
            { id: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
            { id: 'recent', label: 'Recent', icon: Clock, count: recent.length },
          ].map(f => (
            <button key={f.id} onClick={() => setShowFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                showFilter === f.id ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-transparent'
              }`}>
              <f.icon size={12} /> {f.label} {f.count > 0 && <span className="text-[10px] opacity-60">({f.count})</span>}
            </button>
          ))}

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Batch export button */}
          <button onClick={onBatchExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer text-slate-500 hover:text-white bg-slate-800/40 border border-transparent hover:border-slate-600">
            <Package size={12} /> Batch Export
          </button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                category === cat.id ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">{showFilter === 'favorites' ? 'No favorites yet. Click the heart icon on any template.' : showFilter === 'recent' ? 'No recently used templates.' : 'No templates match your search.'}</p>
            <button onClick={() => { setSearch(''); setCategory('all'); setShowFilter('all') }} className="text-brand-400 text-sm mt-2 hover:underline cursor-pointer">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} onClick={() => handleSelect(t)}
                isFavorite={favorites.includes(t.id)} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        )}

        <div className="text-center mt-10 text-slate-500 text-sm">
          {TEMPLATES.length} templates · {Object.keys(PALETTES).length} color palettes · {Object.keys(LAYOUTS).length} layouts · 3 export formats
        </div>
      </div>
    </div>
  )
}

/* ─────────────── BATCH EXPORT MODAL ─────────────── */
function BatchExportModal({ onClose }) {
  const [facilityName, setFacilityName] = useState('')
  const [facilityLocation, setFacilityLocation] = useState('')
  const [palette, setPalette] = useState('brand')
  const [selectedTemplates, setSelectedTemplates] = useState(TEMPLATES.map(t => t.id))
  const [format, setFormat] = useState('feed')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggleTemplate = (id) => {
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleBatchExport() {
    setExporting(true)
    const templates = TEMPLATES.filter(t => selectedTemplates.includes(t.id))
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i]
      const canvas = document.createElement('canvas')
      const { width, height } = AD_FORMATS[format]
      canvas.width = width; canvas.height = height
      renderTemplate(canvas.getContext('2d'), t, { palette, facilityName, facilityLocation }, format)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (facilityName || t.name).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      a.download = `${safeName}-${t.id}-${format}.png`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setProgress(Math.round(((i + 1) / templates.length) * 100))
      await new Promise(r => setTimeout(r, 200))
    }
    setExporting(false)
    setProgress(0)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Package size={18} className="text-brand-400" /> Batch Campaign Export</h2>
            <p className="text-xs text-slate-400 mt-0.5">Export multiple templates at once with your facility branding</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Branding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Facility Name</label>
              <input type="text" value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="e.g. Midway Self Storage"
                className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Location</label>
              <input type="text" value={facilityLocation} onChange={e => setFacilityLocation(e.target.value)} placeholder="e.g. Paw Paw, MI"
                className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500" />
            </div>
          </div>

          {/* Palette + Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Color Palette</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PALETTES).slice(0, 8).map(([key, p]) => (
                  <button key={key} onClick={() => setPalette(key)} title={p.name}
                    className={`w-7 h-7 rounded-md border-2 transition-all cursor-pointer ${palette === key ? 'border-white scale-110' : 'border-slate-600'}`}
                    style={{ background: typeof p.bg === 'string' ? p.bg : `linear-gradient(135deg, ${p.bg[0]}, ${p.bg[1]})` }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Export Format</label>
              <div className="flex gap-1.5">
                {Object.entries(AD_FORMATS).map(([key, fmt]) => (
                  <button key={key} onClick={() => setFormat(key)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      format === key ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}>{fmt.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Template selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-slate-400">Templates ({selectedTemplates.length} selected)</label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedTemplates(TEMPLATES.map(t => t.id))} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer">Select All</button>
                <button onClick={() => setSelectedTemplates([])} className="text-[10px] text-slate-400 hover:text-slate-300 cursor-pointer">Deselect All</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => toggleTemplate(t.id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] text-left transition-all cursor-pointer ${
                    selectedTemplates.includes(t.id) ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800/40 text-slate-500 border border-transparent hover:bg-slate-700'
                  }`}>
                  {selectedTemplates.includes(t.id) && <Check size={10} className="inline mr-1" />}
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <div className="pt-2">
            {exporting ? (
              <div className="space-y-2">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-slate-400 text-center">Exporting... {progress}%</p>
              </div>
            ) : (
              <button onClick={handleBatchExport} disabled={selectedTemplates.length === 0}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Download size={16} /> Export {selectedTemplates.length} Templates as PNG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── UI PRIMITIVES ─────────────── */
function TextField({ label, value, onChange, placeholder, charCount, maxChars }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-medium text-slate-400">{label}</label>
        {charCount !== undefined && (
          <span className={`text-[10px] ${charCount > (maxChars || 999) ? 'text-red-400' : 'text-slate-500'}`}>
            {charCount}{maxChars ? `/${maxChars}` : ''} chars
          </span>
        )}
      </div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 2, hint, charCount, maxChars }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-medium text-slate-400">{label}</label>
        {charCount !== undefined && (
          <span className={`text-[10px] ${charCount > (maxChars || 999) ? 'text-red-400' : 'text-slate-500'}`}>
            {charCount}{maxChars ? `/${maxChars}` : ''} chars
          </span>
        )}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none" />
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function Slider({ label, value, onChange, min, max, step = 0.1, suffix = '', displayVal }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-medium text-slate-400">{label}</label>
        <span className="text-[10px] text-slate-500">{displayVal ?? value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500" />
    </div>
  )
}

function Toggle({ label, checked, onChange, icon: Icon }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className={`relative w-8 h-4.5 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-600'}`}>
        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-xs text-slate-400 group-hover:text-slate-300 flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {label}
      </span>
    </label>
  )
}

function ColorSwatch({ color, active, onClick, label }) {
  return (
    <button onClick={onClick} title={label}
      className={`relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        active ? 'border-white scale-110 shadow-lg ring-2 ring-brand-500/30' : 'border-slate-600 hover:border-slate-400'
      }`}>
      <div className="absolute inset-0" style={{ background: typeof color === 'string' ? color : `linear-gradient(135deg, ${color[0]}, ${color[1]})` }} />
      {active && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Check size={12} className="text-white" /></div>}
    </button>
  )
}

function CopySuggestionBtn({ text, onClick }) {
  return (
    <button onClick={() => onClick(text)}
      className="text-left w-full px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer truncate border border-slate-700/30 hover:border-slate-600">
      {text.replace(/\n/g, ' ')}
    </button>
  )
}

function SidebarTab({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-medium transition-all cursor-pointer min-w-[48px] ${
        active ? 'bg-brand-600/20 text-brand-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
      }`}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

/* ─────────────── VARIATION CARD ─────────────── */
function VariationCard({ template, overrides, label, onApply }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 540; canvas.height = 540
    renderTemplate(canvas.getContext('2d'), template, overrides, 'feed')
  }, [template, overrides])

  return (
    <div className="space-y-1.5">
      <canvas ref={canvasRef} className="w-full aspect-square rounded-lg border border-slate-700/50 cursor-pointer hover:border-brand-500/50 transition-colors" onClick={onApply} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <button onClick={onApply} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer">Apply</button>
      </div>
    </div>
  )
}

/* ─────────────── FACEBOOK AD PREVIEW (full mockup with ad copy) ─────────────── */
function FacebookAdPreview({ children, adCopy, facilityName, ctaText }) {
  const displayName = facilityName || 'Your Facility Name'
  const primaryText = adCopy?.primaryText || 'Your primary ad text will appear here. Write compelling copy that speaks to your target audience.'
  const adHeadline = adCopy?.headline || 'Your Ad Headline'
  const adDescription = adCopy?.description || 'Your ad description text'
  const truncated = primaryText.length > 125
  const [expanded, setExpanded] = useState(false)
  const shownText = expanded ? primaryText : primaryText.slice(0, 125)

  return (
    <div className="relative mx-auto" style={{ width: 380 }}>
      <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Page header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
            <span className="text-brand-400 text-xs font-bold">{displayName.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold text-white">{displayName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Sponsored · </span>
              <svg width="10" height="10" viewBox="0 0 16 16" className="text-slate-500"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          </div>
          <span className="text-slate-500 text-lg">···</span>
        </div>

        {/* Primary text */}
        <div className="px-3 pb-2">
          <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">
            {shownText}{truncated && !expanded && '... '}
            {truncated && (
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-white text-[12px] font-medium cursor-pointer">
                {expanded ? 'See less' : 'See more'}
              </button>
            )}
          </p>
        </div>

        {/* Ad image */}
        <div className="bg-slate-800">{children}</div>

        {/* Below-image area: headline + description + CTA */}
        <div className="bg-slate-800/50 border-t border-slate-700/50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider truncate">{displayName.toLowerCase().replace(/\s+/g, '') + '.com'}</p>
              <p className="text-[13px] font-semibold text-white truncate">{adHeadline}</p>
              <p className="text-[11px] text-slate-400 truncate">{adDescription}</p>
            </div>
            <button className="shrink-0 px-3 py-1.5 bg-slate-700 text-white text-[11px] font-semibold rounded-md">
              {(ctaText || 'Learn More').replace(' →', '').slice(0, 15)}
            </button>
          </div>
        </div>

        {/* Engagement bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700/50">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><span className="text-[7px]">👍</span></div>
              <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><span className="text-[7px]">❤️</span></div>
            </div>
            <span className="text-[10px] text-slate-500 ml-1">24</span>
          </div>
          <span className="text-[10px] text-slate-500">3 comments · 1 share</span>
        </div>
        <div className="flex items-center justify-around border-t border-slate-700/50 py-1.5">
          <button className="flex items-center gap-1 px-4 py-1 text-[11px] text-slate-400 hover:bg-slate-800 rounded-md cursor-default">👍 Like</button>
          <button className="flex items-center gap-1 px-4 py-1 text-[11px] text-slate-400 hover:bg-slate-800 rounded-md cursor-default">💬 Comment</button>
          <button className="flex items-center gap-1 px-4 py-1 text-[11px] text-slate-400 hover:bg-slate-800 rounded-md cursor-default">↗️ Share</button>
        </div>
      </div>
      <p className="text-center text-[9px] text-slate-600 mt-2">Facebook Feed Preview</p>
    </div>
  )
}

/* ─────────────── INSTAGRAM STORY PREVIEW ─────────────── */
function InstagramStoryPreview({ children, facilityName }) {
  return (
    <div className="relative mx-auto" style={{ width: 280, height: 560 }}>
      <div className="absolute inset-0 rounded-[2rem] border-2 border-slate-700 bg-black shadow-2xl overflow-hidden">
        {/* Story progress bars */}
        <div className="absolute top-2 left-3 right-3 z-10 flex gap-1">
          <div className="flex-1 h-0.5 rounded-full bg-white/60" />
          <div className="flex-1 h-0.5 rounded-full bg-white/20" />
          <div className="flex-1 h-0.5 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        <div className="absolute top-4 left-3 right-3 z-10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">{(facilityName || 'F').charAt(0)}</span>
            </div>
          </div>
          <span className="text-[10px] text-white font-medium">{facilityName || 'your_facility'}</span>
          <span className="text-[9px] text-white/50">Sponsored</span>
        </div>
        {/* Story content */}
        <div className="absolute inset-0">{children}</div>
        {/* Swipe up / CTA at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4 px-4">
          <div className="flex flex-col items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-white animate-bounce"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[10px] text-white font-medium">Learn More</span>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] text-slate-600 mt-2">Instagram Story Preview</p>
    </div>
  )
}

/* ─────────────── MULTI-FORMAT COMPARISON VIEW ─────────────── */
function MultiFormatView({ template, overrides, uploadedImageData }) {
  const canvasRefs = { feed: useRef(null), story: useRef(null), landscape: useRef(null) }

  useEffect(() => {
    Object.entries(AD_FORMATS).forEach(([key, fmt]) => {
      const canvas = canvasRefs[key].current
      if (!canvas) return
      canvas.width = fmt.width; canvas.height = fmt.height
      const scale = key === 'story' ? 180 / fmt.width : 260 / fmt.width
      canvas.style.width = `${fmt.width * scale}px`
      canvas.style.height = `${fmt.height * scale}px`
      const cleanOverrides = { ...overrides, _showSafeZone: false, _showGrid: false }
      renderTemplate(canvas.getContext('2d'), template, cleanOverrides, key, uploadedImageData)
    })
  }, [template, overrides, uploadedImageData])

  return (
    <div className="flex items-end justify-center gap-6 p-4">
      <div className="text-center">
        <canvas ref={canvasRefs.feed} className="rounded-lg shadow-lg border border-slate-700/50" />
        <p className="text-[10px] text-slate-500 mt-2">Feed Post · 1080×1080</p>
      </div>
      <div className="text-center">
        <canvas ref={canvasRefs.story} className="rounded-lg shadow-lg border border-slate-700/50" />
        <p className="text-[10px] text-slate-500 mt-2">Story · 1080×1920</p>
      </div>
      <div className="text-center">
        <canvas ref={canvasRefs.landscape} className="rounded-lg shadow-lg border border-slate-700/50" />
        <p className="text-[10px] text-slate-500 mt-2">Link Ad · 1200×628</p>
      </div>
    </div>
  )
}

/* ─────────────── BRAND KIT PANEL ─────────────── */
function BrandKitPanel({ state, onApplyKit }) {
  const [kits, setKits] = useState(loadBrandKits)
  const [kitName, setKitName] = useState('')
  const [showSave, setShowSave] = useState(false)

  function handleSave() {
    if (!kitName.trim()) return
    const kit = {
      name: kitName.trim(),
      facilityName: state.facilityName,
      facilityLocation: state.facilityLocation,
      palette: state.palette,
      customAccent: state.customAccent,
      ctaStyle: state.ctaStyle,
    }
    setKits(saveBrandKit(kit))
    setKitName('')
    setShowSave(false)
  }

  function handleDelete(id) {
    setKits(deleteBrandKit(id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FolderOpen size={12} className="text-brand-400" />
          <span className="text-[11px] font-medium text-slate-300">Brand Kits</span>
        </div>
        <button onClick={() => setShowSave(!showSave)} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer flex items-center gap-1">
          <Save size={10} /> {showSave ? 'Cancel' : 'Save Current'}
        </button>
      </div>

      {showSave && (
        <div className="flex gap-1.5">
          <input type="text" value={kitName} onChange={e => setKitName(e.target.value)} placeholder="Kit name..."
            className="flex-1 bg-slate-800/80 border border-slate-600/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-brand-500" />
          <button onClick={handleSave} className="px-2.5 py-1.5 bg-brand-600 text-white text-xs rounded-lg cursor-pointer hover:bg-brand-700"><Check size={12} /></button>
        </div>
      )}

      {kits.length === 0 ? (
        <p className="text-[10px] text-slate-500 italic">No saved brand kits yet. Save your branding to reuse across templates.</p>
      ) : (
        <div className="space-y-1">
          {kits.map(kit => (
            <div key={kit.id} className="flex items-center gap-1.5 bg-slate-800/40 rounded-lg p-2 group">
              <div className="w-5 h-5 rounded-md shrink-0" style={{
                background: kit.customAccent || (PALETTES[kit.palette] ? `linear-gradient(135deg, ${PALETTES[kit.palette].bg[0]}, ${PALETTES[kit.palette].bg[1]})` : '#334155')
              }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white font-medium truncate">{kit.name}</p>
                <p className="text-[9px] text-slate-500 truncate">{kit.facilityName || 'No facility'}</p>
              </div>
              <button onClick={() => onApplyKit(kit)} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">Apply</button>
              <button onClick={() => handleDelete(kit.id)} className="text-[10px] text-slate-500 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── AD COPY COMPOSER ─────────────── */
function AdCopyComposer({ template, adCopy, onUpdate }) {
  const presets = AD_COPY_PRESETS[template.category] || AD_COPY_PRESETS.evergreen
  const [showPresets, setShowPresets] = useState(null) // null, 'primary', 'headline', 'description'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 mb-1">
        <FileText size={12} className="text-brand-400" />
        <span className="text-[11px] font-medium text-slate-300">Ad Copy (text outside the image)</span>
      </div>
      <p className="text-[10px] text-slate-500 -mt-2">This text appears in the ad placement — not on the image itself.</p>

      {/* Primary Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-slate-400">Primary Text</label>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${(adCopy.primaryText?.length || 0) > 125 ? 'text-amber-400' : 'text-slate-500'}`}>
              {adCopy.primaryText?.length || 0}/125 chars
            </span>
            <button onClick={() => setShowPresets(showPresets === 'primary' ? null : 'primary')} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer">
              <Lightbulb size={10} className="inline" /> Ideas
            </button>
          </div>
        </div>
        <textarea value={adCopy.primaryText || ''} onChange={e => onUpdate('primaryText', e.target.value)} rows={3} placeholder="The main body text of your ad..."
          className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none" />
        {(adCopy.primaryText?.length || 0) > 125 && <p className="text-[10px] text-amber-400 mt-0.5">Facebook may truncate text over 125 characters with "See More"</p>}
        {showPresets === 'primary' && (
          <div className="mt-1.5 space-y-1">
            {presets.primaryText.map((t, i) => (
              <button key={i} onClick={() => { onUpdate('primaryText', t); setShowPresets(null) }}
                className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer border border-slate-700/30 hover:border-slate-600 line-clamp-2">
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Headline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-slate-400">Headline</label>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${(adCopy.headline?.length || 0) > 40 ? 'text-amber-400' : 'text-slate-500'}`}>
              {adCopy.headline?.length || 0}/40 chars
            </span>
            <button onClick={() => setShowPresets(showPresets === 'headline' ? null : 'headline')} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer">
              <Lightbulb size={10} className="inline" />
            </button>
          </div>
        </div>
        <input type="text" value={adCopy.headline || ''} onChange={e => onUpdate('headline', e.target.value)} placeholder="Short headline below the image..."
          className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
        {showPresets === 'headline' && (
          <div className="mt-1.5 space-y-1">
            {presets.headlines.map((t, i) => (
              <CopySuggestionBtn key={i} text={t} onClick={(v) => { onUpdate('headline', v); setShowPresets(null) }} />
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-slate-400">Description</label>
          <button onClick={() => setShowPresets(showPresets === 'description' ? null : 'description')} className="text-[10px] text-brand-400 hover:text-brand-300 cursor-pointer">
            <Lightbulb size={10} className="inline" />
          </button>
        </div>
        <input type="text" value={adCopy.description || ''} onChange={e => onUpdate('description', e.target.value)} placeholder="Optional description text..."
          className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
        {showPresets === 'description' && (
          <div className="mt-1.5 space-y-1">
            {presets.descriptions.map((t, i) => (
              <CopySuggestionBtn key={i} text={t} onClick={(v) => { onUpdate('description', v); setShowPresets(null) }} />
            ))}
          </div>
        )}
      </div>

      {/* Copy all button */}
      {(adCopy.primaryText || adCopy.headline || adCopy.description) && (
        <CopyAdCopyButton adCopy={adCopy} />
      )}
    </div>
  )
}

function CopyAdCopyButton({ adCopy }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = [
      adCopy.primaryText && `Primary Text:\n${adCopy.primaryText}`,
      adCopy.headline && `Headline: ${adCopy.headline}`,
      adCopy.description && `Description: ${adCopy.description}`,
    ].filter(Boolean).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button onClick={handleCopy}
      className="w-full py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/60 rounded-lg cursor-pointer border border-slate-700/30 hover:border-slate-600 flex items-center justify-center gap-1.5 transition-colors">
      {copied ? <><Check size={12} className="text-brand-400" /> Copied to clipboard</> : <><Copy size={12} /> Copy Ad Copy to Clipboard</>}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  EDITOR — The main editing interface (v3)                   */
/* ═══════════════════════════════════════════════════════════ */
function Editor({ template, onBack }) {
  const initialState = {
    palette: template.palette,
    layout: template.layout,
    decoration: template.decoration,
    badge: template.badge,
    headline: template.headline,
    subheadline: template.subheadline,
    ctaText: template.ctaText,
    facilityName: '',
    facilityLocation: '',
    headlineFontSize: 1.0,
    subFontSize: 1.0,
    uppercase: false,
    textShadow: false,
    customAccent: '',
    overlayOpacity: 0.6,
    imgBrightness: 1.0,
    letterSpacing: 0,
    ctaStyle: 'filled',
  }

  const [state, setState, history] = useHistory(initialState)
  const [format, setFormat] = useState('feed')
  const [activeTab, setActiveTab] = useState('copy')
  const [showSafeZone, setShowSafeZone] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [showMockup, setShowMockup] = useState(false) // legacy, now using previewMode
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedImageData, setUploadedImageData] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showVariations, setShowVariations] = useState(false)
  const [variations, setVariations] = useState([])
  const [zoom, setZoom] = useState(1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [adCopy, setAdCopy] = useState({ primaryText: '', headline: '', description: '' })
  const [previewMode, setPreviewMode] = useState('canvas') // 'canvas', 'mockup', 'compare'

  const previewCanvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const update = (key, value) => setState(prev => ({ ...prev, [key]: value }))
  const updateAdCopy = (key, value) => setAdCopy(prev => ({ ...prev, [key]: value }))

  const overrides = {
    ...state,
    layout: state.layout,
    _showSafeZone: showSafeZone,
    _showGrid: showGrid,
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); history.redo() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); history.redo() }
      if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); setZoom(z => Math.min(2, z + 0.1)) }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.3, z - 0.1)) }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); setZoom(1) }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [history])

  // Render preview
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const { width, height } = AD_FORMATS[format]
    const baseMaxW = previewMode === 'mockup' ? (format === 'story' ? 260 : 350) : sidebarCollapsed ? 620 : 520
    const scale = (baseMaxW / width) * zoom
    canvas.width = width; canvas.height = height
    canvas.style.width = `${width * scale}px`
    canvas.style.height = `${height * scale}px`
    renderTemplate(canvas.getContext('2d'), template, overrides, format, uploadedImageData)
  }, [template, overrides, format, uploadedImageData, previewMode, zoom, sidebarCollapsed])

  useEffect(() => { renderPreview() }, [renderPreview])

  // Image upload
  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setUploadedImage(url)
    const img = new Image()
    img.onload = () => setUploadedImageData(img)
    img.src = url
    if (state.layout !== 'photo-overlay') update('layout', 'photo-overlay')
  }

  function removeImage() {
    setUploadedImage(null)
    setUploadedImageData(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (state.layout === 'photo-overlay') update('layout', template.layout)
  }

  // Export
  async function handleExport(fmt) {
    setExporting(true)
    try {
      const canvas = document.createElement('canvas')
      const { width, height } = AD_FORMATS[fmt]
      canvas.width = width; canvas.height = height
      const exportOverrides = { ...overrides, _showSafeZone: false, _showGrid: false }
      renderTemplate(canvas.getContext('2d'), template, exportOverrides, fmt, uploadedImageData)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (state.facilityName || template.name).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      a.download = `${safeName}-${fmt}-${AD_FORMATS[fmt].aspect.replace(':', 'x')}.png`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  async function handleExportAll() {
    for (const fmt of Object.keys(AD_FORMATS)) {
      await handleExport(fmt)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  function handleExportAdCopy() {
    const safeName = (state.facilityName || template.name).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const lines = [
      `Campaign: ${template.name}`,
      `Facility: ${state.facilityName || '(not set)'}`,
      `Location: ${state.facilityLocation || '(not set)'}`,
      '',
      '═══ ON-IMAGE COPY ═══',
      `Badge: ${state.badge}`,
      `Headline: ${state.headline.replace(/\n/g, ' ')}`,
      `Subheadline: ${state.subheadline.replace(/\n/g, ' ')}`,
      `CTA Button: ${state.ctaText}`,
      '',
      '═══ AD COPY (Facebook/Instagram) ═══',
      `Primary Text: ${adCopy.primaryText || '(not set)'}`,
      `Headline: ${adCopy.headline || '(not set)'}`,
      `Description: ${adCopy.description || '(not set)'}`,
      '',
      '═══ SETTINGS ═══',
      `Palette: ${PALETTES[state.palette].name}`,
      `Layout: ${LAYOUTS[state.layout].name}`,
      `CTA Style: ${state.ctaStyle}`,
      `Custom Accent: ${state.customAccent || 'none'}`,
      '',
      `Generated by StowStack Creative Studio`,
      `Date: ${new Date().toLocaleDateString()}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName}-ad-copy.txt`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleCopy() {
    try {
      const canvas = document.createElement('canvas')
      const { width, height } = AD_FORMATS[format]
      canvas.width = width; canvas.height = height
      const exportOverrides = { ...overrides, _showSafeZone: false, _showGrid: false }
      renderTemplate(canvas.getContext('2d'), template, exportOverrides, format, uploadedImageData)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function handleReset() { setState(initialState); removeImage() }

  function handleGenerateVariations() {
    setVariations(generateVariations(template))
    setShowVariations(true)
  }

  function applyVariation(v) {
    setState(prev => ({ ...prev, ...v }))
    setShowVariations(false)
  }

  function applyBrandKit(kit) {
    setState(prev => ({
      ...prev,
      facilityName: kit.facilityName || prev.facilityName,
      facilityLocation: kit.facilityLocation || prev.facilityLocation,
      palette: kit.palette || prev.palette,
      customAccent: kit.customAccent || '',
      ctaStyle: kit.ctaStyle || prev.ctaStyle,
    }))
  }

  const suggestions = COPY_SUGGESTIONS[template.category] || COPY_SUGGESTIONS.evergreen
  const headlineChars = state.headline.replace(/\n/g, '').length
  const subChars = state.subheadline.replace(/\n/g, '').length

  const tabs = [
    { id: 'copy', icon: Type, label: 'Copy' },
    { id: 'style', icon: Palette, label: 'Style' },
    { id: 'layout', icon: Layout, label: 'Layout' },
    { id: 'photo', icon: ImageIcon, label: 'Photo' },
    { id: 'adcopy', icon: FileText, label: 'Ad Text' },
    { id: 'advanced', icon: SlidersHorizontal, label: 'Tune' },
  ]

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* ── TOP BAR ── */}
      <div className="shrink-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 z-30">
        <div className="flex items-center justify-between px-4 py-2.5 gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <div className="hidden sm:block h-5 w-px bg-slate-700" />
            <span className="text-sm font-semibold text-white hidden sm:inline">{template.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={history.undo} disabled={!history.canUndo} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer" title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
            <button onClick={history.redo} disabled={!history.canRedo} className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer" title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
            <div className="h-5 w-px bg-slate-700 mx-1" />

            <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800 rounded-md transition-colors cursor-pointer">
              <RotateCcw size={12} /> <span className="hidden md:inline">Reset</span>
            </button>
            <button onClick={handleGenerateVariations} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white bg-slate-800 rounded-md transition-colors cursor-pointer" title="Generate A/B variations">
              <Shuffle size={12} /> <span className="hidden md:inline">A/B Test</span>
            </button>
            <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-white bg-slate-700 hover:bg-slate-600 rounded-md transition-colors cursor-pointer">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> <span className="hidden md:inline">Copy</span></>}
            </button>

            {/* Export dropdown */}
            <div className="relative group">
              <button onClick={() => handleExport(format)} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors cursor-pointer disabled:opacity-50">
                <Download size={12} /> {exporting ? 'Saving...' : 'Export'}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 min-w-[180px]">
                {Object.entries(AD_FORMATS).map(([key, fmt]) => (
                  <button key={key} onClick={() => handleExport(key)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer first:rounded-t-lg">
                    {fmt.label} <span className="text-slate-500">({fmt.width}×{fmt.height})</span>
                  </button>
                ))}
                <div className="border-t border-slate-700">
                  <button onClick={handleExportAll}
                    className="w-full text-left px-3 py-2 text-xs text-brand-400 hover:text-brand-300 hover:bg-slate-700 transition-colors cursor-pointer font-medium">
                    Download All 3 Formats
                  </button>
                </div>
                <div className="border-t border-slate-700">
                  <button onClick={handleExportAdCopy}
                    className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer rounded-b-lg">
                    <FileText size={10} className="inline mr-1" /> Export Ad Copy (.txt)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT SIDEBAR ── */}
        <div className={`shrink-0 border-r border-slate-700/50 flex flex-col bg-slate-900/40 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-80'}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-3 gap-2">
              <button onClick={() => setSidebarCollapsed(false)} className="p-2 text-slate-400 hover:text-white cursor-pointer" title="Expand sidebar"><ChevronRight size={16} /></button>
              <div className="w-px h-4 bg-slate-700" />
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setSidebarCollapsed(false) }}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${activeTab === t.id ? 'text-brand-400 bg-brand-600/10' : 'text-slate-500 hover:text-slate-300'}`}
                  title={t.label}>
                  <t.icon size={16} />
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="shrink-0 flex items-center gap-0.5 px-2 py-2 border-b border-slate-700/50 bg-slate-900/60">
                {tabs.map(t => (
                  <SidebarTab key={t.id} icon={t.icon} label={t.label} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} />
                ))}
                <div className="flex-1" />
                <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 text-slate-500 hover:text-slate-300 cursor-pointer" title="Collapse sidebar"><ChevronLeft size={14} /></button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {/* ─── COPY TAB ─── */}
                {activeTab === 'copy' && (
                  <>
                    <TextField label="Badge" value={state.badge} onChange={v => update('badge', v)} placeholder="e.g. 🔥 Limited Time" charCount={state.badge.length} />
                    <TextArea label="Headline" value={state.headline} onChange={v => update('headline', v)} rows={3}
                      hint="Line breaks control wrapping · Keep under 40 chars" charCount={headlineChars} maxChars={40} />
                    <TextArea label="Subheadline" value={state.subheadline} onChange={v => update('subheadline', v)} rows={3}
                      hint="Supporting text · Keep under 90 chars" charCount={subChars} maxChars={90} />
                    <TextField label="CTA Button" value={state.ctaText} onChange={v => update('ctaText', v)} placeholder="e.g. Reserve Now →" charCount={state.ctaText.length} />

                    <div className="border-t border-slate-700/50 pt-3">
                      <TextField label="Facility Name" value={state.facilityName} onChange={v => update('facilityName', v)} placeholder="e.g. Midway Self Storage" />
                    </div>
                    <TextField label="Location" value={state.facilityLocation} onChange={v => update('facilityLocation', v)} placeholder="e.g. Paw Paw, MI" />

                    {/* Brand Kit */}
                    <div className="border-t border-slate-700/50 pt-3">
                      <BrandKitPanel state={state} onApplyKit={applyBrandKit} />
                    </div>

                    {/* Copy suggestions */}
                    <div className="border-t border-slate-700/50 pt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb size={12} className="text-amber-400" />
                        <span className="text-[11px] font-medium text-slate-300">Headline Ideas</span>
                      </div>
                      <div className="space-y-1">
                        {suggestions.headlines.slice(0, 5).map((h, i) => (
                          <CopySuggestionBtn key={i} text={h} onClick={v => update('headline', v)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb size={12} className="text-amber-400" />
                        <span className="text-[11px] font-medium text-slate-300">CTA Ideas</span>
                      </div>
                      <div className="space-y-1">
                        {suggestions.ctas.map((c, i) => (
                          <CopySuggestionBtn key={i} text={c} onClick={v => update('ctaText', v)} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ─── STYLE TAB ─── */}
                {activeTab === 'style' && (
                  <>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-2 block">Color Palette</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {Object.entries(PALETTES).map(([key, p]) => (
                          <ColorSwatch key={key} color={p.bg} active={state.palette === key && !state.customAccent} onClick={() => { update('palette', key); update('customAccent', '') }} label={p.name} />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">Active: {PALETTES[state.palette].name}</p>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Custom Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={state.customAccent || PALETTES[state.palette].accent}
                          onChange={e => update('customAccent', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent" />
                        <input type="text" value={state.customAccent || ''} onChange={e => update('customAccent', e.target.value)}
                          placeholder={PALETTES[state.palette].accent}
                          className="flex-1 bg-slate-800/80 border border-slate-600/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-brand-500 font-mono" />
                        {state.customAccent && (
                          <button onClick={() => update('customAccent', '')} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
                        )}
                      </div>
                    </div>

                    {/* Color harmony suggestions */}
                    {(() => {
                      const activeColor = state.customAccent || PALETTES[state.palette].accent
                      const harmony = generateColorHarmony(activeColor)
                      if (!harmony) return null
                      const harmonySuggestions = [
                        harmony.complementary,
                        ...harmony.analogous,
                        ...harmony.triadic,
                        harmony.lighter,
                        harmony.darker,
                      ]
                      return (
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Color Harmony</label>
                          <div className="flex flex-wrap gap-1.5">
                            {harmonySuggestions.map((c, i) => (
                              <button key={i} onClick={() => update('customAccent', c)} title={c}
                                className="w-7 h-7 rounded-md border border-slate-600 hover:border-white hover:scale-110 transition-all cursor-pointer"
                                style={{ background: c }} />
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-600 mt-1">Complementary · Analogous · Triadic · Tints</p>
                        </div>
                      )
                    })()}

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">CTA Button Style</label>
                      <div className="flex gap-1.5">
                        {['filled', 'outline', 'pill'].map(style => (
                          <button key={style} onClick={() => update('ctaStyle', style)}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-medium capitalize transition-all cursor-pointer ${
                              state.ctaStyle === style ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-700'
                            }`}>{style}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Decoration Pattern</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(DECORATIONS).map(([key, d]) => (
                          <button key={key} onClick={() => update('decoration', key)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              state.decoration === key ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-700'
                            }`}>{d.name}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ─── LAYOUT TAB ─── */}
                {activeTab === 'layout' && (
                  <>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Layout Style</label>
                      <div className="space-y-1">
                        {Object.entries(LAYOUTS).map(([key, l]) => (
                          <button key={key} onClick={() => update('layout', key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between ${
                              state.layout === key ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-700 hover:text-white'
                            }`}>
                            <span className="font-medium">{l.name}</span>
                            <span className="text-[10px] text-slate-500">{l.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ─── PHOTO TAB ─── */}
                {activeTab === 'photo' && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="photo-upload" />
                    {uploadedImage ? (
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={uploadedImage} alt="Uploaded" className="w-full h-40 object-cover" />
                          <button onClick={removeImage} className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-600 cursor-pointer"><X size={14} /></button>
                        </div>
                        <Slider label="Overlay Darkness" value={state.overlayOpacity} onChange={v => update('overlayOpacity', v)} min={0} max={1} step={0.05} displayVal={Math.round(state.overlayOpacity * 100)} suffix="%" />
                        <Slider label="Brightness" value={state.imgBrightness} onChange={v => update('imgBrightness', v)} min={0.2} max={2} step={0.05} displayVal={Math.round(state.imgBrightness * 100)} suffix="%" />
                        <p className="text-[10px] text-slate-500">Tip: Use "Photo Overlay" layout for best results with photos.</p>
                      </div>
                    ) : (
                      <label htmlFor="photo-upload" className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-600/50 rounded-xl cursor-pointer hover:border-brand-500/50 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center"><Upload size={24} className="text-slate-400" /></div>
                        <div className="text-center">
                          <span className="text-sm text-slate-300 font-medium block">Upload Facility Photo</span>
                          <span className="text-[11px] text-slate-500 mt-1 block">JPG or PNG · Used as ad background</span>
                        </div>
                      </label>
                    )}
                  </>
                )}

                {/* ─── AD COPY TAB ─── */}
                {activeTab === 'adcopy' && (
                  <AdCopyComposer template={template} adCopy={adCopy} onUpdate={updateAdCopy} />
                )}

                {/* ─── ADVANCED TAB ─── */}
                {activeTab === 'advanced' && (
                  <>
                    <Slider label="Headline Size" value={state.headlineFontSize} onChange={v => update('headlineFontSize', v)} min={0.5} max={2.0} step={0.05} displayVal={Math.round(state.headlineFontSize * 100)} suffix="%" />
                    <Slider label="Subheadline Size" value={state.subFontSize} onChange={v => update('subFontSize', v)} min={0.5} max={2.0} step={0.05} displayVal={Math.round(state.subFontSize * 100)} suffix="%" />
                    <Slider label="Letter Spacing" value={state.letterSpacing} onChange={v => update('letterSpacing', v)} min={0} max={10} step={0.5} suffix="px" />

                    <div className="space-y-2.5 border-t border-slate-700/50 pt-3">
                      <Toggle label="Uppercase Headline" checked={state.uppercase} onChange={v => update('uppercase', v)} icon={CaseSensitive} />
                      <Toggle label="Text Drop Shadow" checked={state.textShadow} onChange={v => update('textShadow', v)} icon={PenLine} />
                      <Toggle label="Safe Zone Guide" checked={showSafeZone} onChange={setShowSafeZone} icon={Maximize2} />
                      <Toggle label="Rule of Thirds Grid" checked={showGrid} onChange={setShowGrid} icon={Grid2X2} />
                      <Toggle label="Mockup Preview" checked={previewMode === 'mockup'} onChange={v => setPreviewMode(v ? 'mockup' : 'canvas')} icon={Smartphone} />
                    </div>

                    <div className="border-t border-slate-700/50 pt-3">
                      <p className="text-[11px] font-medium text-slate-400 mb-2">Keyboard Shortcuts</p>
                      <div className="space-y-1 text-[10px] text-slate-500">
                        <div className="flex justify-between"><span>Undo</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl+Z</kbd></div>
                        <div className="flex justify-between"><span>Redo</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl+Shift+Z</kbd></div>
                        <div className="flex justify-between"><span>Zoom In</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl++</kbd></div>
                        <div className="flex justify-between"><span>Zoom Out</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl+-</kbd></div>
                        <div className="flex justify-between"><span>Reset Zoom</span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Ctrl+0</kbd></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: Canvas ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Format bar + zoom controls */}
          <div className="shrink-0 flex items-center justify-between py-2.5 px-4 border-b border-slate-700/30 bg-slate-900/30">
            <div className="flex items-center gap-2">
              {Object.entries(AD_FORMATS).map(([key, fmt]) => {
                const Icon = FORMAT_ICONS[key]
                return (
                  <button key={key} onClick={() => setFormat(key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      format === key ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}>
                    <Icon size={13} /> {fmt.label}
                  </button>
                )
              })}
            </div>

            {/* Preview mode + Zoom controls */}
            <div className="flex items-center gap-1">
              <div className="flex items-center bg-slate-800/60 rounded-lg overflow-hidden mr-2">
                {[
                  { id: 'canvas', label: 'Canvas', icon: Maximize2 },
                  { id: 'mockup', label: 'Mockup', icon: Smartphone },
                  { id: 'compare', label: 'Compare', icon: Layers },
                ].map(m => (
                  <button key={m.id} onClick={() => setPreviewMode(m.id)}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all cursor-pointer ${
                      previewMode === m.id ? 'bg-brand-600/20 text-brand-400' : 'text-slate-500 hover:text-slate-300'
                    }`}>
                    <m.icon size={11} /> {m.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 text-slate-400 hover:text-white cursor-pointer" title="Zoom out"><ZoomOut size={14} /></button>
              <button onClick={() => setZoom(1)} className="px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800/60 rounded cursor-pointer min-w-[44px] text-center font-mono">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 text-slate-400 hover:text-white cursor-pointer" title="Zoom in"><ZoomIn size={14} /></button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-6">
            {previewMode === 'compare' ? (
              <MultiFormatView template={template} overrides={overrides} uploadedImageData={uploadedImageData} />
            ) : previewMode === 'mockup' ? (
              format === 'story' ? (
                <InstagramStoryPreview facilityName={state.facilityName}>
                  <canvas ref={previewCanvasRef} className="w-full h-full object-cover" style={{ imageRendering: 'auto' }} />
                </InstagramStoryPreview>
              ) : (
                <FacebookAdPreview adCopy={adCopy} facilityName={state.facilityName} ctaText={state.ctaText}>
                  <canvas ref={previewCanvasRef} className="w-full" style={{ imageRendering: 'auto' }} />
                </FacebookAdPreview>
              )
            ) : (
              <canvas ref={previewCanvasRef} className="rounded-lg shadow-2xl" style={{ imageRendering: 'auto' }} />
            )}
          </div>

          {/* Info bar */}
          <div className="shrink-0 flex items-center justify-center gap-4 py-2 text-[11px] text-slate-500 border-t border-slate-700/30 bg-slate-900/30">
            <span>{AD_FORMATS[format].width}×{AD_FORMATS[format].height}px</span>
            <span>·</span>
            <span>{AD_FORMATS[format].desc}</span>
            <span>·</span>
            <span>PNG</span>
            {headlineChars > 40 && <><span>·</span><span className="text-amber-400">⚠ Headline may be long for mobile</span></>}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Variations ── */}
        {showVariations && variations.length > 0 && (
          <div className="w-64 shrink-0 border-l border-slate-700/50 bg-slate-900/40 overflow-y-auto p-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-1.5"><Shuffle size={13} className="text-brand-400" /> A/B Variations</h3>
              <button onClick={() => setShowVariations(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <p className="text-[10px] text-slate-500">Click a variation to apply it. Your current work is preserved in undo history.</p>
            {variations.map((v, i) => (
              <VariationCard key={i} template={template} overrides={{ ...state, ...v }} label={`Variation ${String.fromCharCode(65 + i)}`}
                onApply={() => applyVariation(v)} />
            ))}
            <button onClick={handleGenerateVariations} className="w-full py-2 text-xs text-brand-400 hover:text-brand-300 bg-slate-800/60 rounded-lg cursor-pointer border border-slate-700/30 hover:border-slate-600">
              <Shuffle size={12} className="inline mr-1" /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN VIEW                                                 */
/* ═══════════════════════════════════════════════════════════ */
export default function CreativeStudio({ onBack }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showBatchExport, setShowBatchExport] = useState(false)

  if (selectedTemplate) {
    return <Editor template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />
  }

  return (
    <div>
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to Site
          </button>
          <div className="flex items-center gap-2">
            <Paintbrush size={16} className="text-brand-400" />
            <span className="text-sm font-semibold text-white">Creative Studio</span>
          </div>
          <div className="w-24" />
        </div>
      </div>
      <TemplateGallery onSelect={setSelectedTemplate} onBatchExport={() => setShowBatchExport(true)} />
      {showBatchExport && <BatchExportModal onClose={() => setShowBatchExport(false)} />}
    </div>
  )
}
