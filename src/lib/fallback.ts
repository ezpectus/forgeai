import {
  ProviderError,
  type AIProvider,
  type GenConfig,
  type GenResult,
} from '@/types'

export interface FallbackTarget {
  provider: AIProvider
  model: string
}

export type ValidateResult = (result: GenResult) => void | Promise<void>

// Simple delay helper used to wait before retrying the next fallback provider.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Try each AI provider in the fallback chain, backing off when one is
 * rate-limited or down, so a single model failure does not stop generation.
 */
export async function callWithFallback(
  prompt: string,
  config: GenConfig,
  auth: Record<string, string>,
  chain: FallbackTarget[],
  validate?: ValidateResult
): Promise<GenResult> {
  const errors: string[] = []

  for (let i = 0; i < chain.length; i++) {
    const { provider, model } = chain[i]
    const apiKey = auth[provider.name]

    if (!apiKey) {
      errors.push(`${provider.name}: missing API key`)
      continue
    }

    try {
      const result = await provider.generate(prompt, { ...config, model }, apiKey)
      if (validate) {
        await validate(result)
      }
      return result
    } catch (err) {
      const status = err instanceof ProviderError ? err.status : 500
      const message = err instanceof Error ? err.message : String(err)

      // Move to the next provider on auth/missing-model/rate-limit/server
      // errors so a bad key or removed model on one provider does not kill
      // generation. Auth and missing-model errors need no cooldown; 429 and
      // 503 need a short one; other server errors get a tiny backoff.
      if (status === 401 || status === 403 || status === 404) {
        errors.push(`${provider.name}: ${message}`)
        continue
      }

      if (status === 429 || status === 503) {
        await sleep(Math.min(2 ** i * 2000, 8_000))
        errors.push(`${provider.name}: ${message}`)
        continue
      }

      if (status >= 500) {
        await sleep(Math.min(2 ** i * 1000, 8_000))
        errors.push(`${provider.name}: ${message}`)
        continue
      }

      throw new ProviderError(`${provider.name}: ${message}`, status)
    }
  }

  throw new ProviderError(`All providers failed: ${errors.join('; ')}`, 503)
}
