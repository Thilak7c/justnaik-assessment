import { api } from './client'
import type { AuthResponse, ListParams, Location, LocationInput, Paginated, UploadResult, User } from './types'

/** All HTTP calls live here, so components never build URLs themselves. */

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, password }).then((r) => r.data),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
}

export const locationsApi = {
  // `signal` lets React Query cancel a request that is no longer needed (e.g. user kept typing).
  list: (params: ListParams, signal?: AbortSignal) =>
    api.get<Paginated<Location>>('/locations', { params, signal }).then((r) => r.data),
  create: (input: LocationInput) => api.post<Location>('/locations', input).then((r) => r.data),
  update: (id: number, input: LocationInput) => api.put<Location>(`/locations/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/locations/${id}`).then(() => undefined),
}

export const uploadApi = {
  uploadZip: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<UploadResult>('/uploads', form, {
        timeout: 60_000,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      .then((r) => r.data)
  },
}
