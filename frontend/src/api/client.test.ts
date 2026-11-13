import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, setUnauthorizedHandler, tokenStorage } from './client'
import { getErrorMessage } from './errors'

/** Runs a request through the real interceptors with a fake adapter that returns `status`. */
function requestWithStatus(status: number, data: unknown, url = '/locations') {
  return api.get(url, {
    adapter: (config: InternalAxiosRequestConfig) =>
      Promise.reject(new AxiosError('fail', 'ERR', config, null, { status, statusText: '', headers: {}, config, data })),
  })
}

describe('api client', () => {
  afterEach(() => setUnauthorizedHandler(null))

  it('attaches the stored token as a Bearer header', async () => {
    tokenStorage.set('abc.def.ghi')
    let sentAuth: unknown
    await api.get('/x', {
      adapter: async (config) => {
        sentAuth = config.headers.Authorization
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    expect(sentAuth).toBe('Bearer abc.def.ghi')
  })

  it('logs the user out with a message when the token has expired', async () => {
    tokenStorage.set('expired.token.value')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    await expect(requestWithStatus(401, { error: { code: 'TOKEN_EXPIRED', message: 'expired' } })).rejects.toBeTruthy()
    expect(handler).toHaveBeenCalledWith('Your session has expired. Please log in again.')
  })

  it('does not log out on a 401 from an anonymous request (e.g. wrong password on login)', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    await expect(requestWithStatus(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, '/auth/login')).rejects.toBeTruthy()
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('getErrorMessage', () => {
  it('uses the API error message', () => {
    const headers = new AxiosHeaders()
    const err = new AxiosError('x', 'ERR', { headers }, null, {
      status: 422,
      statusText: '',
      headers: {},
      config: { headers },
      data: { error: { code: 'VALIDATION_ERROR', message: 'Latitude must be between -90 and 90' } },
    })
    expect(getErrorMessage(err)).toBe('Latitude must be between -90 and 90')
  })

  it('explains network failures and timeouts', () => {
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(/Cannot reach the server/)
    expect(getErrorMessage(new AxiosError('timeout', 'ECONNABORTED'))).toMatch(/taking too long/)
  })
})
