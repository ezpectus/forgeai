import { Hono } from 'hono'
import type { AIProvider } from '@/types'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { Gemini } from '@/plugins/providers/gemini'
import type { AppEnv } from '../lib/env'

const PROVIDERS: Record<string, AIProvider> = {
  openrouter: OpenRouter,
  huggingface: HuggingFace,
  gemini: Gemini,
}

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

  const ok = await service.health(auth)

  if (!ok) {
    return c.json(
      { status: 'error', error: 'Provider health check failed' },
      503
    )
  }

  return c.json({ status: 'ok' })
})

export default app
