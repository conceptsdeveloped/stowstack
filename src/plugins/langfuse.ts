/**
 * Langfuse — Open source LLM observability
 * Free tier: 50K observations/mo
 * https://langfuse.com
 *
 * Tracks AI interactions (copy generation, diagnostics) for quality monitoring.
 * Client-side module for browser-initiated AI calls.
 * For server-side (API routes), use the langfuse Node SDK directly.
 */

let initialized = false

interface LangfuseConfig {
  publicKey: string
  baseUrl: string
}

let config: LangfuseConfig | null = null

interface TraceData {
  id: string
  name: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
  startTime: string
  endTime?: string
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'
}

const traces: TraceData[] = []

export function initLangfuse() {
  const publicKey = import.meta.env.VITE_LANGFUSE_PUBLIC_KEY
  const baseUrl = import.meta.env.VITE_LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'

  if (!publicKey || initialized) return
  initialized = true

  config = { publicKey, baseUrl }
}

// ── Trace Creation ──

export function createTrace(name: string, metadata?: Record<string, unknown>): string {
  const id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  traces.push({
    id,
    name,
    metadata,
    startTime: new Date().toISOString(),
  })
  return id
}

export function endTrace(traceId: string, output?: unknown, level?: TraceData['level']) {
  const trace = traces.find(t => t.id === traceId)
  if (!trace) return

  trace.output = output
  trace.endTime = new Date().toISOString()
  if (level) trace.level = level

  // Flush to Langfuse
  flushTrace(trace)
}

// ── Flush to API ──

async function flushTrace(trace: TraceData) {
  if (!config) return

  try {
    await fetch(`${config.baseUrl}/api/public/ingestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.publicKey}`,
      },
      body: JSON.stringify({
        batch: [
          {
            id: trace.id,
            type: 'trace-create',
            timestamp: trace.startTime,
            body: {
              id: trace.id,
              name: trace.name,
              input: trace.input,
              output: trace.output,
              metadata: trace.metadata,
              level: trace.level,
            },
          },
        ],
      }),
    })
  } catch {
    // Silent failure — observability shouldn't break the app
  }
}

// ── StowStack-specific Wrappers ──

/** Track AI copy generation requests */
export function traceCopyGeneration(prompt: string, facilityId: string): string {
  return createTrace('generate-copy', {
    facilityId,
    promptLength: prompt.length,
    source: 'client',
  })
}

/** Track AI diagnostic analysis */
export function traceDiagnostic(facilityId: string): string {
  return createTrace('facility-diagnostic', {
    facilityId,
    source: 'client',
  })
}

/** Track AI chat interactions */
export function traceChatMessage(facilityId: string, messageType: 'user' | 'assistant'): string {
  return createTrace('chat-message', {
    facilityId,
    messageType,
    source: 'client',
  })
}

export function isLangfuseEnabled(): boolean {
  return initialized
}
