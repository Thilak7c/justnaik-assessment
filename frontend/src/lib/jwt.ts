/**
 * Reads the `exp` claim of a JWT (seconds since epoch) WITHOUT verifying it.
 * Only used for UX (logging out right when the token expires). The backend still verifies every request.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}
