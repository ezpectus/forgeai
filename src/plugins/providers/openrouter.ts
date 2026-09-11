import { fetchOpenRouterModels } from '@/lib/models'
import { timeoutSignal } from '@/lib/abort'
import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

const API_BASE = 'https://openrouter.ai/api/v1'

const GENERATE_TIMEOUT_MS = 90_000
const HEALTH_TIMEOUT_MS = 30_000
const MODEL_LIST_TTL_MS = 5 * 60 * 1000

let cachedModelList: string[] | null = null
let cachedModelListAt = 0

function isFreeModel(id: string): boolean {
  return id.endsWith(':free') || id === 'openrouter/free'
}

async function getOpenRouterModels(): Promise<string[]> {
  if (cachedModelList && Date.now() - cachedModelListAt < MODEL_LIST_TTL_MS) {
    return cachedModelList
  }

  try {
    const models = await fetchOpenRouterModels()
    // Only keep free models so the fallback chain doesn't waste requests on
    // paid models that return 402 and burn the user's daily quota.
    cachedModelList = models.filter((m) => m.free).map((m) => m.id)
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
  // Free models are $0
  'openrouter/free': { in: 0, out: 0 },
  'poolside/laguna-s-2.1:free': { in: 0, out: 0 },
  'thinkingmachines/inkling:free': { in: 0, out: 0 },
  'poolside/laguna-xs-2.1:free': { in: 0, out: 0 },
  'cohere/north-mini-code:free': { in: 0, out: 0 },
  'nvidia/nemotron-3-ultra:free': { in: 0, out: 0 },
  'nvidia/nemotron-3-super:free': { in: 0, out: 0 },
  'google/gemma-4-26b-a4b:free': { in: 0, out: 0 },
  'google/gemma-4-31b:free': { in: 0, out: 0 },
  'minimax/mini-max-m3:free': { in: 0, out: 0 },
  'inclusionai/ling-3.0-flash-fin:free': { in: 0, out: 0 },
}

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n```\s*$/i, '')
    .trim()
}

export const OpenRouter: AIProvider = {
  name: 'openrouter',
  // Curated free coding models (Sep 2026). Verified against
  // openrouter.ai/collections/free-models — all have :free suffix.
  // The live list from /api/v1/models is still the source of truth.
  supportedModels: [
    'openrouter/free',
    'poolside/laguna-s-2.1:free',
    'poolside/laguna-xs-2.1:free',
    'thinkingmachines/inkling:free',
    'cohere/north-mini-code:free',
    'nvidia/nemotron-3-ultra:free',
    'nvidia/nemotron-3-super:free',
    'google/gemma-4-31b:free',
    'google/gemma-4-26b-a4b:free',
    'minimax/mini-max-m3:free',
    'inclusionai/ling-3.0-flash-fin:free',
  ],
  defaultModel: 'openrouter/free',

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

    // Build candidates: requested model first, then up to 3 fallbacks from the
    // live list. The requested model is always tried even if it is not in the
    // live list — the list may be incomplete or cached. If the API rejects it
    // with a 400 "invalid model", we skip to the next candidate.
    const unique = new Set<string>()
    const candidates: string[] = []
    for (const m of [requestedModel, ...modelList]) {
      if (!m || unique.has(m)) continue
      unique.add(m)
      candidates.push(m)
    }

    // Limit fallback depth to avoid long chains. A free model should respond
    // quickly; if it does not, it is better to try another provider.
    const finalCandidates = candidates.slice(0, 3)
    let hit402 = false

    for (const model of finalCandidates) {
      if (hit402 && !isFreeModel(model)) continue

      try {
        const res = await fetch(`${API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              process.env.OPENROUTER_REFERER ?? 'http://localhost:3000',
            'X-OpenRouter-Title': process.env.OPENROUTER_TITLE ?? 'ForgeAI',
          },
          signal: timeoutSignal(GENERATE_TIMEOUT_MS, config.signal),
          body: JSON.stringify({
            model,
            messages,
            temperature: config.temperature ?? 0.2,
            max_tokens: config.maxTokens ?? 8192,
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

        const data = (await res.json()) as {
          choices?: {
            finish_reason?: string
            message?: {
              content?: string
              reasoning?: string
              reasoning_content?: string
            }
          }[]
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }

        // Reasoning models (e.g. nex-n2.5-pro) may put the actual output
        // in reasoning_content when reasoning_effort is not "none".
        // Fall back to reasoning_content if content is empty.
        const msg = data.choices?.[0]?.message
        const content = msg?.content || msg?.reasoning_content || msg?.reasoning

        if (!content || typeof content !== 'string') {
          throw new ProviderError('OpenRouter returned empty content', 500)
        }

        if (data.choices?.[0]?.finish_reason === 'length') {
          throw new ProviderError(
            `OpenRouter model ${model} produced truncated output`,
            503
          )
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

        // 500, 502, 503 — upstream provider errors. Try the next model.
        if (status === 404 || status === 402 || status >= 500) {
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

  estimateCost(
    tokensIn: number,
    tokensOut: number,
    model: string
  ): number | undefined {
    // Free models (including openrouter/free auto-router) cost $0.
    if (isFreeModel(model)) return 0
    // Unknown model — return undefined rather than silently reporting the
    // wrong price; the UI omits the cost badge when cost is undefined.
    const price = PRICES[model]
    if (!price) return undefined
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
