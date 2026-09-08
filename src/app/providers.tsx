'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ToastProvider, Toaster } from '@/components/ui/toaster'

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
