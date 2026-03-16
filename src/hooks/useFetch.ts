import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * In-flight request deduplication cache.
 * Multiple components requesting the same URL simultaneously
 * share a single fetch and receive the same result.
 */
const inflightCache = new Map<string, Promise<unknown>>()

/**
 * Simple response cache with TTL.
 * Prevents redundant network requests for data that was recently fetched.
 */
const responseCache = new Map<string, { data: unknown; timestamp: number }>()

const DEFAULT_TTL_MS = 30_000 // 30 seconds

function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method?.toUpperCase() || 'GET'
  return `${method}:${url}`
}

function deduplicatedFetch<T>(url: string, options?: RequestInit, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const key = getCacheKey(url, options)
  const method = options?.method?.toUpperCase() || 'GET'

  // Only cache GET requests
  if (method === 'GET') {
    const cached = responseCache.get(key)
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return Promise.resolve(cached.data as T)
    }
  }

  // Deduplicate in-flight requests
  const inflight = inflightCache.get(key)
  if (inflight) return inflight as Promise<T>

  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()
      if (method === 'GET') {
        responseCache.set(key, { data, timestamp: Date.now() })
      }
      return data as T
    })
    .finally(() => {
      inflightCache.delete(key)
    })

  inflightCache.set(key, promise)
  return promise
}

/** Evict cached response for a given URL (call after mutations). */
export function invalidateCache(url: string, method = 'GET') {
  const key = `${method}:${url}`
  responseCache.delete(key)
}

/** Evict all cached responses. */
export function clearCache() {
  responseCache.clear()
}

interface UseFetchOptions {
  headers?: Record<string, string>
  /** Cache TTL in ms. Default 30s. Set to 0 to disable caching. */
  ttlMs?: number
  /** Skip fetching until this is true. Useful for conditional fetching. */
  enabled?: boolean
}

interface UseFetchResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  refetch: () => void
}

/**
 * Hook for fetching API data with automatic caching and request deduplication.
 *
 * @example
 * const { data, loading, error } = useFetch<Lead[]>('/api/admin-leads', {
 *   headers: { 'X-Admin-Key': adminKey },
 * })
 */
export function useFetch<T = unknown>(
  url: string | null,
  options?: UseFetchOptions,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const fetchIdRef = useRef(0)

  const enabled = options?.enabled ?? true
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const headersJson = JSON.stringify(options?.headers || {})

  const doFetch = useCallback(() => {
    if (!url || !enabled) return

    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    deduplicatedFetch<T>(url, { headers: JSON.parse(headersJson) }, ttlMs)
      .then((result) => {
        if (mountedRef.current && id === fetchIdRef.current) {
          setData(result)
        }
      })
      .catch((err: Error) => {
        if (mountedRef.current && id === fetchIdRef.current) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (mountedRef.current && id === fetchIdRef.current) {
          setLoading(false)
        }
      })
  }, [url, enabled, ttlMs, headersJson])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = useCallback(() => {
    if (url) invalidateCache(url)
    doFetch()
  }, [url, doFetch])

  return { data, error, loading, refetch }
}
