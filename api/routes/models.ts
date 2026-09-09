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

function pickDefault(
  models: ModelOption[],
  defaultId: string
): ModelOption | undefined {
  // Exact match first.
  const exact = models.find((m) => m.id === defaultId)
  if (exact) return exact

  // Fuzzy fallback: use the model family (provider prefix and base name).
  // For `deepseek/deepseek-chat` we look for any `deepseek/...`,
  // for `gemini-1.5-flash` any `gemini-1.5-...`.
  const parts = defaultId.split('/')
  const family = parts.length > 1 ? parts[0] : defaultId.split('-').slice(0, 2).join('-')
  return models.find((m) => m.id.startsWith(`${family}/`) || m.id.startsWith(`${family}-`))
}

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

  const first = pickDefault(models, defaultId)
  if (!first) return models

  return [first, ...models.filter((m) => m.id !== first.id)]
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
