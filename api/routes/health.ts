import { Hono } from 'hono'
import type { AIProvider } from '@/types'
import { providers } from '@/plugins/providers'
import type { AppEnv } from '../lib/env'

const PROVIDERS = Object.fromEntries(
  providers.map((p) => [p.name, p])
) as Record<string, AIProvider>

const app = new Hono<AppEnv>()

/**
 * Health check endpoint. Returns `ok` by default, or checks a specific provider
 * with `?provider=openrouter|huggingface|gemini` when a key is provided.
 */
app.get('/', async (c) => {
  const provider = c.req.query('provider')
  const auth = c.get('auth') as string | null

  if (!provider) {
    return c.json({ status: 'ok' })
  }

  const service = PROVIDERS[provider]

  if (!service) {
    return c.json({ status: 'error', error: 'Provider not available' }, 503)
  }

  if (!auth) {
    return c.json(
      { status: 'error', error: 'Missing Authorization header' },
      401
    )
  }

  try {
    const result = await service.health(auth)

    if (typeof result === 'boolean') {
      if (!result) {
        return c.json(
          { status: 'error', error: 'Provider health check failed' },
          503
        )
      }
      return c.json({ status: 'ok' })
    }

    if (!result.ok) {
      const status = result.status ?? 503
      return c.json(
        {
          status: 'error',
          error: result.error ?? 'Provider health check failed',
          statusCode: result.status,
        },
        status as Parameters<typeof c.json>[1]
      )
    }

    return c.json({ status: 'ok' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ status: 'error', error: message }, 503)
  }
})

export default app
