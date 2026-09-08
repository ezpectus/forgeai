import type { ComponentState, DeployFiles, IntentResult } from '@/types'

export function assembleProject(
  intent: IntentResult,
  components: ComponentState[],
  projectId: string
): DeployFiles {
  const files: DeployFiles = {}

  const sectionComponents = intent.sections
    .map((section) => {
      const name = section.name
      const component = components.find((c) => c.name === name)
      if (!component || component.status !== 'ready') return null
      return { name, code: component.code }
    })
    .filter(Boolean) as { name: string; code: string }[]

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
        next: '14.2.5',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.439.0',
        zustand: '^4.5.0',
        '@supabase/supabase-js': '^2.45.0',
      },
      devDependencies: {
        '@types/node': '^20.14.0',
        '@types/react': '^18.3.0',
        '@types/react-dom': '^18.3.0',
        typescript: '^5.5.0',
        tailwindcss: '^3.4.10',
        postcss: '^8.4.40',
        autoprefixer: '^10.4.20',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`

  const imports = sectionComponents
    .map((c) => `import ${c.name} from './components/sections/${c.name}'`)
    .join('\n')

  const rendered = sectionComponents
    .map(
      (c) =>
        `      <div data-component="${c.name}" onClick={() => window.parent.postMessage({ action: 'select', component: '${c.name}' }, '*')}>\n        <${c.name} />\n      </div>`
    )
    .join('\n')

  const formHandler = intent.dbRequired
    ? "\nimport { FormHandler } from '@/components/FormHandler'\n"
    : ''

  const formHandlerNode = intent.dbRequired ? '      <FormHandler />\n' : ''

  files['src/app/page.tsx'] =
    `'use client'\n\n${imports}${formHandler}\nexport default function HomePage() {\n  return (\n    <main className="min-h-screen">\n${rendered}${formHandlerNode}    </main>\n  )\n}\n`

  files['src/app/sitemap.ts'] = `import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: '${siteUrl}',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
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
