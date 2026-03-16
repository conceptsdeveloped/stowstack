import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AuthState, Organization } from '../components/partner/PartnerTypes'

const STORAGE_KEY = 'stowstack_partner'

interface AuthContextValue {
  /** Current auth state (null = not logged in) */
  auth: AuthState | null
  /** True while validating stored token on mount */
  isLoading: boolean
  /** Login with data returned from /api/organizations POST login */
  login: (data: AuthState) => void
  /** Clear session and redirect to login */
  logout: () => Promise<void>
  /** Update the cached organization data */
  updateOrg: (org: Organization) => void
  /**
   * Fetch wrapper that auto-attaches Authorization header.
   * On 401, triggers logout automatically.
   */
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, validate stored token via /api/auth/me
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setIsLoading(false)
      return
    }

    let parsed: AuthState
    try {
      parsed = JSON.parse(stored)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setIsLoading(false)
      return
    }

    // Validate the token with the server
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${parsed.token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('invalid')
        return res.json()
      })
      .then(data => {
        // Refresh cached data from server
        const refreshed: AuthState = {
          token: parsed.token,
          user: data.user,
          organization: data.organization,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed))
        setAuth(refreshed)
      })
      .catch(() => {
        // Token invalid — clear it
        localStorage.removeItem(STORAGE_KEY)
        setAuth(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback((data: AuthState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setAuth(data)
  }, [])

  const logout = useCallback(async () => {
    const token = auth?.token
    setAuth(null)
    localStorage.removeItem(STORAGE_KEY)

    // Tell server to destroy session (fire-and-forget)
    if (token) {
      fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'logout' }),
      }).catch(() => {})
    }
  }, [auth?.token])

  const updateOrg = useCallback((org: Organization) => {
    setAuth(prev => {
      if (!prev) return prev
      const updated = { ...prev, organization: org }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const authFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const token = auth?.token
    const headers = new Headers(init?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const res = await fetch(url, { ...init, headers })

    // Auto-logout on 401
    if (res.status === 401 && token) {
      setAuth(null)
      localStorage.removeItem(STORAGE_KEY)
    }

    return res
  }, [auth?.token])

  return (
    <AuthContext.Provider value={{ auth, isLoading, login, logout, updateOrg, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}
