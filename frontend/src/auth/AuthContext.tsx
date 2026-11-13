import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler, tokenStorage } from '../api/client'
import { authApi } from '../api/endpoints'
import type { User } from '../api/types'
import { getTokenExpiry } from '../lib/jwt'

type Status = 'checking' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: User | null
  /** Message shown on the login page after an automatic logout (e.g. session expired). */
  notice: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: (notice?: string) => void
  clearNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'checking' : 'anonymous'))
  const [notice, setNotice] = useState<string | null>(null)

  const logout = useCallback(
    (message?: string) => {
      tokenStorage.clear()
      // Drop every cached query so the next user who logs in on this browser never sees this user's data.
      queryClient.clear()
      setToken(null)
      setUser(null)
      setStatus('anonymous')
      setNotice(message ?? null)
    },
    [queryClient],
  )

  const startSession = useCallback((newToken: string, newUser: User) => {
    tokenStorage.set(newToken)
    setToken(newToken)
    setUser(newUser)
    setStatus('authenticated')
    setNotice(null)
  }, [])

  // Any 401 from the API (expired/invalid token) logs the user out with a message.
  useEffect(() => {
    setUnauthorizedHandler((message) => logout(message))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // On page load, check that a stored token is still valid.
  useEffect(() => {
    if (status !== 'checking' || !token) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (!cancelled) {
          setUser(me)
          setStatus('authenticated')
        }
      })
      .catch((err) => {
        if (cancelled) return
        // A 401 was already handled by the API interceptor (it logged out with a message).
        if (axios.isAxiosError(err) && err.response?.status === 401) return
        logout('Could not verify your session (server unreachable). Please log in again.')
      })
    return () => {
      cancelled = true
    }
  }, [status, token, logout])

  // Log out exactly when the token expires, even if the user is idle.
  useEffect(() => {
    if (!token) return
    const expiresAt = getTokenExpiry(token)
    if (!expiresAt) return
    const ms = expiresAt - Date.now()
    if (ms <= 0) {
      logout('Your session has expired. Please log in again.')
      return
    }
    const timer = window.setTimeout(() => logout('Your session has expired. Please log in again.'), Math.min(ms, 2_147_000_000))
    return () => window.clearTimeout(timer)
  }, [token, logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      notice,
      login: async (email, password) => {
        const res = await authApi.login(email, password)
        startSession(res.token, res.user)
      },
      register: async (email, password) => {
        const res = await authApi.register(email, password)
        startSession(res.token, res.user)
      },
      logout,
      clearNotice: () => setNotice(null),
    }),
    [status, user, notice, logout, startSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
