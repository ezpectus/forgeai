import { callWithFallback } from './fallback'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { Gemini } from '@/plugins/providers/gemini'
import { HuggingFace } from '@/plugins/providers/huggingface'
import type { AIProvider, IntentResult, SectionIntent } from '@/types'

const SYSTEM_PROMPT = `You analyze website requests. Return valid JSON only.
Schema: {
  "type": "landing" | "multi-page" | "portfolio",
  "sections": [
    {
      "name": "...",
      "type": "...",
      "description": "...",
      "priority": 1,
      "requiresForm": false,
      "requiresImages": false
    }
  ],
  "palette": "...",
  "dbRequired": false,
  "dbForms": ["..."],
  "pages": ["index"],
  "audience": "...",
  "tone": "...",
  "style": "..."
}`

// Clean up a JSON code block wrapper so the raw JSON can be parsed.
function stripJsonBlock(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

// Normalize a raw section object into a typed `SectionIntent`, or reject it.
function asSection(raw: unknown): SectionIntent | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name : ''
  if (!name) return null
  return {
    name,
    type: typeof r.type === 'string' ? r.type : 'section',
    description:
      typeof r.description === 'string' ? r.description : `A ${name} section`,
    priority: typeof r.priority === 'number' ? r.priority : 0,
    requiresForm: r.requiresForm === true,
    requiresImages: r.requiresImages === true,
  }
}

const DEFAULT_INTENT: IntentResult = {
  type: 'landing',
  sections: [
    {
      name: 'hero',
      type: 'hero',
      description: 'Main headline and call to action',
      priority: 1,
    },
    {
      name: 'features',
      type: 'features',
      description: 'Key selling points',
      priority: 2,
    },
    {
      name: 'pricing',
      type: 'pricing',
      description: 'Pricing plans',
      priority: 3,
    },
    {
      name: 'contact-form',
      type: 'contact-form',
      description: 'Contact or booking form',
      priority: 4,
      requiresForm: true,
    },
    {
      name: 'footer',
      type: 'footer',
      description: 'Footer with links and copyright',
      priority: 5,
    },
  ],
  palette: 'slate-blue',
  dbRequired: true,
  dbForms: ['contact-form: name, email, message'],
  pages: ['index'],
  audience: 'general',
  tone: 'professional',
  style: 'modern',
}

/**
 * Send the user's prompt to an AI model and convert the returned JSON into a
 * structured build plan: sections, palette, tone, and whether a database is needed.
 */
function buildChain(auth: Record<string, string>) {
  const chain: { provider: AIProvider; model: string }[] = []

  if (auth.openrouter) {
    chain.push({ provider: OpenRouter, model: 'deepseek/deepseek-chat' })
  }

  if (auth.gemini) {
    chain.push({ provider: Gemini, model: 'gemini-1.5-flash' })
  }

  if (auth.huggingface) {
    chain.push({
      provider: HuggingFace,
      model: 'deepseek-ai/deepseek-coder-6.7b-instruct',
    })
  }

  return chain
}

export async function analyzeIntent(
  prompt: string,
  auth: Record<string, string>
): Promise<IntentResult> {
  const chain = buildChain(auth)

  if (chain.length === 0) {
    return DEFAULT_INTENT
  }

  try {
    const result = await callWithFallback(
      prompt,
      {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 1024,
      },
      auth,
      chain
    )

    const cleaned = stripJsonBlock(result.code)
    const parsed = JSON.parse(cleaned) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_INTENT
    }

    const data = parsed as Record<string, unknown>

    const sections = Array.isArray(data.sections)
      ? (data.sections.map(asSection).filter(Boolean) as SectionIntent[])
      : DEFAULT_INTENT.sections

    if (sections.length === 0) {
      return DEFAULT_INTENT
    }

    const dbForms = Array.isArray(data.dbForms)
      ? data.dbForms.map((f) =>
          typeof f === 'string'
            ? f
            : `${(f as Record<string, unknown>).name}: ${Array.isArray((f as Record<string, unknown>).fields) ? ((f as Record<string, unknown>).fields as string[]).join(', ') : ''}`
        )
      : DEFAULT_INTENT.dbForms

    return {
      type: typeof data.type === 'string' ? data.type : DEFAULT_INTENT.type,
      sections,
      palette:
        typeof data.palette === 'string'
          ? data.palette
          : DEFAULT_INTENT.palette,
      dbRequired: data.dbRequired === true,
      dbForms,
      pages: Array.isArray(data.pages)
        ? data.pages.map((p) => String(p))
        : DEFAULT_INTENT.pages,
      audience:
        typeof data.audience === 'string'
          ? data.audience
          : DEFAULT_INTENT.audience,
      tone: typeof data.tone === 'string' ? data.tone : DEFAULT_INTENT.tone,
      style: typeof data.style === 'string' ? data.style : DEFAULT_INTENT.style,
    }
  } catch {
    return DEFAULT_INTENT
  }
}
