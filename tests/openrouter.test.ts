import { describe, expect, it, vi, afterEach } from 'vitest'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { ProviderError } from '@/types'

// Stable test fallback list. OpenRouter.supportedModels is now intentionally
// empty in production, so tests provide their own fallback.
const fallbackList = [
  'poolside/laguna-s-2.1:free',
  'thinkingmachines/inkling:free',
  'google/gemma-4-31b:free',
]

function makeSuccessResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  }
}

function makeErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OpenRouter.generate', () => {
  it('returns code on success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        makeSuccessResponse('```tsx\nexport const Hero = () => <div>hi</div>\n```')
      )
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('export const Hero = () => <div>hi</div>')
    expect(result.model).toBe('poolside/laguna-s-2.1:free')
    expect(result.provider).toBe('openrouter')
    expect(result.tokensIn).toBe(10)
    expect(result.tokensOut).toBe(20)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('fails fast on 429 without trying other models', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(429, 'Rate limit exceeded'))
    vi.stubGlobal('fetch', fetch)

    await expect(
      OpenRouter.generate(
        'hero',
        { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
        'key'
      )
    ).rejects.toThrow('Rate limit exceeded')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the next model on 503 without sleeps', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('thinkingmachines/inkling:free')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('skips 404 and falls back', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(404, 'Model not found'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('thinkingmachines/inkling:free')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on invalid key (400) without retry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(400, 'Invalid API key'))
    vi.stubGlobal('fetch', fetch)

    await expect(
      OpenRouter.generate(
        'hero',
        { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
        'key'
      )
    ).rejects.toThrow('Invalid API key')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('switches to free models after 402 and returns the first free success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(402, 'No credits'))
      .mockResolvedValueOnce(makeSuccessResponse('free model ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('free model ok')
    expect(result.model).toBe('thinkingmachines/inkling:free')
    expect(result.cost).toBe(0)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws ProviderError with the right status on quota', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(429, 'Rate limit exceeded'))
    vi.stubGlobal('fetch', fetch)

    let err: unknown
    try {
      await OpenRouter.generate(
        'hero',
        { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
        'key'
      )
    } catch (e) {
      err = e
    }

    expect(err).toBeInstanceOf(ProviderError)
    expect((err as ProviderError).status).toBe(429)
  })

  it('skips 400 "invalid model" and falls back', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(400, 'poolside/laguna-s-2.1:free is not a valid model ID'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'poolside/laguna-s-2.1:free', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('thinkingmachines/inkling:free')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('tries a requested model even if not in the fallback list, then falls back on 400', async () => {
    // First call: API rejects the stale model with 400 "not a valid model"
    // Second call: API succeeds with the first fallback model
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(400, 'stale/unknown-model is not a valid model'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await OpenRouter.generate(
      'hero',
      { model: 'stale/unknown-model', fallback: fallbackList },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('poolside/laguna-s-2.1:free')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
