import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
  type HealthResult,
} from '@/types'

const API_BASE = 'https://openrouter.ai/api/v1'

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
  supportedModels: [
    'deepseek/deepseek-chat',
    'Qwen/Qwen2.5-Coder',
    'meta-llama/llama-3.1-70b-instruct',
  ],
  defaultModel: 'deepseek/deepseek-chat',

  async generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult> {
    const model = config.model ?? this.defaultModel
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
        'HTTP-Referer':
          process.env.OPENROUTER_REFERER ?? 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE ?? 'ForgeAI',
      },
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
      throw new ProviderError(
        data.error?.message ?? `OpenRouter error ${res.status}`,
        res.status
      )
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
  },

  async health(apiKey: string): Promise<HealthResult> {
    // OpenRouter's /auth path is not valid; /api/v1/key is the documented
    // endpoint for validating an API key and reading remaining credits.
    const res = await fetch(`${API_BASE}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
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
    // Use the default model's price for unknown models so the UI never
    // silently shows zero cost.
    const price = PRICES[model] ?? PRICES[this.defaultModel] ?? null
    if (!price) return 0
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
