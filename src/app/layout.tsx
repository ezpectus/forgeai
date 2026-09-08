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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
