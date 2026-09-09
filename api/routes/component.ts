import { Hono } from 'hono'
import { regenerateComponent } from '@/lib/generate-component'
import type { AppEnv } from '../lib/env'
import type { ComponentSpec } from '@/types'

async function loadTemplateConfig(templateId: string): Promise<ComponentSpec> {
  const { readFile } = await import('fs/promises')
  const { join } = await import('path')

  const configPath = join(process.cwd(), 'configs/templates', `${templateId}.json`)
  try {
    const raw = await readFile(configPath, 'utf-8')
    return JSON.parse(raw) as ComponentSpec
  } catch {
    // Not in the built-in config directory; try the public gallery index.
  }

  try {
    const indexRaw = await readFile(
      join(process.cwd(), 'public/templates/index.json'),
      'utf-8'
    )
    const index = JSON.parse(indexRaw) as Array<{
      id: string
      path: string
    }>
    const item = index.find((i) => i.id === templateId)
    if (item) {
      const raw = await readFile(join(process.cwd(), 'public', item.path), 'utf-8')
      return JSON.parse(raw) as ComponentSpec
    }
  } catch {
    // Index missing or unreadable; fall through to the default website config.
  }

  const raw = await readFile(
    join(process.cwd(), 'configs/templates/website.json'),
    'utf-8'
  )
  return JSON.parse(raw) as ComponentSpec
}

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  const body = await c.req.json<{
    projectId: string
    componentName: string
    currentCode: string
    instruction: string
    templateId?: string
    auth?: Record<string, string>
  }>()

  const auth = body.auth ?? {}

  if (!auth.openrouter && !auth.huggingface && !auth.gemini) {
    return c.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, 401)
  }

  const templateId = body.templateId ?? 'website'

  try {
    const config = await loadTemplateConfig(templateId)

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
