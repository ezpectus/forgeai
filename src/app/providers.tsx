'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider, Toaster } from '@/components/ui/toaster'

/**
 * Compose all global client providers: theme, toast notifications.
 * Wrapped by the root layout so every page has access to them.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        <Toaster />
      </ToastProvider>
    </ThemeProvider>
  )
}
