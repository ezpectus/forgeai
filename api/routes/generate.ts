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

app.post('/', async (c) => {
  const token = c.get('auth') as string | null
  const body = await c.req.json<{
    prompt: string
    templateId?: string
    auth?: Record<string, string>
  }>()

  const auth: Record<string, string> = { ...(body.auth ?? {}) }
  if (token && !auth.openrouter) {
    auth.openrouter = token
  }

  if (!auth.openrouter) {
    return c.json({ error: 'Missing OpenRouter API key' }, 401)
  }

  const templateId = body.templateId ?? 'website'
  const templatePath = join(
    process.cwd(),
    'configs/templates',
    `${templateId}.json`
  )
  const raw = await readFile(templatePath, 'utf-8')
  const config = JSON.parse(raw) as ComponentSpec

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const intent = await analyzeIntent(body.prompt, auth.openrouter)
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

          let result = await generateComponent(
            body.prompt,
            config,
            componentName,
            auth
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
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
})

export default app
