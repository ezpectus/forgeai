import { describe, expect, it, vi, afterEach } from 'vitest'
import { Gemini } from '@/plugins/providers/gemini'
import { ProviderError } from '@/types'

function makeSuccessResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: { parts: [{ text }] },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
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

describe('Gemini.generate', () => {
  it('returns code on success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        makeSuccessResponse('```tsx\nexport const Hero = () => <div>hi</div>\n```')
      )
    vi.stubGlobal('fetch', fetch)

    const result = await Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')

    expect(result.code).toBe('export const Hero = () => <div>hi</div>')
    expect(result.model).toBe('gemini-3.6-flash')
    expect(result.provider).toBe('gemini')
    expect(result.tokensIn).toBe(10)
    expect(result.tokensOut).toBe(20)
    expect(result.cost).toBeGreaterThan(0)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('fails fast on 429 without trying other models', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(429, 'Resource has been exhausted'))
    vi.stubGlobal('fetch', fetch)

    await expect(
      Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')
    ).rejects.toThrow('Resource has been exhausted')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the next model on 503 without sleeps', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(503, 'The model is overloaded'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')

    expect(result.code).toBe('ok')
    expect(result.model).toBe('gemini-3.5-flash')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('skips 404 and falls back', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(404, 'models/gemini-1.5-flash is not found'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')

    expect(result.code).toBe('ok')
    expect(result.model).toBe('gemini-3.5-flash')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on invalid key (400) without retry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        makeErrorResponse(400, 'API key not valid. Please pass a valid API key.')
      )
    vi.stubGlobal('fetch', fetch)

    await expect(
      Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')
    ).rejects.toThrow('API key not valid')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws ProviderError with the right status on quota', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(429, 'Resource has been exhausted'))
    vi.stubGlobal('fetch', fetch)

    let err: unknown
    try {
      await Gemini.generate('hero', { model: 'gemini-3.6-flash' }, 'key')
    } catch (e) {
      err = e
    }

    expect(err).toBeInstanceOf(ProviderError)
    expect((err as ProviderError).status).toBe(429)
  })
})
