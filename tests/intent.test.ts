import { describe, expect, it, vi } from 'vitest'
import { analyzeIntent } from '@/lib/intent'

const mockIntent = {
  type: 'landing',
  sections: [
    { name: 'hero', type: 'hero', description: 'Hero', priority: 1 },
  ],
  palette: 'slate',
  dbRequired: false,
  dbForms: [],
  pages: ['index'],
  audience: 'general',
  tone: 'professional',
  style: 'modern',
}

describe('analyzeIntent', () => {
  it('returns parsed intent on success', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n' + JSON.stringify(mockIntent) + '\n```',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      }),
    })
    vi.stubGlobal('fetch', fetch)

    const result = await analyzeIntent('yoga studio landing', { openrouter: 'fake-key' })
    expect(result.type).toBe('landing')
    expect(result.sections[0].name).toBe('hero')
    expect(fetch).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('returns default intent on provider error', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Unauthorized' } }),
    })
    vi.stubGlobal('fetch', fetch)

    const result = await analyzeIntent('yoga studio landing', { openrouter: 'fake-key' })
    expect(result.type).toBe('landing')
    expect(result.sections.length).toBeGreaterThan(0)

    vi.unstubAllGlobals()
  })
})
