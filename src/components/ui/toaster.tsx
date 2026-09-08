'use client'

import { Toast, ToastProvider, useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

function Toaster({ className }: { className?: string }) {
  const { toasts } = useToast()
  return (
    <div
      className={cn(
        'fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4',
        className
      )}
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          onClose={() => undefined}
        />
      ))}
    </div>
  )
}

export { ToastProvider, Toaster, useToast }
