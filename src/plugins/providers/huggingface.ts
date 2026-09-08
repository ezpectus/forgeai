import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
} from '@/types'

const API_BASE = 'https://api-inference.huggingface.co'
const WHOAMI_URL = 'https://huggingface.co/api/whoami'

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
    const model = config.model ?? this.defaultModel

    const res = await fetch(`${API_BASE}/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: config.maxTokens ?? 2048,
          return_full_text: false,
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
  },

  async health(apiKey: string): Promise<boolean> {
    const res = await fetch(WHOAMI_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  },

  estimateCost(): number {
    return 0
  },
}
