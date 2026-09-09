import { randomUUID } from 'crypto'
import { Hono } from 'hono'
import { analyzeIntent } from '@/lib/intent'
import { generateComponent } from '@/lib/generate-component'
import { validateComponent } from '@/lib/validate'
import { retryComponent } from '@/lib/retry'
import { assembleProject } from '@/lib/assemble'
import { loadTemplateConfig } from '../lib/template-loader'
import type { AppEnv } from '../lib/env'
import type { ComponentSpec, ComponentState } from '@/types'

const app = new Hono<AppEnv>()

/**
 * Main generation endpoint. Streams Server-Sent Events back to the browser:
 * intent, component status, validation, assembly, and done/error.
 */
app.post('/', async (c) => {
  let body: {
    prompt: string
    templateId?: string
    auth?: Record<string, string>
    provider?: string
    model?: string
  }

  try {
    body = await c.req.json<{
      prompt: string
      templateId?: string
      auth?: Record<string, string>
      provider?: string
      model?: string
    }>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return c.json({ error: 'Prompt is required', code: 'BAD_REQUEST' }, 400)
  }

  const allowedProviders = ['openrouter', 'gemini', 'huggingface']
  if (body.provider && !allowedProviders.includes(body.provider)) {
    return c.json(
      { error: `Unknown provider: ${body.provider}`, code: 'BAD_REQUEST' },
      400
    )
  }
  if (body.provider && (!body.model || typeof body.model !== 'string')) {
    return c.json(
      { error: 'Model is required when provider is set', code: 'BAD_REQUEST' },
      400
    )
  }
  if (body.model && (!body.provider || typeof body.provider !== 'string')) {
    return c.json(
      { error: 'Provider is required when model is set', code: 'BAD_REQUEST' },
      400
    )
  }

  const auth: Record<string, string> = { ...(body.auth ?? {}) }

  if (!auth.openrouter && !auth.huggingface && !auth.gemini) {
    return c.json(
      { error: 'Missing API key', code: 'UNAUTHORIZED' },
      401
    )
  }

  const templateId = body.templateId ?? 'website'

  let config: ComponentSpec
  try {
    config = await loadTemplateConfig(templateId)
  } catch {
    return c.json(
      { error: `Template config not found: ${templateId}`, code: 'NOT_FOUND' },
      404
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let heartbeat: ReturnType<typeof setInterval> | undefined

      function send(event: string, data: unknown) {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch (err) {
          closed = true
          if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = undefined
          }
          console.error('[generate] send failed, stream already closed:', err)
        }
      }

      function close() {
        if (closed) return
        closed = true
        if (heartbeat) {
          clearInterval(heartbeat)
          heartbeat = undefined
        }
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      try {
        // Send an immediate keep-alive so the client clears its connection
        // timeout. Some providers (e.g. Gemini) take a long time to start
        // responding, and the UI would otherwise abort after 30s.
        send('ping', {})

        // Keep sending a ping every 10s while generation runs. This prevents
        // the client's read timeout (now 5min) from firing on slow free models.
        heartbeat = setInterval(() => send('ping', {}), 10_000)

        const preferred =
          body.provider && body.model
            ? { provider: body.provider, model: body.model }
            : undefined
        const intent = await analyzeIntent(body.prompt, auth, preferred)
        send('intent', intent)

        let generationPreferred = preferred

        const components: ComponentState[] = []
        const rules = [
          'syntax',
          'hasDefaultExport',
          'noDangerousHtml',
          'noEval',
          'usesTailwindOnly',
          'imagesHaveAlt',
          'formsHaveNames',
          'noForbiddenImports',
        ]

        for (const section of intent.sections) {
          const componentName = section.name
          send('component', { name: componentName, status: 'generating' })

          let result = await generateComponent(
            body.prompt,
            config,
            componentName,
            auth,
            intent,
            generationPreferred
          )

          if (result.status === 'ready') {
            const validation = await validateComponent(
              componentName,
              result.code,
              rules,
              {
                allowed: config.constraints?.allowedDependencies as string[],
                forbidden: config.constraints
                  ?.forbiddenDependencies as string[],
              }
            )

            if (!validation.valid) {
              result = await retryComponent(
                body.prompt,
                config,
                componentName,
                result.code,
                validation.errors,
                auth,
                intent,
                generationPreferred
              )
            }
          }

          if (result.status === 'ready' && result.provider && result.model) {
            generationPreferred = {
              provider: result.provider,
              model: result.model,
            }
          }

          send('component', {
            name: componentName,
            code: result.code,
            status: result.status,
            cost: result.cost,
            error: result.error,
            provider: result.provider,
            model: result.model,
          })
          components.push(result)
        }

        const projectId = randomUUID()
        const files = assembleProject(intent, components, projectId)
        send('done', { projectId, files })
        close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[generate] error:', err)
        send('error', { message })
        close()
      }
    },
  })

  return c.newResponse(stream, 200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
})

export default app
