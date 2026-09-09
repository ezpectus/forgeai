import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

const API_BASE = 'https://api-inference.huggingface.co'
const WHOAMI_URL = 'https://huggingface.co/api/whoami'

const GENERATE_TIMEOUT_MS = 120_000
const HEALTH_TIMEOUT_MS = 30_000

export const HuggingFace: AIProvider = {
  name: 'huggingface',
  supportedModels: [
    'deepseek-ai/deepseek-coder-6.7b-instruct',
    'THUDM/glm-4-9b-chat',
  ],
  defaultModel: 'deepseek-ai/deepseek-coder-6.7b-instruct',

  async generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult> {
    const requestedModel = config.model ?? this.defaultModel

    const seen = new Set<string>()
    const candidates = [
      requestedModel,
      ...this.supportedModels.filter((m) => m !== requestedModel),
    ].filter((m) => {
      if (!m || seen.has(m)) return false
      seen.add(m)
      return true
    })

    const errors: string[] = []

    for (const model of candidates) {
      try {
        // Prepend system instructions if provided; HF serverless takes a single prompt string.
        const inputs = config.systemPrompt
          ? `${config.systemPrompt}\n\n---\n\n${prompt}`
          : prompt

        const res = await fetch(`${API_BASE}/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
          body: JSON.stringify({
            inputs,
            parameters: {
              max_new_tokens: config.maxTokens ?? 2048,
              return_full_text: false,
              temperature: config.temperature ?? 0.2,
            },
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => 'Unknown HuggingFace error')
          throw new ProviderError(
            `HuggingFace error ${res.status}: ${text}`,
            res.status
          )
        }

        const data = (await res.json()) as
          { generated_text: string }[] | { error?: string }

        if (Array.isArray(data) && data[0]?.generated_text) {
          return {
            code: data[0].generated_text.trim(),
            model,
            provider: 'huggingface',
          }
        }

        if ('error' in data && data.error) {
          throw new ProviderError(data.error, 500)
        }

        throw new ProviderError('HuggingFace returned unexpected response', 500)
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
          message = `HuggingFace request timed out after ${GENERATE_TIMEOUT_MS / 1000}s`
        }

        // 429 is account-level rate limit. Other HF models share the same
        // project quota, so fallback is unlikely to help — fail fast.
        if (status === 429) {
          throw new ProviderError(message, 429)
        }

        if (status === 404 || status === 503) {
          errors.push(`${model}: ${message}`)
          continue
        }

        throw new ProviderError(message, status)
      }
    }

    throw new ProviderError(`HuggingFace failed: ${errors.join('; ')}`, 503)
  },

  async health(apiKey: string): Promise<HealthResult> {
    const res = await fetch(WHOAMI_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })

    if (!res.ok) {
      const message =
        res.status === 429
          ? 'HuggingFace rate limit exceeded. Try again later.'
          : `HuggingFace error ${res.status}`
      return { ok: false, status: res.status, error: message }
    }

    return { ok: true }
  },

  estimateCost(): number {
    return 0
  },
}
