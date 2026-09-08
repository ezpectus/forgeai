import { Hono } from 'hono'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { analyzeIntent } from '@/lib/intent'
import { assembleProject } from '@/lib/assemble'
import { generateComponent } from '@/lib/generate-component'
import { validateComponent } from '@/lib/validate'
import { retryComponent } from '@/lib/retry'
import type { AppEnv } from '../lib/env'
import type { ComponentSpec } from '@/types'

const app = new Hono<AppEnv>()

interface TemplateIndexItem {
  id: string
  name: string
  type: string
  topic: string
  description: string
  thumbnail: string
  path: string
}

async function loadIndex(): Promise<TemplateIndexItem[]> {
  const raw = await readFile(
    join(process.cwd(), 'public/templates/index.json'),
    'utf-8'
  )
  return JSON.parse(raw) as TemplateIndexItem[]
}

app.get('/', async (c) => {
  const query = c.req.query()
  const type = query.type
  const topic = query.topic
  const search = query.search?.toLowerCase()
  const page = Math.max(1, Number(query.page ?? '1'))
  const limit = Math.max(1, Math.min(100, Number(query.limit ?? '10')))

  let items = await loadIndex()

  if (type) items = items.filter((t) => t.type === type)
  if (topic) items = items.filter((t) => t.topic === topic)
  if (search) {
    items = items.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
    )
  }

  const total = items.length
  const start = (page - 1) * limit
  const paginated = items.slice(start, start + limit)

  return c.json({
    data: paginated,
    page,
    limit,
    total,
  })
})

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const index = await loadIndex()
  const item = index.find((t) => t.id === id)

  if (!item) {
    return c.json({ error: 'Template not found' }, 404)
  }

  const raw = await readFile(join(process.cwd(), 'public', item.path), 'utf-8')
  const template = JSON.parse(raw) as ComponentSpec
  return c.json(template)
})

app.post('/:id/customize', async (c) => {
  const token = c.get('auth') as string | null
  const id = c.req.param('id')
  const { prompt } = await c.req.json<{ prompt: string }>()

  if (!token) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  const index = await loadIndex()
  const item = index.find((t) => t.id === id)

  if (!item) {
    return c.json({ error: 'Template not found' }, 404)
  }

  const raw = await readFile(join(process.cwd(), 'public', item.path), 'utf-8')
  const config = JSON.parse(raw) as ComponentSpec

  const auth = { openrouter: token }
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        send('analyzing', { status: 'analyzing' })
        const intent = await analyzeIntent(prompt, auth.openrouter)
        send('intent', intent)

        const components = []
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
            prompt,
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
                prompt,
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

        const files = assembleProject(intent, components, id)
        send('done', { projectId: id, files })
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

app.post('/', async (c) => {
  const body = await c.req.json<ComponentSpec>()
  return c.json({
    message: 'Template created',
    id: body.id,
  })
})

export default app
