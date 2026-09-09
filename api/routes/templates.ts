import { randomUUID } from 'crypto'
import { Hono } from 'hono'
import { readFile, writeFile, mkdir } from 'fs/promises'
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
  const id = c.req.param('id')
  let body: { prompt: string; auth?: Record<string, string>; provider?: string; model?: string }

  try {
    body = await c.req.json<{
      prompt: string
      auth?: Record<string, string>
      provider?: string
      model?: string
    }>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  const { prompt, auth, provider, model } = body

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return c.json({ error: 'Prompt is required', code: 'BAD_REQUEST' }, 400)
  }

  if (!auth || (!auth.openrouter && !auth.huggingface && !auth.gemini)) {
    return c.json({ error: 'Missing API key', code: 'UNAUTHORIZED' }, 401)
  }

  const allowedProviders = ['openrouter', 'gemini', 'huggingface']
  if (provider && !allowedProviders.includes(provider)) {
    return c.json(
      { error: `Unknown provider: ${provider}`, code: 'BAD_REQUEST' },
      400
    )
  }
  if (provider && (!model || typeof model !== 'string')) {
    return c.json(
      { error: 'Model is required when provider is set', code: 'BAD_REQUEST' },
      400
    )
  }
  if (model && (!provider || typeof provider !== 'string')) {
    return c.json(
      { error: 'Provider is required when model is set', code: 'BAD_REQUEST' },
      400
    )
  }

  const index = await loadIndex()
  const item = index.find((t) => t.id === id)

  if (!item) {
    return c.json({ error: 'Template not found', code: 'NOT_FOUND' }, 404)
  }

  const raw = await readFile(join(process.cwd(), 'public', item.path), 'utf-8')
  const config = JSON.parse(raw) as ComponentSpec

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
          console.error('[templates] send failed, stream already closed:', err)
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

      const preferred =
        provider && model ? { provider, model } : undefined

      let generationPreferred = preferred

      try {
        send('ping', {})
        heartbeat = setInterval(() => send('ping', {}), 10_000)

        send('analyzing', { status: 'analyzing' })
        const intent = await analyzeIntent(prompt, auth, preferred)
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
                prompt,
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

app.post('/', async (c) => {
  const body = await c.req.json<{
    id: string
    name: string
    type: string
    topic?: string
    description: string
  }>()

  if (!body.id || !body.name || !body.description) {
    return c.json({ error: 'Missing required fields: id, name, description' }, 400)
  }

  try {
    const templatesDir = join(process.cwd(), 'public/templates')
    const typeDir = join(templatesDir, body.type || 'websites')
    const templatePath = join(typeDir, `${body.id}.json`)

    const indexItem: TemplateIndexItem = {
      id: body.id,
      name: body.name,
      type: body.type || 'websites',
      topic: body.topic || body.id,
      description: body.description,
      thumbnail: `/templates/thumbnails/${body.id}.png`,
      path: `/templates/${body.type || 'websites'}/${body.id}.json`,
    }

    // Load the default website config as a base so the saved template has
    // proper scope, constraints, components, validation, and model fields.
    // Without this, loadTemplateConfig would parse the index metadata as a
    // ComponentSpec and all constraints would be undefined.
    const baseConfigRaw = await readFile(
      join(process.cwd(), 'configs/templates/website.json'),
      'utf-8'
    )
    const baseConfig = JSON.parse(baseConfigRaw) as ComponentSpec
    const fullConfig: ComponentSpec = {
      ...baseConfig,
      id: body.id,
      name: body.name,
      description: body.description,
    }

    await mkdir(typeDir, { recursive: true })
    await writeFile(templatePath, JSON.stringify(fullConfig, null, 2), 'utf-8')

    const index = await loadIndex()
    if (!index.find((t) => t.id === body.id)) {
      index.push(indexItem)
      await writeFile(
        join(templatesDir, 'index.json'),
        JSON.stringify(index, null, 2),
        'utf-8'
      )
    }

    return c.json({ message: 'Template created', id: body.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Failed to save template: ${message}` }, 500)
  }
})

export default app
