import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage, getFieldErrors } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Field, inputClass } from '../components/ui'
import { validateCredentials } from '../lib/validation'

/** Shared page for /login and /register. */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login'
  const { login, register, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/map'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (inFlight.current) return
    const clientErrors: Record<string, string | undefined> = isLogin
      ? { email: email.trim() ? undefined : 'Email is required', password: password ? undefined : 'Password is required' }
      : { ...validateCredentials(email, password), confirm: password === confirm ? undefined : 'Passwords do not match' }
    setErrors(clientErrors)
    setServerError(null)
    if (Object.values(clientErrors).some(Boolean)) return

    inFlight.current = true
    setSubmitting(true)
    clearNotice()
    try {
      await (isLogin ? login(email, password) : register(email, password))
      navigate(from, { replace: true })
    } catch (err) {
      setErrors(getFieldErrors(err))
      setServerError(getErrorMessage(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-2xl">📍</p>
          <h1 className="text-xl font-semibold">{isLogin ? 'Log in' : 'Create an account'}</h1>
          <p className="text-sm text-slate-500">{isLogin ? 'Manage your saved locations.' : 'Start saving locations on a map.'}</p>
        </div>

        {notice && <Alert tone="warning">{notice}</Alert>}
        {serverError && <Alert tone="error">{serverError}</Alert>}

        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" className={inputClass(!!errors.email)} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint={isLogin ? undefined : 'At least 8 characters'}>
          <input
            id="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className={inputClass(!!errors.password)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {!isLogin && (
          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
            <input id="confirm" type="password" autoComplete="new-password" className={inputClass(!!errors.confirm)} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? (isLogin ? 'Logging in…' : 'Creating account…') : isLogin ? 'Log in' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          {isLogin ? (
            <>
              No account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:underline">
                Register
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:underline">
                Log in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
