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
  'gemini-1.5-flash': { in: 0.075, out: 0.3 },
  'gemini-1.5-pro': { in: 1.25, out: 5.0 },
  'gemini-pro': { in: 0.5, out: 1.5 },
}

// Models Google has flagged as deprecated/unavailable for new users.
// Keep this minimal and update as Google changes the model list.
const DEPRECATED_MODELS = new Set(['gemini-2.5-flash'])

// Only fall back to stable/cheap flash models — avoid expensive pro models
// because they have lower rate limits and are more likely to hit 429.
const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-1.5-flash']

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
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
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
      if (!m || seen.has(m)) return false
      seen.add(m)
      return true
    })

    const errors: string[] = []

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
              maxOutputTokens: config.maxTokens ?? 2048,
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

        const isModelUnavailableError =
          status === 404 ||
          status === 429 ||
          status === 503 ||
          (status === 400 &&
            (lower.includes('no longer available') ||
              lower.includes('not available') ||
              lower.includes('not found') ||
              lower.includes('deprecated') ||
              lower.includes('invalid argument') ||
              lower.includes('unsupported')))

        if (isModelUnavailableError && candidates.length > 1) {
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
