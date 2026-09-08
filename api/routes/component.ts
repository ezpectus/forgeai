import { Hono } from 'hono'
import { regenerateComponent } from '@/lib/generate-component'
import type { AppEnv } from '../lib/env'
import type { ComponentSpec } from '@/types'

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  const token = c.get('auth') as string | null
  const body = await c.req.json<{
    projectId: string
    componentName: string
    currentCode: string
    instruction: string
    templateId?: string
  }>()

  if (!token) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  const auth = { openrouter: token }
  const templateId = body.templateId ?? 'website'

  try {
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    const raw = await readFile(
      join(process.cwd(), 'configs/templates', `${templateId}.json`),
      'utf-8'
    )
    const config = JSON.parse(raw) as ComponentSpec

    const result = await regenerateComponent(
      config,
      body.componentName,
      body.currentCode,
      body.instruction,
      auth
    )

    if (result.status === 'error') {
      return c.json({ error: result.error }, 500)
    }

    return c.json({ component: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
