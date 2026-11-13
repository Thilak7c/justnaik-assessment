import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

/** Minimal toast notifications for success messages ("Location added", "Upload complete"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-2 text-sm text-white shadow-lg ${t.tone === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
