export interface ModelOption {
  id: string
  name: string
  free?: boolean
}

export async function fetchOpenRouterModels(): Promise<ModelOption[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'ForgeAI' },
  })

  if (!res.ok) {
    throw new Error(`OpenRouter models list failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    data?: {
      id: string
      name: string
      pricing?: { prompt?: number; completion?: number }
    }[]
  }

  return (data.data ?? [])
    .filter((m) => m.id)
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      free: (m.pricing?.prompt ?? 0) === 0 && (m.pricing?.completion ?? 0) === 0,
    }))
}

// Models that appear in the Google model list but are deprecated/unavailable for new users.
const DEPRECATED_GEMINI_MODELS = new Set(['gemini-2.5-flash'])

export async function fetchGeminiModels(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { headers: { 'Content-Type': 'application/json' } }
  )

  if (!res.ok) {
    throw new Error(`Gemini models list failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    models?: {
      name: string
      displayName?: string
      supportedGenerationMethods?: string[]
    }[]
  }

  return (data.models ?? [])
    .filter(
      (m) =>
        m.name &&
        m.supportedGenerationMethods?.includes('generateContent') &&
        !DEPRECATED_GEMINI_MODELS.has(m.name.replace(/^models\//, ''))
    )
    .map((m) => ({
      id: m.name.replace(/^models\//, ''),
      name: m.displayName ?? m.name.replace(/^models\//, ''),
      free: true,
    }))
}

export async function fetchHuggingFaceModels(): Promise<ModelOption[]> {
  // These are known free-to-inference models on HuggingFace's serverless API.
  return [
    {
      id: 'deepseek-ai/deepseek-coder-6.7b-instruct',
      name: 'DeepSeek Coder 6.7B',
      free: true,
    },
    {
      id: 'THUDM/glm-4-9b-chat',
      name: 'THUDM GLM-4 9B Chat',
      free: true,
    },
    {
      id: 'mistralai/Mistral-7B-Instruct-v0.3',
      name: 'Mistral 7B Instruct',
      free: true,
    },
    {
      id: 'meta-llama/Llama-2-7b-chat-hf',
      name: 'Llama 2 7B Chat',
      free: true,
    },
    {
      id: 'microsoft/DialoGPT-medium',
      name: 'DialoGPT Medium',
      free: true,
    },
  ]
}
