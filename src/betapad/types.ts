// ═══════════════════════════════════════════════════════
//  BetaPad — Type Definitions
// ═══════════════════════════════════════════════════════

export type EntryType = 'note' | 'bug' | 'feature'

export type EntryStatus = 'new' | 'reviewing' | 'in-progress' | 'resolved' | 'wont-fix'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export type Severity = 'critical' | 'major' | 'minor' | 'cosmetic'

export type Tag =
  | 'bug' | 'ux-issue' | 'copy-edit' | 'flow-break' | 'feature-idea'
  | 'performance' | 'mobile' | 'accessibility' | 'critical' | 'visual'

export type ImpactTag = 'revenue' | 'conversion' | 'retention' | 'trust' | 'ux'

export type EffortGuess = 'quick-win' | 'medium' | 'large' | 'epic'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface BreadcrumbStep {
  url: string
  route: string
  page_title: string
  timestamp: string
  time_spent_seconds: number
}

export interface ViewportInfo {
  width: number
  height: number
}

export interface ScrollPosition {
  px: number
  percentage: number
}

export interface ConsoleError {
  message: string
  source?: string
  timestamp: string
  level: 'error' | 'warn'
}

export interface NetworkError {
  url: string
  method: string
  status: number
  statusText: string
  timestamp: string
}

export interface RecordedAction {
  type: 'click' | 'scroll' | 'route-change' | 'form-input' | 'keypress'
  timestamp: string
  target?: string // CSS selector
  value?: string  // route for navigation, scroll position, input value summary
  coordinates?: { x: number; y: number }
}

export interface ReproStep {
  id: string
  text: string
}

// ─── Auto-captured metadata on every entry ───

export interface EntryMetadata {
  entry_id: string
  entry_type: EntryType
  session_id: string
  timestamp: string
  timestamp_human: string
  url: string
  route: string
  page_title: string
  h1_content: string | null
  viewport: ViewportInfo
  scroll_position: ScrollPosition
  device_type: DeviceType
  user_agent: string
  referrer_route: string
  time_on_page: number // seconds
  flow_breadcrumb: BreadcrumbStep[]
  console_errors: ConsoleError[]
  network_errors: NetworkError[]
  dom_selector: string | null
  screenshot_data: string | null // base64
  sequential_number: number
}

// ─── Entry types ───

export interface QuickNote extends EntryMetadata {
  entry_type: 'note'
  text: string
  tags: Tag[]
  priority: Priority
  starred: boolean
  status: EntryStatus
  emoji_reaction?: string
  audio_data?: string // base64 audio
  variant_tag?: 'A' | 'B' | null
}

export interface BugReport extends EntryMetadata {
  entry_type: 'bug'
  title: string
  steps_to_reproduce: ReproStep[]
  expected_behavior: string
  actual_behavior: string
  severity: Severity
  priority: Priority
  tags: Tag[]
  recorded_actions: RecordedAction[]
  starred: boolean
  status: EntryStatus
  variant_tag?: 'A' | 'B' | null
}

export interface FeatureRequest extends EntryMetadata {
  entry_type: 'feature'
  title: string
  description: string
  user_story: string
  impact_tags: ImpactTag[]
  effort_guess: EffortGuess
  competitive_note: string
  tags: Tag[]
  priority: Priority
  starred: boolean
  status: EntryStatus
  variant_tag?: 'A' | 'B' | null
}

export type BetaPadEntry = QuickNote | BugReport | FeatureRequest

// ─── Session ───

export interface BetaPadSession {
  session_id: string
  started: string
  ended: string | null
  device: DeviceType
  entries: BetaPadEntry[]
  flow_breadcrumb: BreadcrumbStep[]
  total_pages_visited: number
  total_time: number // seconds
}

export interface BetaPadStore {
  sessions: Record<string, BetaPadSession>
}

// ─── UI State ───

export type BetaPadTab = 'note' | 'bug' | 'feature' | 'session-log'

export interface PanelState {
  open: boolean
  collapsed: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  activeTab: BetaPadTab
  pinMode: boolean
  recordingFlow: boolean
  voiceRecording: boolean
}

// ─── Testing Checklist ───

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  notes: string[]
  entry_ids: string[] // linked BetaPad entries
}

export interface TestingChecklist {
  id: string
  name: string
  items: ChecklistItem[]
  created: string
}

// ─── Smart Detection ───

export interface AutoDetection {
  type: 'slow-load' | 'cls' | 'js-error' | 'rage-click' | 'network-fail'
  timestamp: string
  details: string
  page: string
  auto_entry_id?: string // if auto-created an entry
}

// ─── Session Log Filters ───

export interface SessionLogFilters {
  type: EntryType | 'all'
  tag: Tag | 'all'
  priority: Priority | 'all'
  search: string
  starred: boolean
}
