import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Generating a component (especially the first `intent` call) can take Gemini
// 30-90s from some regions/keys, so the server should not abort too early.
const GENERATE_TIMEOUT_MS = 120_000
const HEALTH_TIMEOUT_MS = 30_000

const PRICES: Record<string, { in: number; out: number }> = {
  'gemini-3.6-flash': { in: 0.075, out: 0.3 },
  'gemini-3.5-flash': { in: 0.075, out: 0.3 },
  'gemini-3.5-flash-lite': { in: 0.0375, out: 0.15 },
}

// Models Google has flagged as deprecated/unavailable for new users.
// gemini-2.0-flash* was shut down June 2026.
// gemini-1.5-flash* is no longer available for v1beta generateContent.
// gemini-2.5-flash* is no longer available to new users (Sep 2026).
const DEPRECATED_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
])

// Fallback order: newest cheap flash models first.
// Deprecated models (2.0-flash, 1.5-flash, 2.5-flash) are excluded —
// they always fail and waste time.
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
]

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n```\s*$/i, '')
    .trim()
}

export const Gemini: AIProvider = {
  name: 'gemini',
  supportedModels: [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ],
  defaultModel: 'gemini-3.6-flash',

  async generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult> {
    const requestedModel = config.model ?? this.defaultModel

    // Build a unique list of candidate models so a deprecated or rate-limited
    // model falls back to the next available one without leaving the provider.
    // Only use stable/cheap flash models as fallbacks to keep call counts low.
    const seen = new Set<string>()
    const candidates = [
      requestedModel,
      ...GEMINI_FALLBACK_MODELS,
    ].filter((m) => {
      if (!m || seen.has(m) || DEPRECATED_MODELS.has(m)) return false
      seen.add(m)
      return true
    })

    const errors: string[] = []
    const KEYWORDS = [
      'no longer available',
      'not available',
      'not found',
      'deprecated',
      'invalid argument',
      'unsupported',
    ]

    for (const model of candidates) {
      try {
        const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`

        const parts = [{ text: prompt }]
        const contents = []

        if (config.systemPrompt) {
          contents.push({
            role: 'user',
            parts: [
              {
                text: `System instruction (you must follow it): ${config.systemPrompt}\n\n---\n\n${prompt}`,
              },
            ],
          })
        } else {
          contents.push({ role: 'user', parts })
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: config.temperature ?? 0.2,
              maxOutputTokens: config.maxTokens ?? 8192,
            },
          }),
        })

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: { message: 'Unknown Gemini error' } }))
          throw new ProviderError(
            data.error?.message ?? `Gemini error ${res.status}`,
            res.status
          )
        }

        const data = (await res.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[]; role?: string }
            finishReason?: string
          }[]
          usageMetadata?: {
            promptTokenCount?: number
            candidatesTokenCount?: number
          }
        }

        if (
          !data.candidates ||
          data.candidates.length === 0 ||
          data.candidates[0].finishReason === 'SAFETY'
        ) {
          throw new ProviderError(
            'Gemini response blocked or empty',
            500
          )
        }

        const content = data.candidates[0].content?.parts?.[0]?.text

        if (!content || typeof content !== 'string') {
          throw new ProviderError('Gemini returned empty content', 500)
        }

        const finishReason = data.candidates[0].finishReason
        if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
          throw new ProviderError(
            `Gemini model ${model} produced truncated output`,
            503
          )
        }

        const code = stripMarkdownCodeBlock(content)
        const tokensIn = data.usageMetadata?.promptTokenCount ?? 0
        const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0
        const cost = this.estimateCost?.(tokensIn, tokensOut, model)

        return {
          code,
          model,
          provider: 'gemini',
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
          message = `Gemini request timed out after ${GENERATE_TIMEOUT_MS / 1000}s`
        }

        // 404 means the model does not exist for this key — try the next one.
        if (status === 404) {
          errors.push(`${model}: ${message}`)
          continue
        }

        // 429 is project-level quota. Falling back to other Gemini models
        // wastes the user’s time and quota, so fail fast.
        if (status === 429) {
          throw new ProviderError(message, 429)
        }

        // 503 (capacity) or deprecated/removed models (400 with keywords):
        // try the next fallback model immediately.
        if (
          status === 503 ||
          (status === 400 &&
            KEYWORDS.some((kw) => lower.includes(kw)))
        ) {
          errors.push(`${model}: ${message}`)
          continue
        }

        throw new ProviderError(message, status)
      }
    }

    throw new ProviderError(`Gemini failed: ${errors.join('; ')}`, 503)
  },

  async health(apiKey: string): Promise<HealthResult> {
    const res = await fetch(`${API_BASE}/models?key=${apiKey}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })

    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({ error: { message: 'Unknown Gemini error', status: res.status } }))
      const message =
        data.error?.message ??
        (res.status === 429
          ? 'Gemini rate limit exceeded. Wait a minute or check your quota in Google AI Studio.'
          : `Gemini error ${res.status}`)
      return { ok: false, status: res.status, error: message }
    }

    const data = (await res.json()) as {
      models?: { name?: string }[]
    }
    const hasGemini = data.models?.some((m) =>
      (m.name ?? '').includes('gemini')
    ) ?? false

    if (!hasGemini) {
      return {
        ok: false,
        status: 503,
        error: 'Gemini did not return any models. The API key may not have access to Gemini.',
      }
    }

    return { ok: true }
  },

  estimateCost(tokensIn: number, tokensOut: number, model: string): number {
    // Fall back to the default model's price if a newer/unknown model is used
    // so the UI does not silently show zero cost.
    const price = PRICES[model] ?? PRICES[this.defaultModel] ?? null
    if (!price) return 0
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
