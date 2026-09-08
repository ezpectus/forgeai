import { describe, expect, it } from 'vitest'
import { ProviderError } from '@/types'
import { callWithFallback } from '@/lib/fallback'
import type { AIProvider, GenConfig, GenResult } from '@/types'

function makeProvider(result: 'ok' | 'rate' | 'auth'): AIProvider {
  return {
    name: 'openrouter',
    supportedModels: ['m'],
    defaultModel: 'm',
    async generate(
      _prompt: string,
      _config: GenConfig,
      _apiKey: string
    ): Promise<GenResult> {
      if (result === 'ok') {
        return {
          code: 'ok',
          model: 'm',
          provider: 'openrouter',
          tokensIn: 1,
          tokensOut: 1,
          cost: 0,
        }
      }
      if (result === 'rate') {
        throw new ProviderError('rate limited', 429)
      }
      throw new ProviderError('unauthorized', 401)
    },
    async health(): Promise<boolean> {
      return true
    },
    estimateCost(): number {
      return 0
    },
  }
}

describe('callWithFallback', () => {
  it('returns the first successful provider', async () => {
    const result = await callWithFallback(
      'prompt',
      {},
      { openrouter: 'key' },
      [{ provider: makeProvider('ok'), model: 'm' }]
    )
    expect(result.code).toBe('ok')
  })

  it('retries on 429 and falls back', async () => {
    const result = await callWithFallback(
      'prompt',
      {},
      { openrouter: 'key' },
      [
        { provider: makeProvider('rate'), model: 'm' },
        { provider: makeProvider('ok'), model: 'm' },
      ]
    )
    expect(result.code).toBe('ok')
  })

  it('throws when all providers fail', async () => {
    await expect(
      callWithFallback(
        'prompt',
        {},
        { openrouter: 'key' },
        [{ provider: makeProvider('rate'), model: 'm' }]
      )
    ).rejects.toThrow('All providers failed')
  })
})
