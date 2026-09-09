import { Hono } from 'hono'
import { regenerateComponent } from '@/lib/generate-component'
import { loadTemplateConfig } from '../lib/template-loader'
import type { AppEnv } from '../lib/env'

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  let body: {
    projectId: string
    componentName: string
    currentCode: string
    instruction: string
    templateId?: string
    auth?: Record<string, string>
    provider?: string
    model?: string
  }

  try {
    body = await c.req.json<{
      projectId: string
      componentName: string
      currentCode: string
      instruction: string
      templateId?: string
      auth?: Record<string, string>
      provider?: string
      model?: string
    }>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  if (!body.componentName || typeof body.componentName !== 'string') {
    return c.json({ error: 'componentName is required', code: 'BAD_REQUEST' }, 400)
  }
  if (!body.currentCode || typeof body.currentCode !== 'string') {
    return c.json({ error: 'currentCode is required', code: 'BAD_REQUEST' }, 400)
  }
  if (!body.instruction || typeof body.instruction !== 'string' || !body.instruction.trim()) {
    return c.json({ error: 'instruction is required', code: 'BAD_REQUEST' }, 400)
  }

  const auth = body.auth ?? {}

  if (!auth.openrouter && !auth.huggingface && !auth.gemini) {
    return c.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, 401)
  }

  const allowedProviders = ['openrouter', 'gemini', 'huggingface']
  if (body.provider && !allowedProviders.includes(body.provider)) {
    return c.json(
      { error: `Unknown provider: ${body.provider}`, code: 'BAD_REQUEST' },
      400
    )
  }

  const templateId = body.templateId ?? 'website'

  const preferred =
    body.provider && body.model
      ? { provider: body.provider, model: body.model }
      : undefined

  try {
    const config = await loadTemplateConfig(templateId)

    const result = await regenerateComponent(
      config,
      body.componentName,
      body.currentCode,
      body.instruction,
      auth,
      preferred
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
