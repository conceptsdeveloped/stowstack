/**
 * StowStack Plugin System
 *
 * Initializes all third-party integrations based on environment variables.
 * Each plugin is opt-in: if the env var is missing, the plugin is silently skipped.
 */

import { initPostHog } from './posthog'
import { initUmami } from './umami'
import { initChatwoot } from './chatwoot'
import { initCalcom } from './calcom'
import { initFormbricks } from './formbricks'
import { initNovu } from './novu'
import { initLangfuse } from './langfuse'

export interface PluginStatus {
  name: string
  enabled: boolean
  error?: string
}

const results: PluginStatus[] = []

function register(name: string, init: () => void, envKey: string) {
  const value = import.meta.env[envKey]
  if (!value) {
    results.push({ name, enabled: false })
    return
  }
  try {
    init()
    results.push({ name, enabled: true })
  } catch (err) {
    results.push({ name, enabled: false, error: (err as Error).message })
    console.warn(`[StowStack] Plugin "${name}" failed to initialize:`, err)
  }
}

export function initPlugins() {
  register('PostHog', initPostHog, 'VITE_POSTHOG_KEY')
  register('Umami', initUmami, 'VITE_UMAMI_WEBSITE_ID')
  register('Chatwoot', initChatwoot, 'VITE_CHATWOOT_TOKEN')
  register('Cal.com', initCalcom, 'VITE_CALCOM_LINK')
  register('Formbricks', initFormbricks, 'VITE_FORMBRICKS_ENV_ID')
  register('Novu', initNovu, 'VITE_NOVU_API_KEY')
  register('Langfuse', initLangfuse, 'VITE_LANGFUSE_PUBLIC_KEY')

  if (import.meta.env.DEV) {
    const enabled = results.filter(r => r.enabled).map(r => r.name)
    const disabled = results.filter(r => !r.enabled).map(r => r.name)
    console.log('[StowStack Plugins]', { enabled, disabled })
  }

  return results
}

export function getPluginStatus(): PluginStatus[] {
  return [...results]
}
