import { fetchOpenRouterModels } from '@/lib/models'
import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

const API_BASE = 'https://openrouter.ai/api/v1'

const GENERATE_TIMEOUT_MS = 120_000
const HEALTH_TIMEOUT_MS = 30_000
const MODEL_LIST_TTL_MS = 5 * 60 * 1000

let cachedModelList: string[] | null = null
let cachedModelListAt = 0

async function getOpenRouterModels(): Promise<string[]> {
  if (cachedModelList && Date.now() - cachedModelListAt < MODEL_LIST_TTL_MS) {
    return cachedModelList
  }

  try {
    const models = await fetchOpenRouterModels()
    cachedModelList = models.map((m) => m.id)
    cachedModelListAt = Date.now()
    return cachedModelList
  } catch {
    return []
  }
}

const INVALID_MODEL_KEYWORDS = [
  'is not a valid model',
  'does not exist',
  'was not found',
  'invalid model',
  'no such model',
]

const PRICES: Record<string, { in: number; out: number }> = {
  'deepseek/deepseek-chat': { in: 0.14, out: 0.28 },
  'Qwen/Qwen2.5-Coder': { in: 0.3, out: 0.6 },
  'meta-llama/llama-3.1-70b-instruct': { in: 0.22, out: 0.22 },
}

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n```\s*$/i, '')
    .trim()
}

export const OpenRouter: AIProvider = {
  name: 'openrouter',
  // Hardcoded fallback is intentionally empty. OpenRouter model IDs change
  // often and the live list from /api/v1/models is the source of truth.
  supportedModels: [],
  defaultModel: 'deepseek/deepseek-chat',

  async generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult> {
    const requestedModel = config.model ?? this.defaultModel

    const messages = []

    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt })
    }

    messages.push({ role: 'user', content: prompt })

    // Source of truth for model IDs. Tests can pass config.fallback; in
    // production we fetch the live model list from OpenRouter.
    const errors: string[] = []
    let modelList: string[] = []
    if (config.fallback?.length) {
      modelList = config.fallback
    } else {
      const live = await getOpenRouterModels()
      if (live.length) modelList = live
    }
    if (modelList.length === 0) {
      modelList = this.supportedModels
    }

    // Build candidates: requested model first, then up to 15 fallbacks.
    // If the requested model is not in the source list, it is skipped
    // without a network call (B).
    const unique = new Set<string>()
    const candidates: string[] = []
    for (const m of [requestedModel, ...modelList]) {
      if (!m || unique.has(m)) continue
      if (modelList.length > 0 && !modelList.includes(m)) {
        // Requested/fallback model not in the provider list — skip without a request.
        if (m === requestedModel) {
          errors.push(`${m}: not in OpenRouter model list`)
        }
        continue
      }
      unique.add(m)
      candidates.push(m)
    }

    // Limit fallback depth to avoid long chains.
    const finalCandidates = candidates.slice(0, 16)
    let hit402 = false

    for (const model of finalCandidates) {
      if (hit402 && !model.endsWith(':free')) continue

      try {
        const res = await fetch(`${API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              process.env.OPENROUTER_REFERER ?? 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_TITLE ?? 'ForgeAI',
          },
          signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
          body: JSON.stringify({
            model,
            messages,
            temperature: config.temperature ?? 0.2,
            max_tokens: config.maxTokens ?? 2048,
          }),
        })

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: { message: 'Unknown OpenRouter error' } }))
          const message =
            res.status === 402
              ? 'OpenRouter account has no credits. Add credits or switch to a `:free` model.'
              : data.error?.message ?? `OpenRouter error ${res.status}`
          throw new ProviderError(message, res.status)
        }

        const data = await res.json()
        const content = data.choices?.[0]?.message?.content

        if (!content || typeof content !== 'string') {
          throw new ProviderError('OpenRouter returned empty content', 500)
        }

        const code = stripMarkdownCodeBlock(content)
        const tokensIn = data.usage?.prompt_tokens ?? 0
        const tokensOut = data.usage?.completion_tokens ?? 0
        const cost = this.estimateCost?.(tokensIn, tokensOut, model)

        return {
          code,
          model,
          provider: 'openrouter',
          tokensIn,
          tokensOut,
          cost,
        }
      } catch (err) {
        let status = err instanceof ProviderError ? err.status : 500
        let message = err instanceof Error ? err.message : String(err)
        const lower = message.toLowerCase()

        const isTimeoutError =
          lower.includes('the operation was aborted') ||
          lower.includes('connection timed out') ||
          lower.includes('etimedout') ||
          lower.includes('econnreset') ||
          lower.includes('socket') ||
          lower.includes('network')

        if (isTimeoutError && !(err instanceof ProviderError)) {
          status = 503
          message = `OpenRouter request timed out after ${GENERATE_TIMEOUT_MS / 1000}s`
        }

        // 429 is account-level rate limit. Falling back to other OpenRouter
        // models usually fails with the same error and wastes time/quota.
        if (status === 429) {
          throw new ProviderError(message, 429)
        }

        // 400 with an invalid-model message means the model id is stale or not
        // a chat model — skip it and try the next one.
        if (status === 400 && INVALID_MODEL_KEYWORDS.some((kw) => lower.includes(kw))) {
          errors.push(`${model}: ${message}`)
          continue
        }

        if (status === 404 || status === 402 || status === 503) {
          if (status === 402) hit402 = true
          errors.push(`${model}: ${message}`)
          continue
        }

        throw new ProviderError(message, status)
      }
    }

    throw new ProviderError(`OpenRouter failed: ${errors.join('; ')}`, 503)
  },

  async health(apiKey: string): Promise<HealthResult> {
    // OpenRouter's /auth path is not valid; /api/v1/key is the documented
    // endpoint for validating an API key and reading remaining credits.
    const res = await fetch(`${API_BASE}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })

    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({ error: { message: 'Unknown OpenRouter error' } }))
      const message =
        data.error?.message ??
        (res.status === 429
          ? 'OpenRouter rate limit exceeded. Try a different model or wait.'
          : res.status === 402
            ? 'OpenRouter account has no credits. Add credits or use a free model.'
            : `OpenRouter error ${res.status}`)
      return { ok: false, status: res.status, error: message }
    }

    return { ok: true }
  },

  estimateCost(tokensIn: number, tokensOut: number, model: string): number {
    // OpenRouter models ending in `:free` cost $0.
    if (model.endsWith(':free')) return 0
    // Use the default model's price for unknown models so the UI never
    // silently shows zero cost.
    const price = PRICES[model] ?? PRICES[this.defaultModel] ?? null
    if (!price) return 0
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
