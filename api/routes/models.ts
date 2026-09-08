import { Hono } from 'hono'
import type { AppEnv } from '../lib/env'
import {
  fetchOpenRouterModels,
  fetchGeminiModels,
  fetchHuggingFaceModels,
} from '@/lib/models'

const app = new Hono<AppEnv>()

/**
 * List available AI models for a given provider.
 * ?provider=openrouter|gemini|huggingface
 */
app.get('/', async (c) => {
  const provider = c.req.query('provider')
  const token = c.get('auth') as string | null

  try {
    if (provider === 'openrouter') {
      const models = await fetchOpenRouterModels()
      return c.json({ models })
    }

    if (provider === 'gemini') {
      if (!token) {
        return c.json({ error: 'Gemini API key required' }, 401)
      }
      const models = await fetchGeminiModels(token)
      return c.json({ models })
    }

    if (provider === 'huggingface') {
      const models = await fetchHuggingFaceModels()
      return c.json({ models })
    }

    return c.json({ error: 'Unsupported provider' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
