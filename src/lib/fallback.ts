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
  chain: FallbackTarget[]
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
      return await provider.generate(prompt, { ...config, model }, apiKey)
    } catch (err) {
      const status = err instanceof ProviderError ? err.status : 500
      const message = err instanceof Error ? err.message : String(err)

      // Retry on auth/missing-model errors and rate limits / server errors so
      // a bad key or removed model on one provider does not kill generation.
      if (
        status === 401 ||
        status === 403 ||
        status === 404 ||
        status === 429 ||
        status >= 500
      ) {
        // Capacity (503) needs a longer wait; rate limits (429) need less but
        // still enough to clear; other transient errors use short backoff.
        const delay =
          status === 503
            ? Math.min(2 ** i * 5000, 30_000)
            : status === 429
              ? Math.min(2 ** i * 2000, 8_000)
              : Math.min(2 ** i * 1000, 8_000)
        await sleep(delay)
        errors.push(`${provider.name}: ${message}`)
        continue
      }

      throw new ProviderError(`${provider.name}: ${message}`, status)
    }
  }

  throw new ProviderError(`All providers failed: ${errors.join('; ')}`, 503)
}
