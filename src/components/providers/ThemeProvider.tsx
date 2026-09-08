'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('forgeai-theme') as Theme | null
    const initial = saved ?? 'system'
    setThemeState(initial)
    setResolvedTheme(resolveTheme(initial))
  }, [])

  useEffect(() => {
    if (!mounted) return
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    localStorage.setItem('forgeai-theme', theme)
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted || theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () =>
      setResolvedTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme, mounted])

  const setTheme = (next: Theme) => setThemeState(next)

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
