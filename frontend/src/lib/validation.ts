import type { LocationInput } from '../api/types'

/** Same rules as the backend zod schema, so most mistakes are caught before a request is sent. */
export const NAME_MAX = 100

export interface LocationFormValues {
  name: string
  latitude: string
  longitude: string
}

export type LocationFormErrors = Partial<Record<keyof LocationFormValues, string>>

const DECIMAL_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/

export function validateLocation(values: LocationFormValues): { errors: LocationFormErrors; input?: LocationInput } {
  const errors: LocationFormErrors = {}
  const name = values.name.trim()
  const lat = values.latitude.trim()
  const lng = values.longitude.trim()

  if (!name) errors.name = 'Name is required'
  else if (name.length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters`

  if (!lat) errors.latitude = 'Latitude is required'
  else if (!DECIMAL_RE.test(lat)) errors.latitude = 'Latitude must be a number'
  else if (Number(lat) < -90 || Number(lat) > 90) errors.latitude = 'Latitude must be between -90 and 90'

  if (!lng) errors.longitude = 'Longitude is required'
  else if (!DECIMAL_RE.test(lng)) errors.longitude = 'Longitude must be a number'
  else if (Number(lng) < -180 || Number(lng) > 180) errors.longitude = 'Longitude must be between -180 and 180'

  if (Object.keys(errors).length) return { errors }
  return { errors, input: { name, latitude: Number(lat), longitude: Number(lng) } }
}

export function validateCredentials(email: string, password: string) {
  const errors: { email?: string; password?: string } = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters'
  return errors
}
