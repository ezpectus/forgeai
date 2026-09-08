import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
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
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'ForgeAI',
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

  async health(apiKey: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },

  estimateCost(tokensIn: number, tokensOut: number, model: string): number {
    const price = PRICES[model]
    if (!price) return 0
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
