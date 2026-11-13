import axios from 'axios'
import type { ApiErrorBody, ApiErrorDetail } from './types'

/** Turns any thrown value into a message that is safe and useful to show to the user. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'The server is taking too long to respond. Please try again.'
    }
    if (!error.response) {
      return 'Cannot reach the server. Check your connection and try again.'
    }
    const body = error.response.data as Partial<ApiErrorBody> | undefined
    return body?.error?.message ?? fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function getErrorDetails(error: unknown): ApiErrorDetail[] {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    return body?.error?.details ?? []
  }
  return []
}

/** { name: 'Name is required', latitude: '...' } from a 422 response. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of getErrorDetails(error)) {
    if (d.field && !out[d.field]) out[d.field] = d.message
  }
  return out
}
