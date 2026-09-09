import { readFileSync } from 'fs'
import { join } from 'path'
import type { ComponentState, DeployFiles, IntentResult } from '@/types'

function getHostVersions() {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const deps = pkg.dependencies ?? {}
    const devDeps = pkg.devDependencies ?? {}

    return {
      next: deps.next ?? '16.3.4',
      react: deps.react ?? '^18.3.1',
      'react-dom': deps['react-dom'] ?? '^18.3.1',
      'lucide-react': deps['lucide-react'] ?? '^0.439.0',
      zustand: deps.zustand ?? '^4.5.0',
      '@supabase/supabase-js': deps['@supabase/supabase-js'] ?? '^2.45.0',
      '@types/node': devDeps['@types/node'] ?? '^20.14.0',
      '@types/react': devDeps['@types/react'] ?? '^18.3.0',
      '@types/react-dom': devDeps['@types/react-dom'] ?? '^18.3.0',
      typescript: devDeps.typescript ?? '^5.5.0',
      tailwindcss: devDeps.tailwindcss ?? '^3.4.10',
      postcss: devDeps.postcss ?? '^8.4.40',
      autoprefixer: devDeps.autoprefixer ?? '^10.4.20',
    }
  } catch {
    return {
      next: '16.3.4',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'lucide-react': '^0.439.0',
      zustand: '^4.5.0',
      '@supabase/supabase-js': '^2.45.0',
      '@types/node': '^20.14.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      typescript: '^5.5.0',
      tailwindcss: '^3.4.10',
      postcss: '^8.4.40',
      autoprefixer: '^10.4.20',
    }
  }
}

/**
 * Turn the analyzed intent and validated component code into a complete,
 * deployable Next.js project, including configs, pages, and optional
 * database wiring when forms are detected.
 */
export function assembleProject(
  intent: IntentResult,
  components: ComponentState[],
  projectId: string
): DeployFiles {
  const files: DeployFiles = {}
  const versions = getHostVersions()

  const sectionComponents = intent.sections
    .map((section) => {
      const name = section.name
      const component = components.find((c) => c.name === name)
      if (!component || component.status !== 'ready') return null
      return {
        name,
        page: section.page ?? 'index',
        code: component.code.replace(
          /<img\b([^>]*)>/gi,
          (_match: string, attrs: string) => {
            let a = attrs.trim()
            if (!/\bloading\s*=/.test(a)) a += ' loading="lazy"'
            if (!/\bdecoding\s*=/.test(a)) a += ' decoding="async"'
            return `<img ${a.trim()} />`.replace(/  +/g, ' ')
          }
        ),
      }
    })
    .filter(Boolean) as { name: string; page: string; code: string }[]

  files['package.json'] = JSON.stringify(
    {
      name: `forgeai-${projectId}`,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies: {
        next: versions.next,
        react: versions.react,
        'react-dom': versions['react-dom'],
        'lucide-react': versions['lucide-react'],
        zustand: versions.zustand,
        '@supabase/supabase-js': versions['@supabase/supabase-js'],
      },
      devDependencies: {
        '@types/node': versions['@types/node'],
        '@types/react': versions['@types/react'],
        '@types/react-dom': versions['@types/react-dom'],
        typescript: versions.typescript,
        tailwindcss: versions.tailwindcss,
        postcss: versions.postcss,
        autoprefixer: versions.autoprefixer,
      },
    },
    null,
    2
  )

  files['tsconfig.json'] = JSON.stringify(
    {
      compilerOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2
  )

  files['tailwind.config.ts'] = `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
`

  files['postcss.config.js'] = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`

  files['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  poweredByHeader: false,
}

module.exports = nextConfig
`

  files['src/app/globals.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

[data-component] {
  position: relative;
}

[data-component]:hover {
  outline: 2px dashed hsl(var(--primary));
  outline-offset: -2px;
}
`

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  files['src/app/layout.tsx'] = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/Nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectId}',
  description: 'Generated by ForgeAI',
  openGraph: {
    title: '${projectId}',
    description: 'Generated by ForgeAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${projectId}',
    description: 'Generated by ForgeAI',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '${projectId}',
  description: 'Generated by ForgeAI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={inter.className}>
        <Nav />
        {children}
      </body>
    </html>
  )
}
`

  const pages = Array.from(new Set([...(intent.pages ?? []), ...sectionComponents.map((c) => c.page)]))

  function pagePath(page: string) {
    return page === 'index' ? 'src/app/page.tsx' : `src/app/${page}/page.tsx`
  }

  function pageRoute(page: string) {
    return page === 'index' ? '/' : `/${page}`
  }

  files['src/components/Nav.tsx'] = `'use client'

export function Nav() {
  const pages = ${JSON.stringify(pages)}
  const labels: Record<string, string> = { index: 'Home' }
  for (const page of pages) {
    if (page !== 'index') labels[page] = page.charAt(0).toUpperCase() + page.slice(1)
  }

  return (
    <nav className="border-b bg-background px-6 py-3">
      <ul className="flex gap-4">
        {pages.map((page) => (
          <li key={page}>
            <a
              href={page === 'index' ? '/' : \`/\${page}\`}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              {labels[page] ?? page}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
`

  const formHandler = intent.dbRequired
    ? "\nimport { FormHandler } from '@/components/FormHandler'\n"
    : ''

  const formHandlerNode = intent.dbRequired ? '      <FormHandler />\n' : ''

  function buildImports(sections: typeof sectionComponents) {
    return sections
      .map((c) => `import ${c.name} from '../components/sections/${c.name}'`)
      .filter((value, index, self) => self.indexOf(value) === index)
      .join('\n')
  }

  function buildRendered(sections: typeof sectionComponents) {
    return sections
      .map(
        (c) =>
          `      <div data-component="${c.name}" onClick={() => window.parent.postMessage({ action: 'select', component: '${c.name}' }, '*')}>
        <${c.name} />
      </div>`
      )
      .join('\n')
  }

  files['src/lib/analytics.ts'] = `export interface AnalyticsEvent {
  id: string
  type: 'page_view' | 'form_submit' | 'conversion'
  timestamp: number
  data?: Record<string, unknown>
}

const STORAGE_KEY = 'forgeai_analytics'

function generateId(): string {
  return \`\${Date.now()}-\${Math.random().toString(36).slice(2, 9)}\`
}

function loadEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
}

function saveEvents(events: AnalyticsEvent[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-1000)))
}

export function trackEvent(type: AnalyticsEvent['type'], data?: Record<string, unknown>) {
  const events = loadEvents()
  events.push({ id: generateId(), type, timestamp: Date.now(), data })
  saveEvents(events)
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path })
}

export function trackFormSubmit(formName: string) {
  trackEvent('form_submit', { form: formName })
}
`

  for (const page of pages) {
    const sectionsForPage = sectionComponents.filter((c) => c.page === page)
    const pageImports = buildImports(sectionsForPage)
    const pageRendered = buildRendered(sectionsForPage)
    const path = pagePath(page)
    const route = pageRoute(page)
    const pageName =
      page === 'index' ? 'HomePage' : `${page.charAt(0).toUpperCase() + page.slice(1)}Page`

    files[path] =
      `'use client'\n\nimport { useEffect } from 'react'\n${pageImports}${formHandler}\nimport { trackPageView, trackFormSubmit } from '@/lib/analytics'\n\nexport default function ${pageName}() {\n  useEffect(() => {\n    trackPageView('${route}')\n  }, [])\n\n  function handleFormSubmit(name: string) {\n    trackFormSubmit(name)\n  }\n\n  return (\n    <main className="min-h-screen" onSubmit={(e) => {\n      const form = e.target as HTMLFormElement\n      if (form.dataset.form) handleFormSubmit(form.dataset.form)\n    }}>\n${pageRendered}${formHandlerNode}    </main>\n  )\n}\n`
  }

  const sitemapEntries = pages
    .map(
      (page) => `    {
      url: '${siteUrl}${pageRoute(page)}',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: ${page === 'index' ? 1 : 0.8},
    }`
    )
    .join(',\n')

  files['src/app/sitemap.ts'] = `import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${sitemapEntries}
  ]
}
`

  files['src/app/robots.ts'] = `import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: '${siteUrl}/sitemap.xml',
  }
}
`

  for (const component of sectionComponents) {
    files[`src/components/sections/${component.name}.tsx`] = component.code
  }

  if (intent.dbRequired) {
    files['src/lib/supabase.ts'] =
      `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseKey)
`

    files['src/components/FormHandler.tsx'] = `'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function FormHandler() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID ?? 'forgeai'

    const handler = async (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      const name = form.dataset.form

      if (!name) return

      event.preventDefault()

      const formData = new FormData(form)
      const data: Record<string, FormDataEntryValue> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })

      const { error } = await supabase
        .from(\`ai_gen_\${projectId}_\${name}\`)
        .insert(data)

      if (error) {
        setMessage(\`Submission failed: \${error.message}\`)
      } else {
        setMessage('Submitted successfully!')
        form.reset()
      }

      setTimeout(() => setMessage(null), 4000)
    }

    document.addEventListener('submit', handler as EventListener)
    return () => document.removeEventListener('submit', handler as EventListener)
  }, [])

  if (!message) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded border bg-background p-3 shadow">
      {message}
    </div>
  )
}
`
  }

  files['.env.local.example'] =
    `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PROJECT_ID=${projectId}
`

  files['README.md'] = `# ForgeAI Project: ${projectId}

This project was generated by ForgeAI.

## Getting Started

\`\`\`bash
npm install
npm run build
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`

  return files
}
