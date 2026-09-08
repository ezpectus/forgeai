import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
} from '@/types'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const PRICES: Record<string, { in: number; out: number }> = {
  'gemini-1.5-flash': { in: 0.075, out: 0.3 },
  'gemini-1.5-pro': { in: 1.25, out: 5.0 },
  'gemini-pro': { in: 0.5, out: 1.5 },
}

function stripMarkdownCodeBlock(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n```\s*$/i, '')
    .trim()
}

export const Gemini: AIProvider = {
  name: 'gemini',
  supportedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
  defaultModel: 'gemini-1.5-flash',

  async generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult> {
    const model = config.model ?? this.defaultModel
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
  },

  async health(apiKey: string): Promise<boolean> {
    const model = this.defaultModel
    const res = await fetch(
      `${API_BASE}/models/${model}?key=${apiKey}`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return res.ok
  },

  estimateCost(tokensIn: number, tokensOut: number, model: string): number {
    const price = PRICES[model]
    if (!price) return 0
    return (tokensIn * price.in + tokensOut * price.out) / 1_000_000
  },
}
