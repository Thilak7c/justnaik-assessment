import axios from 'axios'
import type { ApiErrorBody } from './types'

const TOKEN_KEY = 'location_app_token'

/** Where the JWT lives in the browser. See README "Trade-offs" (localStorage vs httpOnly cookie). */
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/** One configured axios instance used by every API call. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000, // a hanging request turns into a visible error instead of an endless spinner
})

// Attach the token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type UnauthorizedHandler = (message: string) => void
let onUnauthorized: UnauthorizedHandler | null = null

/** AuthProvider registers a callback that logs the user out when the session is no longer valid. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

// A 401 on an authenticated request means the token expired or is invalid -> log out everywhere.
// (A 401 from /auth/login is just "wrong password" and is handled by the login form.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const sentToken = Boolean(error?.config?.headers?.Authorization)
    if (status === 401 && sentToken && onUnauthorized) {
      const body = error.response.data as ApiErrorBody | undefined
      onUnauthorized(
        body?.error?.code === 'TOKEN_EXPIRED'
          ? 'Your session has expired. Please log in again.'
          : 'Your session is no longer valid. Please log in again.',
      )
    }
    return Promise.reject(error)
  },
)
