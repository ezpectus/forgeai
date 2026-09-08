import { describe, expect, it } from 'vitest'
import { validateComponent } from '@/lib/validate'

const validComponent = `
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <section>
      <img alt="hero" src="/hero.png" />
      <Button>Get started</Button>
    </section>
  )
}
`

describe('validateComponent', () => {
  it('passes a valid component', async () => {
    const result = await validateComponent(
      'hero',
      validComponent,
      ['syntax', 'hasDefaultExport', 'imagesHaveAlt'],
      { allowed: ['@/components/ui/button'] }
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('fails syntax errors', async () => {
    const result = await validateComponent(
      'hero',
      'export default function Hero() { return <div }',
      ['syntax'],
      {}
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('syntax'))).toBe(true)
  })

  it('fails forbidden imports', async () => {
    const result = await validateComponent(
      'hero',
      "import fs from 'fs'\nexport default function Hero() { return <div /> }",
      ['noForbiddenImports'],
      { forbidden: ['fs'] }
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('forbidden'))).toBe(true)
  })

  it('fails eval', async () => {
    const result = await validateComponent(
      'hero',
      'export default function Hero() { eval("alert(1)") }', // security-scan:ignore test fixture
      ['noEval'],
      {}
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('eval'))).toBe(true)
  })

  it('fails missing default export', async () => {
    const result = await validateComponent(
      'hero',
      'export function Hero() { return <div /> }',
      ['hasDefaultExport'],
      {}
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('default export'))).toBe(true)
  })
})
