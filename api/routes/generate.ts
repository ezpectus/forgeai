import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Hono } from 'hono'
import { analyzeIntent } from '@/lib/intent'
import { generateComponent } from '@/lib/generate-component'
import { validateComponent } from '@/lib/validate'
import { retryComponent } from '@/lib/retry'
import { assembleProject } from '@/lib/assemble'
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

  const auth: Record<string, string> = { ...(body.auth ?? {}) }

  if (!auth.openrouter && !auth.huggingface && !auth.gemini) {
    return c.json(
      { error: 'Missing API key', code: 'UNAUTHORIZED' },
      401
    )
  }

  const templateId = body.templateId ?? 'website'
  const templatePath = join(
    process.cwd(),
    'configs/templates',
    `${templateId}.json`
  )

  let config: ComponentSpec
  try {
    const raw = await readFile(templatePath, 'utf-8')
    config = JSON.parse(raw) as ComponentSpec
  } catch {
    return c.json(
      { error: `Template config not found: ${templateId}`, code: 'NOT_FOUND' },
      404
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const intent = await analyzeIntent(body.prompt, auth)
        send('intent', intent)

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

          const preferred =
            body.provider && body.model
              ? { provider: body.provider, model: body.model }
              : undefined

          let result = await generateComponent(
            body.prompt,
            config,
            componentName,
            auth,
            preferred
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
                auth
              )
            }
          }

          send('component', {
            name: componentName,
            code: result.code,
            status: result.status,
            cost: result.cost,
            error: result.error,
          })
          components.push(result)
        }

        const projectId = randomUUID()
        const files = assembleProject(intent, components, projectId)
        send('done', { projectId, files })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send('error', { message })
        controller.close()
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
