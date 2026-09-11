import { describe, expect, it } from 'vitest'
import app from '../api/routes/assemble'

const hero = {
  name: 'Hero',
  status: 'ready',
  version: 1,
  code: 'export default function Hero() { return <section><h1>Hi</h1></section> }',
}

function post(body: unknown) {
  return app.fetch(
    // The sub-app mounts this handler at '/' (main.ts routes /api/assemble → app).
    new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/assemble', () => {
  it('rebuilds a project file map', async () => {
    const res = await post({
      intent: {
        type: 'landing',
        sections: [{ name: 'Hero', page: 'index' }],
        pages: ['index'],
      },
      components: [hero],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { files: Record<string, string> }
    expect(data.files['src/app/page.tsx']).toBeTruthy()
    expect(data.files['src/components/sections/Hero.tsx']).toBeTruthy()
  })

  it('sanitizes traversal in client-supplied section names/pages', async () => {
    const res = await post({
      intent: {
        type: 'landing',
        sections: [{ name: 'Hero', page: '../../evil' }],
        pages: ['index', '../../evil'],
      },
      components: [hero],
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as { files: Record<string, string> }
    const paths = Object.keys(data.files)
    expect(paths.some((p) => p.includes('..'))).toBe(false)
    expect(paths).toContain('src/app/evil/page.tsx')
  })

  it('rejects missing intent/components', async () => {
    expect((await post({})).status).toBe(400)
    expect((await post({ intent: { sections: [] }, components: [] })).status).toBe(400)
    expect((await post({ intent: { sections: [{ name: 'x' }] }, components: [{ name: 'x' }] })).status).toBe(400)
  })
})
