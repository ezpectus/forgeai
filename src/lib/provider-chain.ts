import { providers } from '@/plugins/providers'
import type { AIProvider } from '@/types'

export interface ChainTarget {
  provider: AIProvider
  model: string
}

/**
 * Build the ordered list of AI providers to try, based on which keys the user
 * has set. A valid preferred provider+model is tried first, then every other
 * configured provider's default model.
 */
export function buildProviderChain(
  auth: Record<string, string>,
  preferred?: { provider: string; model: string }
): ChainTarget[] {
  const chain: ChainTarget[] = []
  const seen = new Set<string>()

  if (preferred && auth[preferred.provider]) {
    const provider = providers.find((p) => p.name === preferred.provider)
    if (provider) {
      chain.push({ provider, model: preferred.model })
      seen.add(provider.name)
    }
  }

  for (const provider of providers) {
    if (auth[provider.name] && !seen.has(provider.name)) {
      chain.push({ provider, model: provider.defaultModel })
      seen.add(provider.name)
    }
  }

  return chain
}
