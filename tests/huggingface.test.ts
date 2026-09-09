import { describe, expect, it, vi, afterEach } from 'vitest'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { ProviderError } from '@/types'

function makeSuccessResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => [{ generated_text: text }],
  }
}

function makeErrorResponse(status: number, text: string) {
  return {
    ok: false,
    status,
    text: async () => text,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HuggingFace.generate', () => {
  it('returns code on success', async () => {
    const fetch = vi.fn().mockResolvedValue(makeSuccessResponse('export const Hero = () => <div>hi</div>'))
    vi.stubGlobal('fetch', fetch)

    const result = await HuggingFace.generate(
      'hero',
      { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' },
      'key'
    )

    expect(result.code).toBe('export const Hero = () => <div>hi</div>')
    expect(result.model).toBe('deepseek-ai/deepseek-coder-6.7b-instruct')
    expect(result.provider).toBe('huggingface')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('fails fast on 429 without trying the other model', async () => {
    const fetch = vi.fn().mockResolvedValue(makeErrorResponse(429, 'Rate limit exceeded'))
    vi.stubGlobal('fetch', fetch)

    await expect(
      HuggingFace.generate('hero', { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' }, 'key')
    ).rejects.toThrow('Rate limit exceeded')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the next model on 503 without sleeps', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await HuggingFace.generate(
      'hero',
      { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('THUDM/glm-4-9b-chat')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('skips 404 and falls back', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(404, 'Model not found'))
      .mockResolvedValueOnce(makeSuccessResponse('ok'))
    vi.stubGlobal('fetch', fetch)

    const result = await HuggingFace.generate(
      'hero',
      { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' },
      'key'
    )

    expect(result.code).toBe('ok')
    expect(result.model).toBe('THUDM/glm-4-9b-chat')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on invalid key (400) without retry', async () => {
    const fetch = vi.fn().mockResolvedValue(makeErrorResponse(400, 'Invalid token'))
    vi.stubGlobal('fetch', fetch)

    await expect(
      HuggingFace.generate('hero', { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' }, 'key')
    ).rejects.toThrow('Invalid token')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws ProviderError with the right status on quota', async () => {
    const fetch = vi.fn().mockResolvedValue(makeErrorResponse(429, 'Rate limit exceeded'))
    vi.stubGlobal('fetch', fetch)

    let err: unknown
    try {
      await HuggingFace.generate('hero', { model: 'deepseek-ai/deepseek-coder-6.7b-instruct' }, 'key')
    } catch (e) {
      err = e
    }

    expect(err).toBeInstanceOf(ProviderError)
    expect((err as ProviderError).status).toBe(429)
  })
})
