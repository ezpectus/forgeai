export interface ModelOption {
  id: string
  name: string
  free?: boolean
}

export async function fetchOpenRouterModels(): Promise<ModelOption[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'HTTP-Referer':
        process.env.OPENROUTER_REFERER ?? 'http://localhost:3000',
      'X-OpenRouter-Title': process.env.OPENROUTER_TITLE ?? 'ForgeAI',
    },
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
    .filter((m) => {
      // Free app — only show free models. OpenRouter uses the `:free` suffix
      // for free models. Also check zero pricing as a fallback.
      return (
        m.id.endsWith(':free') ||
        m.id === 'openrouter/free' ||
        ((m.pricing?.prompt ?? 0) === 0 &&
          (m.pricing?.completion ?? 0) === 0)
      )
    })
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      free: true,
    }))
}

// Models Google has flagged as deprecated/unavailable for new users.
// gemini-2.0-flash* was shut down June 2026.
// gemini-1.5-flash* is no longer available for v1beta generateContent.
// gemini-2.5-flash* is no longer available to new users (Sep 2026).
const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
])

export async function fetchGeminiModels(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models`,
    {
      // x-goog-api-key keeps the key out of the URL (access logs see query).
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    }
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
  // Fetch live model list from HuggingFace router. The /v1/models endpoint is
  // public (no token required) and returns 135+ chat models across 14+ providers.
  try {
    const res = await fetch('https://router.huggingface.co/v1/models')
    if (!res.ok) {
      throw new Error(`HF models list failed: ${res.status}`)
    }

    const data = (await res.json()) as {
      data?: {
        id: string
        providers?: {
          status?: string
          pricing?: { input?: number; output?: number }
          is_free?: boolean
        }[]
      }[]
    }

    return (data.data ?? [])
      .filter((m) => m.id)
      .filter((m) =>
        // Only show models with at least one live provider
        m.providers?.some((p) => p.status === 'live')
      )
      .map((m) => {
        // A model is "free" if any provider has $0 pricing or is_free flag
        const hasFreeProvider = m.providers?.some(
          (p) =>
            p.is_free === true ||
            ((p.pricing?.input ?? 0) === 0 &&
             (p.pricing?.output ?? 0) === 0)
        )
        return {
          id: m.id,
          name: m.id.split('/').pop() ?? m.id,
          free: hasFreeProvider ?? false,
        }
      })
      .sort((a, b) => {
        // Free models first, then alphabetical
        if (a.free && !b.free) return -1
        if (!a.free && b.free) return 1
        return a.id.localeCompare(b.id)
      })
  } catch {
    // Fallback to a small curated list if the live fetch fails — these must be
    // real models on the HF inference router (keep in sync with
    // HuggingFace.supportedModels).
    return [
      { id: 'deepseek-ai/DeepSeek-V3-0324', name: 'DeepSeek V3', free: false },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', free: false },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', free: false },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', free: false },
      { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', free: false },
      { id: 'moonshotai/Kimi-K2-Instruct', name: 'Kimi K2', free: false },
      { id: 'mistralai/Mistral-Small-3.1-24B-Instruct', name: 'Mistral Small 3.1', free: false },
    ]
  }
}
