import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useBetaPad } from './BetaPadContext'
import type {
  Tag, Priority, Severity, ImpactTag, EffortGuess, ReproStep,
  BetaPadEntry, QuickNote, BugReport, FeatureRequest, SessionLogFilters,
  EntryStatus,
} from './types'
import { uuid, getCssSelector, captureScreenshot } from './utils'
import {
  exportMarkdown, exportClaudePrompt,
  exportGitHubIssues, exportCSV,
} from './exports'
import { downloadText, downloadJson } from './utils'

// ═══════════════════════════════════════════════════════
//  STYLES (scoped via data-betapad attribute)
// ═══════════════════════════════════════════════════════

const STYLES = `
[data-betapad] {
  --bp-bg: rgba(15, 15, 20, 0.92);
  --bp-bg-solid: #111116;
  --bp-surface: rgba(30, 30, 40, 0.85);
  --bp-surface-hover: rgba(40, 40, 55, 0.9);
  --bp-border: rgba(80, 80, 100, 0.3);
  --bp-text: #e4e4e7;
  --bp-text-dim: #9ca3af;
  --bp-accent: #6366f1;
  --bp-accent-dim: #4f46e5;
  --bp-green: #22c55e;
  --bp-red: #ef4444;
  --bp-orange: #f59e0b;
  --bp-blue: #3b82f6;
  --bp-radius: 8px;
  --bp-font: 'DM Sans', -apple-system, system-ui, sans-serif;
  font-family: var(--bp-font);
  font-size: 13px;
  color: var(--bp-text);
  line-height: 1.5;
  box-sizing: border-box;
}
[data-betapad] *, [data-betapad] *::before, [data-betapad] *::after {
  box-sizing: border-box;
}
[data-betapad] .bp-panel {
  position: fixed;
  z-index: 99999;
  backdrop-filter: blur(16px);
  background: var(--bp-bg);
  border: 1px solid var(--bp-border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 360px;
  min-height: 300px;
}
[data-betapad] .bp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(20, 20, 30, 0.8);
  border-bottom: 1px solid var(--bp-border);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}
[data-betapad] .bp-header:active { cursor: grabbing; }
[data-betapad] .bp-logo {
  font-weight: 700;
  font-size: 14px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
[data-betapad] .bp-header-actions { margin-left: auto; display: flex; gap: 4px; }
[data-betapad] .bp-btn-icon {
  background: transparent;
  border: none;
  color: var(--bp-text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
[data-betapad] .bp-btn-icon:hover { background: var(--bp-surface); color: var(--bp-text); }
[data-betapad] .bp-tabs {
  display: flex;
  border-bottom: 1px solid var(--bp-border);
  background: rgba(20, 20, 30, 0.5);
  flex-shrink: 0;
}
[data-betapad] .bp-tab {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--bp-text-dim);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
[data-betapad] .bp-tab:hover { color: var(--bp-text); background: var(--bp-surface); }
[data-betapad] .bp-tab.active {
  color: var(--bp-accent);
  border-bottom-color: var(--bp-accent);
}
[data-betapad] .bp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(80,80,100,0.3) transparent;
}
[data-betapad] .bp-body::-webkit-scrollbar { width: 5px; }
[data-betapad] .bp-body::-webkit-scrollbar-track { background: transparent; }
[data-betapad] .bp-body::-webkit-scrollbar-thumb { background: rgba(80,80,100,0.4); border-radius: 3px; }
[data-betapad] .bp-input, [data-betapad] .bp-textarea, [data-betapad] .bp-select {
  width: 100%;
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  border-radius: var(--bp-radius);
  color: var(--bp-text);
  padding: 8px 10px;
  font-size: 13px;
  font-family: var(--bp-font);
  outline: none;
  transition: border-color 0.15s;
}
[data-betapad] .bp-input:focus, [data-betapad] .bp-textarea:focus, [data-betapad] .bp-select:focus {
  border-color: var(--bp-accent);
}
[data-betapad] .bp-textarea { resize: vertical; min-height: 80px; }
[data-betapad] .bp-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--bp-text-dim);
  margin-bottom: 4px;
}
[data-betapad] .bp-field { margin-bottom: 10px; }
[data-betapad] .bp-chips { display: flex; flex-wrap: wrap; gap: 4px; }
[data-betapad] .bp-chip {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 12px;
  border: 1px solid var(--bp-border);
  background: var(--bp-surface);
  color: var(--bp-text-dim);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
[data-betapad] .bp-chip:hover { border-color: var(--bp-accent); }
[data-betapad] .bp-chip.selected {
  background: var(--bp-accent);
  border-color: var(--bp-accent);
  color: white;
}
[data-betapad] .bp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--bp-radius);
  border: 1px solid var(--bp-border);
  background: var(--bp-surface);
  color: var(--bp-text);
  cursor: pointer;
  transition: all 0.15s;
}
[data-betapad] .bp-btn:hover { background: var(--bp-surface-hover); }
[data-betapad] .bp-btn.primary {
  background: var(--bp-accent);
  border-color: var(--bp-accent);
  color: white;
}
[data-betapad] .bp-btn.primary:hover { background: var(--bp-accent-dim); }
[data-betapad] .bp-btn.danger { color: var(--bp-red); }
[data-betapad] .bp-btn.danger:hover { background: rgba(239,68,68,0.15); }
[data-betapad] .bp-btn.small { padding: 4px 8px; font-size: 11px; }
[data-betapad] .bp-entry-card {
  background: var(--bp-surface);
  border: 1px solid var(--bp-border);
  border-radius: var(--bp-radius);
  padding: 10px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
[data-betapad] .bp-entry-card:hover { border-color: rgba(99,102,241,0.4); }
[data-betapad] .bp-entry-type {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
}
[data-betapad] .bp-type-note { background: rgba(34,197,94,0.2); color: #4ade80; }
[data-betapad] .bp-type-bug { background: rgba(239,68,68,0.2); color: #f87171; }
[data-betapad] .bp-type-feature { background: rgba(99,102,241,0.2); color: #818cf8; }
[data-betapad] .bp-badge {
  display: inline-block;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(80,80,100,0.3);
  color: var(--bp-text-dim);
  margin-right: 4px;
}
[data-betapad] .bp-status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
[data-betapad] .bp-status-new { background: rgba(59,130,246,0.2); color: #60a5fa; }
[data-betapad] .bp-status-reviewing { background: rgba(245,158,11,0.2); color: #fbbf24; }
[data-betapad] .bp-status-in-progress { background: rgba(168,85,247,0.2); color: #c084fc; }
[data-betapad] .bp-status-resolved { background: rgba(34,197,94,0.2); color: #4ade80; }
[data-betapad] .bp-status-wont-fix { background: rgba(100,100,120,0.2); color: #9ca3af; }
[data-betapad] .bp-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99998;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(99,102,241,0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}
[data-betapad] .bp-fab:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(99,102,241,0.6); }
[data-betapad] .bp-pin-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  cursor: crosshair;
  background: rgba(99,102,241,0.05);
}
[data-betapad] .bp-pin-highlight {
  position: fixed;
  z-index: 100001;
  border: 2px solid var(--bp-accent);
  border-radius: 4px;
  pointer-events: none;
  transition: all 0.1s;
  background: rgba(99,102,241,0.08);
}
[data-betapad] .bp-pin-label {
  position: fixed;
  z-index: 100002;
  background: var(--bp-accent);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
}
[data-betapad] .bp-row { display: flex; gap: 8px; align-items: center; }
[data-betapad] .bp-row > * { flex: 1; }
[data-betapad] .bp-toast {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 100003;
  background: var(--bp-green);
  color: white;
  padding: 8px 16px;
  border-radius: var(--bp-radius);
  font-size: 12px;
  font-weight: 600;
  animation: bp-toast-in 0.3s ease;
}
@keyframes bp-toast-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
[data-betapad] .bp-export-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 4px;
  background: var(--bp-bg-solid);
  border: 1px solid var(--bp-border);
  border-radius: var(--bp-radius);
  padding: 4px;
  min-width: 200px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
[data-betapad] .bp-export-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: var(--bp-text);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
[data-betapad] .bp-export-item:hover { background: var(--bp-surface); }
[data-betapad] .bp-resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  bottom: 0;
  left: 0;
  cursor: sw-resize;
  opacity: 0.3;
}
[data-betapad] .bp-resize-handle:hover { opacity: 0.6; }
[data-betapad] .bp-recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bp-red);
  animation: bp-pulse 1s infinite;
}
@keyframes bp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
[data-betapad] .bp-warning {
  background: rgba(245,158,11,0.15);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: var(--bp-radius);
  padding: 6px 10px;
  font-size: 11px;
  color: #fbbf24;
  margin-bottom: 8px;
}
[data-betapad] .bp-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--bp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(20, 20, 30, 0.5);
  flex-shrink: 0;
  position: relative;
}
@media (max-width: 640px) {
  [data-betapad] .bp-panel {
    left: 4px !important;
    right: 4px !important;
    bottom: 4px !important;
    top: auto !important;
    width: auto !important;
    min-width: unset;
    max-height: 70vh;
  }
}
`

// ═══════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════

const ALL_TAGS: Tag[] = [
  'bug', 'ux-issue', 'copy-edit', 'flow-break', 'feature-idea',
  'performance', 'mobile', 'accessibility', 'critical', 'visual',
]

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'P0', label: 'P0-Critical', color: '#ef4444' },
  { value: 'P1', label: 'P1-High', color: '#f59e0b' },
  { value: 'P2', label: 'P2-Medium', color: '#3b82f6' },
  { value: 'P3', label: 'P3-Low', color: '#9ca3af' },
]

const SEVERITIES: Severity[] = ['critical', 'major', 'minor', 'cosmetic']
const IMPACT_TAGS: ImpactTag[] = ['revenue', 'conversion', 'retention', 'trust', 'ux']
const EFFORT_OPTIONS: { value: EffortGuess; label: string }[] = [
  { value: 'quick-win', label: 'Quick Win' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'epic', label: 'Epic' },
]
const STATUSES: { value: EntryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont-fix', label: "Won't Fix" },
]

// ═══════════════════════════════════════════════════════
//  SVG Icons (inline to avoid dependencies)
// ═══════════════════════════════════════════════════════

const IconBug = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1"/></svg>
const IconNote = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconMinus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconPin = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 10.76a2 2 0 01-1.11-1.88V5.77a2 2 0 01.65-1.47l1.35-1.22a2 2 0 012.22 0l1.35 1.22a2 2 0 01.65 1.47v3.11a2 2 0 01-1.11 1.88L12 11.5z"/><path d="M5 17h14"/></svg>
const IconMic = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconCamera = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
const IconStar = ({ filled }: { filled?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconRecord = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>

// ═══════════════════════════════════════════════════════
//  PIN TO ELEMENT OVERLAY
// ═══════════════════════════════════════════════════════

function PinOverlay({ onSelect, onCancel }: { onSelect: (selector: string) => void; onCancel: () => void }) {
  const [highlight, setHighlight] = useState<DOMRect | null>(null)
  const [label, setLabel] = useState('')
  const lastEl = useRef<Element | null>(null)

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (el && !el.closest('[data-betapad]') && el !== lastEl.current) {
      lastEl.current = el
      const rect = el.getBoundingClientRect()
      setHighlight(rect)
      setLabel(el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''))
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (lastEl.current) {
      onSelect(getCssSelector(lastEl.current))
    }
  }, [onSelect])

  return (
    <>
      <div className="bp-pin-overlay" onMouseMove={handleMove} onClick={handleClick} onContextMenu={(e) => { e.preventDefault(); onCancel() }} />
      {highlight && (
        <>
          <div className="bp-pin-highlight" style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height }} />
          <div className="bp-pin-label" style={{ left: highlight.left, top: highlight.top - 22 }}>{label}</div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════
//  TAB: QUICK NOTE
// ═══════════════════════════════════════════════════════

function QuickNoteTab() {
  const { addQuickNote, setPinMode } = useBetaPad()
  const [text, setText] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [priority, setPriority] = useState<Priority>('P2')
  const [pinnedSelector, setPinnedSelector] = useState<string | null>(null)
  const [showPinOverlay, setShowPinOverlay] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [variantTag, setVariantTag] = useState<'A' | 'B' | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const toggleTag = (t: Tag) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleSubmit = () => {
    if (!text.trim()) return
    addQuickNote({
      text: text.trim(),
      tags,
      priority,
      dom_selector: pinnedSelector,
      variant_tag: variantTag,
    })
    setText('')
    setTags([])
    setPriority('P2')
    setPinnedSelector(null)
    setVariantTag(null)
  }

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (e: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      setText(transcript)
    }
    recognition.onerror = () => setIsVoiceRecording(false)
    recognition.onend = () => setIsVoiceRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsVoiceRecording(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setIsVoiceRecording(false)
  }

  return (
    <div>
      {showPinOverlay && (
        <PinOverlay
          onSelect={(sel) => { setPinnedSelector(sel); setShowPinOverlay(false); setPinMode(false) }}
          onCancel={() => { setShowPinOverlay(false); setPinMode(false) }}
        />
      )}

      <div className="bp-field">
        <textarea
          ref={textareaRef}
          className="bp-textarea"
          placeholder="What did you notice? (Ctrl+Enter to submit)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleSubmit() }}
          rows={4}
        />
      </div>

      <div className="bp-field">
        <label className="bp-label">Tags</label>
        <div className="bp-chips">
          {ALL_TAGS.map(t => (
            <span key={t} className={`bp-chip ${tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t)}>{t}</span>
          ))}
        </div>
      </div>

      <div className="bp-row" style={{ marginBottom: 10 }}>
        <div>
          <label className="bp-label">Priority</label>
          <select className="bp-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="bp-label">A/B Variant</label>
          <select className="bp-select" value={variantTag ?? ''} onChange={(e) => setVariantTag(e.target.value as 'A' | 'B' || null)}>
            <option value="">None</option>
            <option value="A">Variant A</option>
            <option value="B">Variant B</option>
          </select>
        </div>
      </div>

      {pinnedSelector && (
        <div className="bp-warning" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>
          Pinned to: <code style={{ fontSize: 11 }}>{pinnedSelector}</code>
          <button className="bp-btn-icon" style={{ marginLeft: 6, display: 'inline' }} onClick={() => setPinnedSelector(null)}><IconX /></button>
        </div>
      )}

      <div className="bp-row" style={{ gap: 6 }}>
        <button className="bp-btn primary" style={{ flex: 2 }} onClick={handleSubmit}>Submit Note</button>
        <button className="bp-btn" title="Pin to Element" onClick={() => { setShowPinOverlay(true); setPinMode(true) }}><IconPin /></button>
        <button className={`bp-btn ${isVoiceRecording ? 'danger' : ''}`} title="Voice to Text" onClick={isVoiceRecording ? stopVoice : startVoice}>
          {isVoiceRecording ? <div className="bp-recording-dot" /> : <IconMic />}
        </button>
        <button className="bp-btn" title="Screenshot" onClick={async () => {
          const data = await captureScreenshot()
          if (data && text.trim()) {
            addQuickNote({ text: text.trim(), tags, priority, screenshot_data: data, variant_tag: variantTag })
            setText('')
          }
        }}><IconCamera /></button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  TAB: BUG REPORT
// ═══════════════════════════════════════════════════════

function BugReportTab() {
  const { addBugReport, isRecordingFlow, startRecordingFlow, stopRecordingFlow, consoleErrors, networkErrors } = useBetaPad()
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState<ReproStep[]>([{ id: uuid(), text: '' }])
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [severity, setSeverity] = useState<Severity>('major')
  const [priority, setPriority] = useState<Priority>('P1')
  const [tags, setTags] = useState<Tag[]>(['bug'])
  const [variantTag, setVariantTag] = useState<'A' | 'B' | null>(null)

  const addStep = () => setSteps([...steps, { id: uuid(), text: '' }])
  const removeStep = (id: string) => setSteps(steps.filter(s => s.id !== id))
  const updateStep = (id: string, text: string) => setSteps(steps.map(s => s.id === id ? { ...s, text } : s))

  const handleSubmit = () => {
    if (!title.trim()) return
    if (isRecordingFlow) stopRecordingFlow()
    addBugReport({
      title: title.trim(),
      steps_to_reproduce: steps.filter(s => s.text.trim()),
      expected_behavior: expected.trim(),
      actual_behavior: actual.trim(),
      severity,
      priority,
      tags,
      variant_tag: variantTag,
    })
    // Reset
    setTitle('')
    setSteps([{ id: uuid(), text: '' }])
    setExpected('')
    setActual('')
    setSeverity('major')
    setPriority('P1')
    setTags(['bug'])
    setVariantTag(null)
  }

  return (
    <div>
      <div className="bp-field">
        <label className="bp-label">Title *</label>
        <input className="bp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief bug description" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Steps to Reproduce</label>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <span style={{ color: 'var(--bp-text-dim)', fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
            <input className="bp-input" value={step.text} onChange={(e) => updateStep(step.id, e.target.value)} placeholder={`Step ${i + 1}`} />
            {steps.length > 1 && (
              <button className="bp-btn-icon" onClick={() => removeStep(step.id)}><IconX /></button>
            )}
          </div>
        ))}
        <button className="bp-btn small" onClick={addStep}><IconPlus /> Add Step</button>
      </div>

      <div className="bp-field">
        <label className="bp-label">Expected Behavior</label>
        <textarea className="bp-textarea" style={{ minHeight: 50 }} value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="What should happen?" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Actual Behavior</label>
        <textarea className="bp-textarea" style={{ minHeight: 50 }} value={actual} onChange={(e) => setActual(e.target.value)} placeholder="What actually happened?" />
      </div>

      <div className="bp-row" style={{ marginBottom: 10 }}>
        <div>
          <label className="bp-label">Severity</label>
          <select className="bp-select" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="bp-label">Priority</label>
          <select className="bp-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bp-field">
        <label className="bp-label">Tags</label>
        <div className="bp-chips">
          {ALL_TAGS.map(t => (
            <span key={t} className={`bp-chip ${tags.includes(t) ? 'selected' : ''}`} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</span>
          ))}
        </div>
      </div>

      <div className="bp-row" style={{ marginBottom: 10 }}>
        <div>
          <label className="bp-label">A/B Variant</label>
          <select className="bp-select" value={variantTag ?? ''} onChange={(e) => setVariantTag(e.target.value as 'A' | 'B' || null)}>
            <option value="">None</option>
            <option value="A">Variant A</option>
            <option value="B">Variant B</option>
          </select>
        </div>
      </div>

      {/* Auto-captured info */}
      <div style={{ marginBottom: 10, fontSize: 11, color: 'var(--bp-text-dim)' }}>
        Auto-attached: {consoleErrors.length} console errors, {networkErrors.length} network errors
      </div>

      <div className="bp-row" style={{ gap: 6 }}>
        <button className="bp-btn primary" style={{ flex: 2 }} onClick={handleSubmit}>Submit Bug</button>
        <button className={`bp-btn ${isRecordingFlow ? 'danger' : ''}`} onClick={isRecordingFlow ? () => stopRecordingFlow() : startRecordingFlow} title={isRecordingFlow ? 'Stop Recording' : 'Record Flow'}>
          {isRecordingFlow ? <><div className="bp-recording-dot" /> Stop</> : <><IconRecord /> Record</>}
        </button>
        <button className="bp-btn" title="Screenshot" onClick={async () => {
          const data = await captureScreenshot()
          if (data) {
            // Store screenshot to be attached to next submit
            console.info('[BetaPad] Screenshot captured')
          }
        }}><IconCamera /></button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  TAB: FEATURE REQUEST
// ═══════════════════════════════════════════════════════

function FeatureRequestTab() {
  const { addFeatureRequest } = useBetaPad()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [userStory, setUserStory] = useState('')
  const [showStoryHelper, setShowStoryHelper] = useState(false)
  const [storyRole, setStoryRole] = useState('storage operator')
  const [storyWant, setStoryWant] = useState('')
  const [storySo, setStorySo] = useState('')
  const [impactTags, setImpactTags] = useState<ImpactTag[]>([])
  const [effort, setEffort] = useState<EffortGuess>('medium')
  const [competitiveNote, setCompetitiveNote] = useState('')
  const [tags, setTags] = useState<Tag[]>(['feature-idea'])
  const [priority, setPriority] = useState<Priority>('P2')
  const [variantTag, setVariantTag] = useState<'A' | 'B' | null>(null)

  const applyStoryHelper = () => {
    setUserStory(`As a ${storyRole}, I want ${storyWant} so that ${storySo}`)
    setShowStoryHelper(false)
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    addFeatureRequest({
      title: title.trim(),
      description: description.trim(),
      user_story: userStory.trim(),
      impact_tags: impactTags,
      effort_guess: effort,
      competitive_note: competitiveNote.trim(),
      tags,
      priority,
      variant_tag: variantTag,
    })
    // Reset
    setTitle('')
    setDescription('')
    setUserStory('')
    setImpactTags([])
    setEffort('medium')
    setCompetitiveNote('')
    setTags(['feature-idea'])
    setPriority('P2')
    setVariantTag(null)
  }

  return (
    <div>
      <div className="bp-field">
        <label className="bp-label">Title *</label>
        <input className="bp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Feature name" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Description (what and why)</label>
        <textarea className="bp-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should this feature do and why is it needed?" />
      </div>

      <div className="bp-field">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <label className="bp-label" style={{ margin: 0 }}>User Story</label>
          <button className="bp-btn small" onClick={() => setShowStoryHelper(!showStoryHelper)}>
            {showStoryHelper ? 'Close Helper' : 'Story Helper'}
          </button>
        </div>
        {showStoryHelper ? (
          <div style={{ background: 'var(--bp-surface)', borderRadius: 'var(--bp-radius)', padding: 8, marginBottom: 8 }}>
            <div className="bp-field">
              <label className="bp-label" style={{ fontSize: 10 }}>As a...</label>
              <input className="bp-input" value={storyRole} onChange={(e) => setStoryRole(e.target.value)} />
            </div>
            <div className="bp-field">
              <label className="bp-label" style={{ fontSize: 10 }}>I want...</label>
              <input className="bp-input" value={storyWant} onChange={(e) => setStoryWant(e.target.value)} placeholder="to do something" />
            </div>
            <div className="bp-field">
              <label className="bp-label" style={{ fontSize: 10 }}>So that...</label>
              <input className="bp-input" value={storySo} onChange={(e) => setStorySo(e.target.value)} placeholder="I can achieve something" />
            </div>
            <button className="bp-btn small primary" onClick={applyStoryHelper}>Apply</button>
          </div>
        ) : (
          <textarea className="bp-textarea" style={{ minHeight: 50 }} value={userStory} onChange={(e) => setUserStory(e.target.value)} placeholder="As a [role], I want [X] so that [Y]" />
        )}
      </div>

      <div className="bp-field">
        <label className="bp-label">Impact</label>
        <div className="bp-chips">
          {IMPACT_TAGS.map(t => (
            <span key={t} className={`bp-chip ${impactTags.includes(t) ? 'selected' : ''}`} onClick={() => setImpactTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</span>
          ))}
        </div>
      </div>

      <div className="bp-row" style={{ marginBottom: 10 }}>
        <div>
          <label className="bp-label">Effort</label>
          <select className="bp-select" value={effort} onChange={(e) => setEffort(e.target.value as EffortGuess)}>
            {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="bp-label">Priority</label>
          <select className="bp-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bp-field">
        <label className="bp-label">Competitive Note</label>
        <input className="bp-input" value={competitiveNote} onChange={(e) => setCompetitiveNote(e.target.value)} placeholder="What do competitors do here?" />
      </div>

      <div className="bp-field">
        <label className="bp-label">Tags</label>
        <div className="bp-chips">
          {ALL_TAGS.map(t => (
            <span key={t} className={`bp-chip ${tags.includes(t) ? 'selected' : ''}`} onClick={() => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>{t}</span>
          ))}
        </div>
      </div>

      <button className="bp-btn primary" style={{ width: '100%' }} onClick={handleSubmit}>Submit Feature Request</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  TAB: SESSION LOG
// ═══════════════════════════════════════════════════════

function SessionLogTab() {
  const { currentSession, toggleStar, deleteEntry, setEntryStatus, updateEntry, breadcrumb } = useBetaPad()
  const [filters, setFilters] = useState<SessionLogFilters>({
    type: 'all', tag: 'all', priority: 'all', search: '', starred: false,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const entries = currentSession?.entries ?? []

  const filtered = entries.filter(e => {
    if (filters.type !== 'all' && e.entry_type !== filters.type) return false
    if (filters.tag !== 'all' && !e.tags.includes(filters.tag as Tag)) return false
    if (filters.priority !== 'all' && e.priority !== filters.priority) return false
    if (filters.starred && !e.starred) return false
    if (filters.search) {
      const s = filters.search.toLowerCase()
      const text = e.entry_type === 'note' ? (e as QuickNote).text :
        e.entry_type === 'bug' ? (e as BugReport).title :
        (e as FeatureRequest).title
      if (!text.toLowerCase().includes(s)) return false
    }
    return true
  }).reverse() // newest first

  const startEdit = (entry: BetaPadEntry) => {
    setEditingId(entry.entry_id)
    const text = entry.entry_type === 'note' ? (entry as QuickNote).text :
      entry.entry_type === 'bug' ? (entry as BugReport).title :
      (entry as FeatureRequest).title
    setEditText(text)
  }

  const saveEdit = (entry: BetaPadEntry) => {
    if (entry.entry_type === 'note') updateEntry(entry.entry_id, { text: editText } as Partial<QuickNote>)
    else if (entry.entry_type === 'bug') updateEntry(entry.entry_id, { title: editText } as Partial<BugReport>)
    else updateEntry(entry.entry_id, { title: editText } as Partial<FeatureRequest>)
    setEditingId(null)
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <select className="bp-select" style={{ width: 'auto', flex: 1, fontSize: 11 }} value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as typeof f.type }))}>
          <option value="all">All Types</option>
          <option value="note">Notes</option>
          <option value="bug">Bugs</option>
          <option value="feature">Features</option>
        </select>
        <select className="bp-select" style={{ width: 'auto', flex: 1, fontSize: 11 }} value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value as typeof f.priority }))}>
          <option value="all">All Priority</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button className={`bp-btn small ${filters.starred ? 'primary' : ''}`} onClick={() => setFilters(f => ({ ...f, starred: !f.starred }))}>
          <IconStar filled={filters.starred} />
        </button>
      </div>
      <div className="bp-field">
        <input className="bp-input" style={{ fontSize: 11 }} placeholder="Search entries..." value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
      </div>

      {/* Entries */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--bp-text-dim)', padding: 20, fontSize: 12 }}>
          {entries.length === 0 ? 'No entries yet. Start capturing notes, bugs, or features!' : 'No entries match your filters.'}
        </div>
      )}
      {filtered.map(entry => {
        const typeClass = entry.entry_type === 'note' ? 'bp-type-note' : entry.entry_type === 'bug' ? 'bp-type-bug' : 'bp-type-feature'
        const text = entry.entry_type === 'note' ? (entry as QuickNote).text :
          entry.entry_type === 'bug' ? (entry as BugReport).title :
          (entry as FeatureRequest).title

        return (
          <div key={entry.entry_id} className="bp-entry-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span className={`bp-entry-type ${typeClass}`}>{entry.entry_type}</span>
              <span className="bp-badge">{entry.priority}</span>
              <span className={`bp-status-badge bp-status-${entry.status}`}>{entry.status}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                <button className="bp-btn-icon" onClick={() => toggleStar(entry.entry_id)} title="Star">
                  <IconStar filled={entry.starred} />
                </button>
                <button className="bp-btn-icon" onClick={() => startEdit(entry)} title="Edit">
                  <IconNote />
                </button>
                {deleteConfirmId === entry.entry_id ? (
                  <>
                    <button className="bp-btn small danger" onClick={() => { deleteEntry(entry.entry_id); setDeleteConfirmId(null) }}>Yes</button>
                    <button className="bp-btn small" onClick={() => setDeleteConfirmId(null)}>No</button>
                  </>
                ) : (
                  <button className="bp-btn-icon" onClick={() => setDeleteConfirmId(entry.entry_id)} title="Delete" style={{ color: 'var(--bp-red)' }}>
                    <IconTrash />
                  </button>
                )}
              </span>
            </div>

            {editingId === entry.entry_id ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input className="bp-input" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(entry); if (e.key === 'Escape') setEditingId(null) }} autoFocus />
                <button className="bp-btn small primary" onClick={() => saveEdit(entry)}>Save</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, marginBottom: 4 }}>{text}</div>
            )}

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              {entry.tags.map(t => <span key={t} className="bp-badge">{t}</span>)}
              <span style={{ fontSize: 10, color: 'var(--bp-text-dim)', marginLeft: 'auto' }}>
                {entry.route} — {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Status changer */}
            <div style={{ marginTop: 6 }}>
              <select className="bp-select" style={{ width: 'auto', fontSize: 10, padding: '2px 6px' }} value={entry.status} onChange={(e) => setEntryStatus(entry.entry_id, e.target.value as EntryStatus)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )
      })}

      {/* Flow Breadcrumb */}
      {breadcrumb.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <label className="bp-label">Session Flow ({breadcrumb.length} pages)</label>
          <div style={{ fontSize: 11, color: 'var(--bp-text-dim)' }}>
            {breadcrumb.map((step, i) => (
              <span key={i}>
                {i > 0 && ' → '}
                <span style={{ color: 'var(--bp-accent)' }}>{step.route}</span>
                <span style={{ fontSize: 10 }}> ({step.time_spent_seconds}s)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  EXPORT MENU
// ═══════════════════════════════════════════════════════

function ExportMenu({ onClose }: { onClose: () => void }) {
  const { currentSession } = useBetaPad()
  const [toast, setToast] = useState('')

  if (!currentSession || currentSession.entries.length === 0) {
    return (
      <div className="bp-export-menu">
        <div style={{ padding: 8, fontSize: 12, color: 'var(--bp-text-dim)' }}>No entries to export</div>
      </div>
    )
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const handleExport = (type: string) => {
    const session = currentSession
    const date = new Date(session.started).toISOString().slice(0, 10)

    switch (type) {
      case 'markdown':
        downloadText(exportMarkdown(session), `betapad-${date}.md`, 'text/markdown')
        showToast('Markdown exported!')
        break
      case 'json':
        downloadJson(session, `betapad-${date}.json`)
        showToast('JSON exported!')
        break
      case 'claude': {
        const prompt = exportClaudePrompt(session)
        navigator.clipboard.writeText(prompt).then(() => showToast('Claude prompt copied to clipboard!'))
        break
      }
      case 'github':
        downloadText(exportGitHubIssues(session), `betapad-issues-${date}.md`, 'text/markdown')
        showToast('GitHub issues exported!')
        break
      case 'csv':
        downloadText(exportCSV(session), `betapad-${date}.csv`, 'text/csv')
        showToast('CSV exported!')
        break
    }
    onClose()
  }

  return (
    <>
      <div className="bp-export-menu">
        <button className="bp-export-item" onClick={() => handleExport('claude')}>
          <IconCopy /> Copy Claude Prompt
        </button>
        <button className="bp-export-item" onClick={() => handleExport('markdown')}>
          <IconDownload /> Export as Markdown
        </button>
        <button className="bp-export-item" onClick={() => handleExport('json')}>
          <IconDownload /> Export as JSON
        </button>
        <button className="bp-export-item" onClick={() => handleExport('github')}>
          <IconDownload /> Export for GitHub Issues
        </button>
        <button className="bp-export-item" onClick={() => handleExport('csv')}>
          <IconDownload /> Export CSV
        </button>
      </div>
      {toast && <div className="bp-toast">{toast}</div>}
    </>
  )
}

// ═══════════════════════════════════════════════════════
//  MAIN PANEL COMPONENT
// ═══════════════════════════════════════════════════════

export default function BetaPadPanel() {
  const {
    panel, togglePanel, setCollapsed, setActiveTab,
    setPanelPosition, setPanelSize, currentSession,
    storageWarning, isRecordingFlow, autoDetections,
  } = useBetaPad()
  const [showExport, setShowExport] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Inject styles
  useEffect(() => {
    const id = 'betapad-styles'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // Drag handling
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.bp-btn-icon, .bp-tab, button')) return
    isDragging.current = true
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging.current) {
        setPanelPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        })
      }
      if (isResizing.current && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()
        setPanelSize({
          width: Math.max(360, rect.right - e.clientX),
          height: Math.max(300, rect.bottom - e.clientY),
        })
      }
    }
    const onUp = () => { isDragging.current = false; isResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [setPanelPosition, setPanelSize])

  const entryCount = currentSession?.entries.length ?? 0
  const detectionCount = autoDetections.length

  // Calculate position — default to bottom-right
  const posStyle: React.CSSProperties = panel.position.x < 0
    ? { bottom: 20, right: 20 }
    : { left: panel.position.x, top: panel.position.y }

  const portalContent = (
    <div data-betapad="">
      {/* FAB button */}
      {!panel.open && (
        <button className="bp-fab" onClick={togglePanel} title="BetaPad (Ctrl+Shift+B)">
          <IconBug />
          {entryCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white',
              fontSize: 10, fontWeight: 700,
              width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{entryCount}</span>
          )}
        </button>
      )}

      {/* Panel */}
      {panel.open && !panel.collapsed && (
        <div
          ref={panelRef}
          className="bp-panel"
          style={{
            ...posStyle,
            width: panel.size.width,
            height: panel.size.height,
          }}
        >
          {/* Header */}
          <div className="bp-header" onMouseDown={onDragStart}>
            <span className="bp-logo">BetaPad</span>
            {isRecordingFlow && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--bp-red)' }}>
                <div className="bp-recording-dot" /> REC
              </span>
            )}
            {detectionCount > 0 && (
              <span className="bp-badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                {detectionCount} auto
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--bp-text-dim)' }}>
              {entryCount} entries
            </span>
            <div className="bp-header-actions">
              <button className="bp-btn-icon" onClick={() => setCollapsed(true)} title="Minimize"><IconMinus /></button>
              <button className="bp-btn-icon" onClick={togglePanel} title="Close"><IconX /></button>
            </div>
          </div>

          {/* Warning */}
          {storageWarning && <div className="bp-warning">{storageWarning}</div>}

          {/* Tabs */}
          <div className="bp-tabs">
            <button className={`bp-tab ${panel.activeTab === 'note' ? 'active' : ''}`} onClick={() => setActiveTab('note')}>
              Note
            </button>
            <button className={`bp-tab ${panel.activeTab === 'bug' ? 'active' : ''}`} onClick={() => setActiveTab('bug')}>
              Bug
            </button>
            <button className={`bp-tab ${panel.activeTab === 'feature' ? 'active' : ''}`} onClick={() => setActiveTab('feature')}>
              Feature
            </button>
            <button className={`bp-tab ${panel.activeTab === 'session-log' ? 'active' : ''}`} onClick={() => setActiveTab('session-log')}>
              Log ({entryCount})
            </button>
          </div>

          {/* Body */}
          <div className="bp-body">
            {panel.activeTab === 'note' && <QuickNoteTab />}
            {panel.activeTab === 'bug' && <BugReportTab />}
            {panel.activeTab === 'feature' && <FeatureRequestTab />}
            {panel.activeTab === 'session-log' && <SessionLogTab />}
          </div>

          {/* Footer */}
          <div className="bp-footer">
            <span style={{ fontSize: 10, color: 'var(--bp-text-dim)' }}>
              Ctrl+Shift+B to toggle
            </span>
            <div style={{ position: 'relative' }}>
              {showExport && <ExportMenu onClose={() => setShowExport(false)} />}
              <button className="bp-btn small" onClick={() => setShowExport(!showExport)}>
                <IconDownload /> Export
              </button>
            </div>
          </div>

          {/* Resize handle */}
          <div className="bp-resize-handle" onMouseDown={(e) => { isResizing.current = true; e.preventDefault() }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M14 16L16 14M10 16L16 10M6 16L16 6" stroke="currentColor" strokeWidth="1" opacity="0.4"/></svg>
          </div>
        </div>
      )}

      {/* Collapsed state */}
      {panel.open && panel.collapsed && (
        <button className="bp-fab" onClick={() => setCollapsed(false)} title="Expand BetaPad" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
          <IconBug />
          {entryCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white',
              fontSize: 10, fontWeight: 700,
              width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{entryCount}</span>
          )}
        </button>
      )}

    </div>
  )

  // Render via portal to avoid interfering with app layout
  return createPortal(portalContent, document.body)
}
