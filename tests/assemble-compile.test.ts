import { describe, expect, it } from 'vitest'
import { transform } from 'esbuild'
import { assembleProject } from '@/lib/assemble'
import type { ComponentState, IntentResult } from '@/types'

const intent: IntentResult = {
  type: 'landing',
  palette: 'calm',
  tone: 'friendly',
  style: 'modern',
  audience: 'general',
  dbRequired: true,
  dbForms: ['contact'],
  pages: ['index', 'about-us', 'empty-page'],
  sections: [
    { name: 'Hero', type: 'hero', description: 'h', priority: 1, page: 'index' },
    {
      name: 'AboutSection',
      type: 'section',
      description: 'a',
      priority: 2,
      page: 'about-us',
    },
  ],
}

const components: ComponentState[] = [
  {
    name: 'Hero',
    status: 'ready',
    version: 1,
    // Tricky img: `>` inside a braced expression — the lazy-load injector
    // used to mangle this into uncompilable JSX (S93).
    code: `export default function Hero(){ return <section><h1>Hi</h1><img src={1>0 ? "/a.png" : "/b.png"} alt="x"/></section> }`,
  },
  {
    name: 'AboutSection',
    status: 'ready',
    version: 1,
    code: `export default function AboutSection(){ return <section>About</section> }`,
  },
]

describe('assembleProject output', () => {
  const files = assembleProject(intent, components, 'test-proj-123')

  it('emits only compilable TS/TSX files', async () => {
    for (const [path, content] of Object.entries(files)) {
      if (!/\.(ts|tsx)$/.test(path)) continue
      await expect(
        transform(content, { loader: 'tsx' }),
        `${path} failed to transform`
      ).resolves.toBeTruthy()
    }
  })

  it('keeps the img attrs intact when a `>` appears inside a braced expr', () => {
    const hero = files['src/components/sections/Hero.tsx']
    expect(hero).toContain('src={1>0 ? "/a.png" : "/b.png"}')
    expect(hero).toContain('loading="lazy"')
    expect(hero).toContain('decoding="async"')
  })

  it('does not emit a declared page with no rendered sections', () => {
    expect(files['src/app/empty-page/page.tsx']).toBeUndefined()
    expect(files['src/app/about-us/page.tsx']).toBeDefined()
    expect(files['src/app/page.tsx']).toBeDefined()
  })

  it('names kebab-case pages with valid PascalCase components', () => {
    expect(files['src/app/about-us/page.tsx']).toContain(
      'export default function AboutUsPage()'
    )
  })

  it('gates editor affordances behind the embedded marker', () => {
    expect(files['src/app/globals.css']).toContain(
      '.forgeai-embedded [data-component]:hover'
    )
    expect(files['src/app/layout.tsx']).toContain('forgeai-embedded')
  })

  it('wires Supabase only when dbRequired is set', () => {
    expect(files['src/lib/supabase.ts']).toBeDefined()
    expect(files['supabase/migrations/001_submissions.sql']).toBeDefined()
    expect(files['package.json']).toContain('@supabase/supabase-js')
    expect(files['.env.local.example']).toContain('NEXT_PUBLIC_SUPABASE_URL')

    const noDb = assembleProject(
      { ...intent, dbRequired: false },
      components,
      'no-db'
    )
    expect(noDb['src/lib/supabase.ts']).toBeUndefined()
    expect(noDb['package.json']).not.toContain('@supabase/supabase-js')
    expect(noDb['.env.local.example']).toBeUndefined()
  })
})
