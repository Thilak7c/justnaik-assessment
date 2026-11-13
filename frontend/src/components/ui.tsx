import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Small reusable building blocks shared by every page. */

export function Spinner({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-sm text-slate-500 ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
      {label && <span>{label}</span>}
    </span>
  )
}

type AlertTone = 'error' | 'success' | 'info' | 'warning'
const toneClasses: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function Alert({ tone = 'info', children, action }: { tone?: AlertTone; children: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${toneClasses[tone]}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputClass = (hasError?: boolean) =>
  `block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
    hasError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
  }`
