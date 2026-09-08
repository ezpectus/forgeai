import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'ForgeAI',
    template: '%s | ForgeAI',
  },
  description: 'Open-source prompt-to-live-URL generator. BYOK, self-hostable, MIT licensed.',
  metadataBase: new URL('https://forgeai.dev'),
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'ForgeAI',
    description: 'Open-source prompt-to-live-URL generator',
    type: 'website',
  },
}

const themeScript = `
  (function() {
    const theme = localStorage.getItem('forgeai-theme') || 'system';
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  })();
`

/**
 * Root layout that sets the font, injects the anti-flicker theme script,
 * and wraps every page in the global providers.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* prettier-ignore */} {/* security-scan:ignore inline theme script, no user input */} <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
