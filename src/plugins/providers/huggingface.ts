import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

// HuggingFace migrated from the old api-inference.huggingface.co endpoint to
// a new OpenAI-compatible router at router.huggingface.co/v1 (July 2025).
// The old endpoint is now limited to CPU inference (embeddings, small models).
const API_BASE = 'https://router.huggingface.co/v1'

const GENERATE_TIMEOUT_MS = 120_000
const HEALTH_TIMEOUT_MS = 30_000

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n```\s*$/i, '')
    .trim()
}

export const HuggingFace: AIProvider = {
  name: 'huggingface',
  // Models available through HuggingFace Inference Providers router (Sep 2026).
  // 135 models total, these are the best for code generation.
  // Free tier: $0.10/month credits. API: router.huggingface.co/v1
  supportedModels: [
    'deepseek-ai/DeepSeek-V4-Flash',
    'Qwen/Qwen3.8-27B',
    'openai/gpt-oss-120b',
    'zai-org/GLM-5.3-Flash',
    'moonshotai/Kimi-K3',
    'google/gemma-4-31B-it',
    'meta-llama/Llama-3.1-8B-Instruct',
    'thinkingmachines/Inkling',
  ],
  defaultModel: 'deepseek-ai/DeepSeek-V4-Flash',

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
        const messages = []
        if (config.systemPrompt) {
          messages.push({ role: 'system', content: config.systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })

        const res = await fetch(`${API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
          body: JSON.stringify({
            model,
            messages,
            max_tokens: config.maxTokens ?? 8192,
            temperature: config.temperature ?? 0.2,
          }),
        })

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: { message: 'Unknown HuggingFace error' } }))
          const message =
            data.error?.message ?? `HuggingFace error ${res.status}`
          throw new ProviderError(message, res.status)
        }

        const data = (await res.json()) as {
          choices?: {
            finish_reason?: string
            message?: { content?: string }
          }[]
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }

        const content = data.choices?.[0]?.message?.content

        if (!content || typeof content !== 'string') {
          throw new ProviderError('HuggingFace returned empty content', 500)
        }

        if (data.choices?.[0]?.finish_reason === 'length') {
          throw new ProviderError(
            `HuggingFace model ${model} produced truncated output`,
            503
          )
        }

        const code = stripMarkdownCodeBlock(content)
        const tokensIn = data.usage?.prompt_tokens ?? 0
        const tokensOut = data.usage?.completion_tokens ?? 0

        return {
          code,
          model,
          provider: 'huggingface',
          tokensIn,
          tokensOut,
          cost: 0,
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
          message = `HuggingFace request timed out after ${GENERATE_TIMEOUT_MS / 1000}s`
        }

        // 429 is account-level rate limit. Other HF models share the same
        // project quota, so fallback is unlikely to help — fail fast.
        if (status === 429) {
          throw new ProviderError(message, 429)
        }

        if (status === 404 || status === 503 || status >= 500) {
          errors.push(`${model}: ${message}`)
          continue
        }

        throw new ProviderError(message, status)
      }
    }

    throw new ProviderError(`HuggingFace failed: ${errors.join('; ')}`, 503)
  },

  async health(apiKey: string): Promise<HealthResult> {
    // /v1/models is public and doesn't validate the token. The only reliable
    // way to check a HF token is a minimal chat completion request.
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const err = data.error?.message ?? ''
      const message =
        res.status === 401
          ? `Invalid HuggingFace token. Create a fine-grained token with "Make calls to Inference Providers" permission at huggingface.co/settings/tokens. ${err}`
          : res.status === 429
            ? 'HuggingFace rate limit exceeded. Try again later.'
            : `HuggingFace error ${res.status}: ${err}`
      return { ok: false, status: res.status, error: message }
    }

    return { ok: true }
  },

  estimateCost(): number {
    return 0
  },
}
