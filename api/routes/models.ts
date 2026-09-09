import { Hono } from 'hono'
import type { AppEnv } from '../lib/env'
import {
  fetchOpenRouterModels,
  fetchGeminiModels,
  fetchHuggingFaceModels,
  type ModelOption,
} from '@/lib/models'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { Gemini } from '@/plugins/providers/gemini'

function sortByDefault(
  provider: string,
  models: ModelOption[]
): ModelOption[] {
  const defaultId =
    provider === 'openrouter'
      ? OpenRouter.defaultModel
      : provider === 'gemini'
        ? Gemini.defaultModel
        : provider === 'huggingface'
          ? HuggingFace.defaultModel
          : undefined

  if (!defaultId) return models

  const first = models.find((m) => m.id === defaultId)
  if (!first) return models

  return [first, ...models.filter((m) => m.id !== defaultId)]
}

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
      const models = sortByDefault(provider, await fetchOpenRouterModels())
      return c.json({ models })
    }

    if (provider === 'gemini') {
      if (!token) {
        return c.json({ error: 'Gemini API key required' }, 401)
      }
      const models = sortByDefault(provider, await fetchGeminiModels(token))
      return c.json({ models })
    }

    if (provider === 'huggingface') {
      const models = sortByDefault(provider, await fetchHuggingFaceModels())
      return c.json({ models })
    }

    return c.json({ error: 'Unsupported provider' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
