export interface User {
  id: number
  email: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Location {
  id: number
  name: string
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

export interface LocationInput {
  name: string
  latitude: number
  longitude: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListParams {
  q: string
  page: number
  limit: number
}

export interface UploadResult {
  message: string
  totalRows: number
  inserted: number
  skippedDuplicates: number
}

/** Shape of every error the backend returns. */
export interface ApiErrorDetail {
  field?: string
  line?: number
  message: string
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: ApiErrorDetail[] }
}
