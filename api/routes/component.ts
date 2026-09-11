import { Hono } from 'hono'
import { regenerateComponent } from '@/lib/generate-component'
import { validateComponent, type ValidationResult } from '@/lib/validate'
import { COMPONENT_RULES } from '@/lib/validation-rules'
import { loadTemplateConfig } from '../lib/template-loader'
import { toIdentifier } from '@/lib/intent'
import type { AppEnv } from '../lib/env'

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  let body: {
    componentName: string
    currentCode: string
    instruction: string
    templateId?: string
    auth?: Record<string, string>
    provider?: string
    model?: string
  }

  try {
    body = await c.req.json<typeof body>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  if (!body.componentName || typeof body.componentName !== 'string') {
    return c.json({ error: 'componentName is required', code: 'BAD_REQUEST' }, 400)
  }

  // Sanitize to a JS identifier — the name flows into the system prompt AND
  // the client's `src/components/sections/<name>.tsx` file key.
  const componentName = toIdentifier(body.componentName)
  if (!componentName) {
    return c.json({ error: 'componentName is invalid', code: 'BAD_REQUEST' }, 400)
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

  const deps = {
    allowed: undefined as string[] | undefined,
    forbidden: undefined as string[] | undefined,
  }

  try {
    const config = await loadTemplateConfig(templateId)
    deps.allowed = config.constraints?.allowedDependencies as
      | string[]
      | undefined
    deps.forbidden = config.constraints?.forbiddenDependencies as
      | string[]
      | undefined

    let result = await regenerateComponent(
      config,
      componentName,
      body.currentCode,
      body.instruction,
      auth,
      preferred,
      // Aborts the provider call if the client closes the panel mid-edit.
      c.req.raw.signal
    )

    if (result.status === 'error') {
      return c.json({ error: result.error }, 500)
    }

    // The edit path must not bypass the validation pipeline — otherwise a
    // regeneration could reintroduce eval/dangerouslySetInnerHTML/forbidden
    // imports straight into the exported project (S47).
    let validation: ValidationResult = await validateComponent(
      componentName,
      result.code,
      COMPONENT_RULES,
      deps
    )

    if (!validation.valid) {
      // One automatic fix attempt with the exact errors fed back.
      const fixInstruction = `${body.instruction}\n\nThe previous attempt failed validation. Fix all of these issues:\n${validation.errors.join('\n')}`
      const retry = await regenerateComponent(
        config,
        componentName,
        result.code,
        fixInstruction,
        auth,
        preferred,
        c.req.raw.signal
      )
      if (retry.status === 'ready') {
        validation = await validateComponent(
          componentName,
          retry.code,
          COMPONENT_RULES,
          deps
        )
        if (validation.valid) {
          result = retry
        }
      }
    }

    if (!validation.valid) {
      return c.json(
        {
          error: `Generated component failed validation: ${validation.errors.join('; ')}`,
          code: 'VALIDATION_FAILED',
        },
        422
      )
    }

    return c.json({ component: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
