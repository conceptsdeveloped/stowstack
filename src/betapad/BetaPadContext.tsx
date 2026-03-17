import {
  createContext, useContext, useCallback, useEffect, useRef, useState,
  type ReactNode,
} from 'react'
import type {
  BetaPadStore, BetaPadSession, BetaPadEntry, QuickNote, BugReport,
  FeatureRequest, BreadcrumbStep, ConsoleError, NetworkError,
  RecordedAction, PanelState, BetaPadTab, Tag, Priority, Severity,
  ImpactTag, EffortGuess, ReproStep, AutoDetection, EntryStatus,
} from './types'
import {
  uuid, loadStore, saveStore, captureMetadata, isoTimestamp, getRoute,
  createSession,
} from './utils'

// ─── Context shape ───

interface BetaPadContextValue {
  // State
  store: BetaPadStore
  currentSession: BetaPadSession | null
  panel: PanelState
  consoleErrors: ConsoleError[]
  networkErrors: NetworkError[]
  breadcrumb: BreadcrumbStep[]
  recordedActions: RecordedAction[]
  isRecordingFlow: boolean
  autoDetections: AutoDetection[]
  storageWarning: string | null

  // Panel control
  togglePanel: () => void
  setCollapsed: (v: boolean) => void
  setActiveTab: (tab: BetaPadTab) => void
  setPanelPosition: (pos: { x: number; y: number }) => void
  setPanelSize: (size: { width: number; height: number }) => void
  setPinMode: (v: boolean) => void

  // Entry creation
  addQuickNote: (data: {
    text: string; tags: Tag[]; priority: Priority;
    dom_selector?: string | null; screenshot_data?: string | null;
    audio_data?: string; variant_tag?: 'A' | 'B' | null;
  }) => void
  addBugReport: (data: {
    title: string; steps_to_reproduce: ReproStep[];
    expected_behavior: string; actual_behavior: string;
    severity: Severity; priority: Priority; tags: Tag[];
    dom_selector?: string | null; screenshot_data?: string | null;
    variant_tag?: 'A' | 'B' | null;
  }) => void
  addFeatureRequest: (data: {
    title: string; description: string; user_story: string;
    impact_tags: ImpactTag[]; effort_guess: EffortGuess;
    competitive_note: string; tags: Tag[]; priority: Priority;
    variant_tag?: 'A' | 'B' | null;
  }) => void

  // Entry management
  updateEntry: (id: string, updates: Partial<BetaPadEntry>) => void
  deleteEntry: (id: string) => void
  toggleStar: (id: string) => void
  setEntryStatus: (id: string, status: EntryStatus) => void

  // Flow recording
  startRecordingFlow: () => void
  stopRecordingFlow: () => RecordedAction[]

  // Session
  sessionId: string
}

const BetaPadContext = createContext<BetaPadContextValue | null>(null)

export function useBetaPad() {
  const ctx = useContext(BetaPadContext)
  if (!ctx) throw new Error('useBetaPad must be used within BetaPadProvider')
  return ctx
}

// ─── Provider ───

export function BetaPadProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<BetaPadStore>(loadStore)
  const [panel, setPanel] = useState<PanelState>({
    open: false,
    collapsed: false,
    position: { x: -1, y: -1 }, // -1 = default bottom-right
    size: { width: 420, height: 520 },
    activeTab: 'note',
    pinMode: false,
    recordingFlow: false,
    voiceRecording: false,
  })
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [autoDetections, setAutoDetections] = useState<AutoDetection[]>([])

  // Session ID — persisted per browser session
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('betapad_session_id')
    if (existing) return existing
    const id = uuid()
    sessionStorage.setItem('betapad_session_id', id)
    return id
  })

  // Refs for tracking
  const consoleErrorsRef = useRef<ConsoleError[]>([])
  const networkErrorsRef = useRef<NetworkError[]>([])
  const breadcrumbRef = useRef<BreadcrumbStep[]>([])
  const recordedActionsRef = useRef<RecordedAction[]>([])
  const isRecordingFlowRef = useRef(false)
  const pageEnteredAtRef = useRef(Date.now())
  const previousRouteRef = useRef(getRoute())
  const sequentialRef = useRef(0)
  const sessionStartRef = useRef(Date.now())
  const rageClickRef = useRef<{ x: number; y: number; count: number; timer: number | null }>({
    x: 0, y: 0, count: 0, timer: null,
  })

  // State mirrors of refs (for consumers)
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([])
  const [networkErrors, setNetworkErrors] = useState<NetworkError[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbStep[]>([])
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([])
  const [isRecordingFlow, setIsRecordingFlow] = useState(false)

  // Initialize or resume session in store
  const currentSession = store.sessions[sessionId] ?? null

  const updateStore = useCallback((updater: (s: BetaPadStore) => BetaPadStore) => {
    setStore(prev => {
      const next = updater(prev)
      const result = saveStore(next)
      if (result.warning) setStorageWarning(result.warning)
      return next
    })
  }, [])

  const ensureSession = useCallback((s: BetaPadStore): BetaPadStore => {
    if (s.sessions[sessionId]) return s
    return {
      ...s,
      sessions: { ...s.sessions, [sessionId]: createSession(sessionId) },
    }
  }, [sessionId])

  // ─── Console error capture ───
  useEffect(() => {
    const origError = console.error
    const origWarn = console.warn

    console.error = (...args: unknown[]) => {
      const entry: ConsoleError = {
        message: args.map(a => String(a)).join(' '),
        timestamp: isoTimestamp(),
        level: 'error',
      }
      consoleErrorsRef.current = [...consoleErrorsRef.current.slice(-49), entry]
      setConsoleErrors([...consoleErrorsRef.current])

      // Auto-detect: JS error → auto-create bug entry
      addAutoDetection({
        type: 'js-error',
        timestamp: isoTimestamp(),
        details: entry.message.slice(0, 200),
        page: getRoute(),
      })

      origError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      const entry: ConsoleError = {
        message: args.map(a => String(a)).join(' '),
        timestamp: isoTimestamp(),
        level: 'warn',
      }
      consoleErrorsRef.current = [...consoleErrorsRef.current.slice(-49), entry]
      setConsoleErrors([...consoleErrorsRef.current])
      origWarn.apply(console, args)
    }

    return () => {
      console.error = origError
      console.warn = origWarn
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Network error capture ───
  useEffect(() => {
    const origFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args)
        if (res.status >= 400) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
          const method = (args[1]?.method || 'GET').toUpperCase()
          const entry: NetworkError = {
            url, method, status: res.status, statusText: res.statusText,
            timestamp: isoTimestamp(),
          }
          networkErrorsRef.current = [...networkErrorsRef.current.slice(-49), entry]
          setNetworkErrors([...networkErrorsRef.current])
        }
        return res
      } catch (err) {
        throw err
      }
    }
    return () => { window.fetch = origFetch }
  }, [])

  // ─── Route change tracking (breadcrumb) ───
  useEffect(() => {
    const checkRoute = () => {
      const current = getRoute()
      if (current !== previousRouteRef.current) {
        const step: BreadcrumbStep = {
          url: window.location.href,
          route: current,
          page_title: document.title,
          timestamp: isoTimestamp(),
          time_spent_seconds: Math.round((Date.now() - pageEnteredAtRef.current) / 1000),
        }
        breadcrumbRef.current = [...breadcrumbRef.current, step]
        setBreadcrumb([...breadcrumbRef.current])

        // Record as action if recording flow
        if (isRecordingFlowRef.current) {
          recordedActionsRef.current.push({
            type: 'route-change',
            timestamp: isoTimestamp(),
            value: current,
          })
          setRecordedActions([...recordedActionsRef.current])
        }

        // Update session breadcrumb
        updateStore(s => {
          const ns = ensureSession(s)
          const sess = ns.sessions[sessionId]
          return {
            ...ns,
            sessions: {
              ...ns.sessions,
              [sessionId]: {
                ...sess,
                flow_breadcrumb: [...sess.flow_breadcrumb, step],
                total_pages_visited: sess.total_pages_visited + 1,
              },
            },
          }
        })

        previousRouteRef.current = current
        pageEnteredAtRef.current = Date.now()
      }
    }

    // Poll for route changes (works with any router)
    const interval = setInterval(checkRoute, 500)

    // Also listen for popstate
    window.addEventListener('popstate', checkRoute)

    // Initial breadcrumb
    const initialStep: BreadcrumbStep = {
      url: window.location.href,
      route: getRoute(),
      page_title: document.title,
      timestamp: isoTimestamp(),
      time_spent_seconds: 0,
    }
    breadcrumbRef.current = [initialStep]
    setBreadcrumb([initialStep])
    updateStore(s => {
      const ns = ensureSession(s)
      const sess = ns.sessions[sessionId]
      return {
        ...ns,
        sessions: {
          ...ns.sessions,
          [sessionId]: {
            ...sess,
            flow_breadcrumb: sess.flow_breadcrumb.length === 0 ? [initialStep] : sess.flow_breadcrumb,
            total_pages_visited: sess.total_pages_visited === 0 ? 1 : sess.total_pages_visited,
          },
        },
      }
    })

    return () => {
      clearInterval(interval)
      window.removeEventListener('popstate', checkRoute)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ─── Session time tracking ───
  useEffect(() => {
    const interval = setInterval(() => {
      updateStore(s => {
        if (!s.sessions[sessionId]) return s
        return {
          ...s,
          sessions: {
            ...s.sessions,
            [sessionId]: {
              ...s.sessions[sessionId],
              total_time: Math.round((Date.now() - sessionStartRef.current) / 1000),
              ended: isoTimestamp(),
            },
          },
        }
      })
    }, 10000) // update every 10s
    return () => clearInterval(interval)
  }, [sessionId, updateStore])

  // ─── Rage click detection ───
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const rc = rageClickRef.current
      const dist = Math.abs(e.clientX - rc.x) + Math.abs(e.clientY - rc.y)
      if (dist < 30) {
        rc.count++
        if (rc.count >= 5) {
          addAutoDetection({
            type: 'rage-click',
            timestamp: isoTimestamp(),
            details: `User rage-clicked near (${e.clientX}, ${e.clientY}) — ${rc.count} clicks`,
            page: getRoute(),
          })
          rc.count = 0
        }
      } else {
        rc.x = e.clientX
        rc.y = e.clientY
        rc.count = 1
      }
      if (rc.timer) clearTimeout(rc.timer)
      rc.timer = window.setTimeout(() => { rc.count = 0 }, 1000)

      // Record click action if recording
      if (isRecordingFlowRef.current) {
        const target = e.target as Element
        recordedActionsRef.current.push({
          type: 'click',
          timestamp: isoTimestamp(),
          target: target?.tagName?.toLowerCase() + (target?.className ? `.${String(target.className).split(' ')[0]}` : ''),
          coordinates: { x: e.clientX, y: e.clientY },
        })
        setRecordedActions([...recordedActionsRef.current])
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Slow page load detection ───
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          const loadTime = nav.loadEventEnd - nav.startTime
          if (loadTime > 3000) {
            addAutoDetection({
              type: 'slow-load',
              timestamp: isoTimestamp(),
              details: `Page load took ${(loadTime / 1000).toFixed(1)}s`,
              page: getRoute(),
            })
          }
        }
        if (entry.entryType === 'layout-shift') {
          const ls = entry as PerformanceEntry & { value?: number }
          if (ls.value && ls.value > 0.1) {
            addAutoDetection({
              type: 'cls',
              timestamp: isoTimestamp(),
              details: `Layout shift score: ${ls.value?.toFixed(3)}`,
              page: getRoute(),
            })
          }
        }
      }
    })
    try {
      observer.observe({ type: 'navigation', buffered: true })
      observer.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Some browsers don't support these entry types
    }
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Keyboard shortcut: Ctrl+Shift+B ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setPanel(p => ({ ...p, open: !p.open, collapsed: false }))
      }
      // Quick shortcuts when panel is open
      if (panel.open && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        // Don't capture when typing in inputs
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return
        // Check for betapad-scoped shortcuts
        if (target.closest('[data-betapad]')) return

        switch (e.key) {
          case 'b': setPanel(p => ({ ...p, activeTab: 'bug' })); break
          case 'n': setPanel(p => ({ ...p, activeTab: 'note' })); break
          case 'f': setPanel(p => ({ ...p, activeTab: 'feature' })); break
          case 's':
            if (e.shiftKey) {
              // Shift+S = screenshot
              e.preventDefault()
            }
            break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [panel.open])

  // ─── Auto-detection helper ───
  function addAutoDetection(detection: AutoDetection) {
    setAutoDetections(prev => [...prev, detection])
  }

  // ─── Build metadata for an entry ───
  function buildMeta(entryType: 'note' | 'bug' | 'feature') {
    sequentialRef.current++
    return captureMetadata(
      entryType,
      sessionId,
      sequentialRef.current,
      breadcrumbRef.current,
      consoleErrorsRef.current,
      networkErrorsRef.current,
      pageEnteredAtRef.current,
      previousRouteRef.current,
    )
  }

  // ─── Entry creation ───

  const addQuickNote: BetaPadContextValue['addQuickNote'] = useCallback((data) => {
    const meta = buildMeta('note')
    const entry: QuickNote = {
      ...meta,
      entry_type: 'note',
      text: data.text,
      tags: data.tags,
      priority: data.priority,
      dom_selector: data.dom_selector ?? null,
      screenshot_data: data.screenshot_data ?? null,
      starred: false,
      status: 'new',
      variant_tag: data.variant_tag ?? null,
      audio_data: data.audio_data,
    }
    updateStore(s => {
      const ns = ensureSession(s)
      const sess = ns.sessions[sessionId]
      return {
        ...ns,
        sessions: {
          ...ns.sessions,
          [sessionId]: { ...sess, entries: [...sess.entries, entry] },
        },
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, updateStore])

  const addBugReport: BetaPadContextValue['addBugReport'] = useCallback((data) => {
    const meta = buildMeta('bug')
    const entry: BugReport = {
      ...meta,
      entry_type: 'bug',
      title: data.title,
      steps_to_reproduce: data.steps_to_reproduce,
      expected_behavior: data.expected_behavior,
      actual_behavior: data.actual_behavior,
      severity: data.severity,
      priority: data.priority,
      tags: data.tags,
      dom_selector: data.dom_selector ?? null,
      screenshot_data: data.screenshot_data ?? null,
      recorded_actions: [...recordedActionsRef.current],
      starred: false,
      status: 'new',
      variant_tag: data.variant_tag ?? null,
    }
    updateStore(s => {
      const ns = ensureSession(s)
      const sess = ns.sessions[sessionId]
      return {
        ...ns,
        sessions: {
          ...ns.sessions,
          [sessionId]: { ...sess, entries: [...sess.entries, entry] },
        },
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, updateStore])

  const addFeatureRequest: BetaPadContextValue['addFeatureRequest'] = useCallback((data) => {
    const meta = buildMeta('feature')
    const entry: FeatureRequest = {
      ...meta,
      entry_type: 'feature',
      title: data.title,
      description: data.description,
      user_story: data.user_story,
      impact_tags: data.impact_tags,
      effort_guess: data.effort_guess,
      competitive_note: data.competitive_note,
      tags: data.tags,
      priority: data.priority,
      dom_selector: null,
      screenshot_data: null,
      starred: false,
      status: 'new',
      variant_tag: data.variant_tag ?? null,
    }
    updateStore(s => {
      const ns = ensureSession(s)
      const sess = ns.sessions[sessionId]
      return {
        ...ns,
        sessions: {
          ...ns.sessions,
          [sessionId]: { ...sess, entries: [...sess.entries, entry] },
        },
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, updateStore])

  // ─── Entry management ───

  const updateEntry = useCallback((id: string, updates: Partial<BetaPadEntry>) => {
    updateStore(s => {
      const sessions = { ...s.sessions }
      for (const sid of Object.keys(sessions)) {
        const sess = sessions[sid]
        const idx = sess.entries.findIndex(e => e.entry_id === id)
        if (idx >= 0) {
          const entries = [...sess.entries]
          entries[idx] = { ...entries[idx], ...updates } as BetaPadEntry
          sessions[sid] = { ...sess, entries }
          break
        }
      }
      return { ...s, sessions }
    })
  }, [updateStore])

  const deleteEntry = useCallback((id: string) => {
    updateStore(s => {
      const sessions = { ...s.sessions }
      for (const sid of Object.keys(sessions)) {
        const sess = sessions[sid]
        const idx = sess.entries.findIndex(e => e.entry_id === id)
        if (idx >= 0) {
          sessions[sid] = { ...sess, entries: sess.entries.filter(e => e.entry_id !== id) }
          break
        }
      }
      return { ...s, sessions }
    })
  }, [updateStore])

  const toggleStar = useCallback((id: string) => {
    updateStore(s => {
      const sessions = { ...s.sessions }
      for (const sid of Object.keys(sessions)) {
        const sess = sessions[sid]
        const idx = sess.entries.findIndex(e => e.entry_id === id)
        if (idx >= 0) {
          const entries = [...sess.entries]
          entries[idx] = { ...entries[idx], starred: !entries[idx].starred } as BetaPadEntry
          sessions[sid] = { ...sess, entries }
          break
        }
      }
      return { ...s, sessions }
    })
  }, [updateStore])

  const setEntryStatus = useCallback((id: string, status: EntryStatus) => {
    updateStore(s => {
      const sessions = { ...s.sessions }
      for (const sid of Object.keys(sessions)) {
        const sess = sessions[sid]
        const idx = sess.entries.findIndex(e => e.entry_id === id)
        if (idx >= 0) {
          const entries = [...sess.entries]
          entries[idx] = { ...entries[idx], status } as BetaPadEntry
          sessions[sid] = { ...sess, entries }
          break
        }
      }
      return { ...s, sessions }
    })
  }, [updateStore])

  // ─── Flow recording ───

  const startRecordingFlow = useCallback(() => {
    recordedActionsRef.current = []
    isRecordingFlowRef.current = true
    setIsRecordingFlow(true)
    setRecordedActions([])
  }, [])

  const stopRecordingFlow = useCallback((): RecordedAction[] => {
    isRecordingFlowRef.current = false
    setIsRecordingFlow(false)
    return [...recordedActionsRef.current]
  }, [])

  // ─── Panel controls ───

  const togglePanel = useCallback(() => {
    setPanel(p => ({ ...p, open: !p.open, collapsed: false }))
  }, [])

  const value: BetaPadContextValue = {
    store,
    currentSession,
    panel,
    consoleErrors,
    networkErrors,
    breadcrumb,
    recordedActions,
    isRecordingFlow,
    autoDetections,
    storageWarning,
    togglePanel,
    setCollapsed: (v) => setPanel(p => ({ ...p, collapsed: v })),
    setActiveTab: (tab) => setPanel(p => ({ ...p, activeTab: tab })),
    setPanelPosition: (pos) => setPanel(p => ({ ...p, position: pos })),
    setPanelSize: (size) => setPanel(p => ({ ...p, size: size })),
    setPinMode: (v) => setPanel(p => ({ ...p, pinMode: v })),
    addQuickNote,
    addBugReport,
    addFeatureRequest,
    updateEntry,
    deleteEntry,
    toggleStar,
    setEntryStatus,
    startRecordingFlow,
    stopRecordingFlow,
    sessionId,
  }

  return (
    <BetaPadContext.Provider value={value}>
      {children}
    </BetaPadContext.Provider>
  )
}
