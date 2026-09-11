'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  onClose?: () => void
}

function Toast({
  className,
  title,
  description,
  onClose,
  ...props
}: ToastProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full max-w-md rounded-md border bg-popover p-4 text-popover-foreground shadow-lg',
        className
      )}
      {...props}
    >
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export interface ToastData {
  id: string
  title?: string
  description?: string
}

interface ToastContextValue {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => void
  removeToast: (id: string) => void
}

export const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  return {
    toasts: ctx?.toasts ?? [],
    toast: ctx?.addToast ?? (() => undefined),
  }
}

const TOAST_TTL_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = React.useCallback(
    (toast: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...toast, id }])
      setTimeout(() => removeToast(id), TOAST_TTL_MS)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export { Toast }
