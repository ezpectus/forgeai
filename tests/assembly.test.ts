import { describe, expect, it } from 'vitest'
import { assembleProject } from '@/lib/assemble'
import type { ComponentState, IntentResult } from '@/types'

const intent: IntentResult = {
  type: 'landing',
  sections: [
    { name: 'hero', type: 'hero', description: 'Main headline', priority: 1 },
  ],
  palette: 'slate',
  dbRequired: false,
  dbForms: [],
  pages: ['index'],
  audience: 'general',
  tone: 'professional',
  style: 'modern',
}

const components: ComponentState[] = [
  {
    name: 'hero',
    status: 'ready',
    version: 1,
    code: 'export default function Hero() { return <div data-testid="hero">Hero</div> }',
  },
]

describe('assembleProject', () => {
  it('creates a package.json with the project name', () => {
    const files = assembleProject(intent, components, 'test-p1')
    expect(files['package.json']).toContain('forgeai-test-p1')
  })

  it('includes a page with the rendered component', () => {
    const files = assembleProject(intent, components, 'test-p2')
    expect(files['src/app/page.tsx']).toContain('import hero')
    expect(files['src/app/page.tsx']).toContain('data-component="hero"')
  })

  it('includes standard config files', () => {
    const files = assembleProject(intent, components, 'test-p3')
    expect(files['tsconfig.json']).toBeTruthy()
    expect(files['tailwind.config.ts']).toBeTruthy()
    expect(files['postcss.config.js']).toBeTruthy()
    expect(files['src/app/layout.tsx']).toBeTruthy()
  })
})
