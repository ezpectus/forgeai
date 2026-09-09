import { callWithFallback } from './fallback'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { Gemini } from '@/plugins/providers/gemini'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { providers } from '@/plugins/providers'
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
      "requiresImages": false,
      "page": "index"
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
    page:
      typeof r.page === 'string' && r.page ? (r.page as string) : 'index',
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
      page: 'index',
    },
    {
      name: 'features',
      type: 'features',
      description: 'Key selling points',
      priority: 2,
      page: 'index',
    },
    {
      name: 'pricing',
      type: 'pricing',
      description: 'Pricing plans',
      priority: 3,
      page: 'index',
    },
    {
      name: 'contact-form',
      type: 'contact-form',
      description: 'Contact or booking form',
      priority: 4,
      requiresForm: true,
      page: 'index',
    },
    {
      name: 'footer',
      type: 'footer',
      description: 'Footer with links and copyright',
      priority: 5,
      page: 'index',
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
function buildChain(
  auth: Record<string, string>,
  preferred?: { provider: string; model: string }
) {
  const chain: { provider: AIProvider; model: string }[] = []
  const seen = new Set<string>()

  if (preferred && auth[preferred.provider]) {
    const provider = providers.find((p) => p.name === preferred.provider)
    if (provider) {
      chain.push({ provider, model: preferred.model })
      seen.add(provider.name)
    }
  }

  if (auth.openrouter && !seen.has('openrouter')) {
    chain.push({ provider: OpenRouter, model: 'deepseek/deepseek-chat' })
    seen.add('openrouter')
  }

  if (auth.gemini && !seen.has('gemini')) {
    chain.push({ provider: Gemini, model: 'gemini-1.5-flash' })
    seen.add('gemini')
  }

  if (auth.huggingface && !seen.has('huggingface')) {
    chain.push({
      provider: HuggingFace,
      model: 'deepseek-ai/deepseek-coder-6.7b-instruct',
    })
    seen.add('huggingface')
  }

  return chain
}

export async function analyzeIntent(
  prompt: string,
  auth: Record<string, string>,
  preferred?: { provider: string; model: string }
): Promise<IntentResult> {
  const chain = buildChain(auth, preferred)

  if (chain.length === 0) {
    return { ...DEFAULT_INTENT, warning: 'No API keys configured. Using a default plan.' }
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
      return { ...DEFAULT_INTENT, warning: 'Could not parse AI response. Using a default plan.' }
    }

    const data = parsed as Record<string, unknown>
    let usedDefaults = false

    const rawSections = data.sections
    const sections = Array.isArray(rawSections)
      ? (rawSections.map(asSection).filter(Boolean) as SectionIntent[])
      : DEFAULT_INTENT.sections
    usedDefaults =
      usedDefaults ||
      !Array.isArray(rawSections) ||
      (Array.isArray(rawSections) && rawSections.length !== sections.length)

    if (sections.length === 0) {
      return { ...DEFAULT_INTENT, warning: 'AI returned no valid sections. Using a default plan.' }
    }

    const dbForms = Array.isArray(data.dbForms)
      ? data.dbForms.map((f) =>
          typeof f === 'string'
            ? f
            : `${(f as Record<string, unknown>).name}: ${Array.isArray((f as Record<string, unknown>).fields) ? ((f as Record<string, unknown>).fields as string[]).join(', ') : ''}`
        )
      : DEFAULT_INTENT.dbForms
    usedDefaults = usedDefaults || !Array.isArray(data.dbForms)

    const type = typeof data.type === 'string' ? data.type : DEFAULT_INTENT.type
    usedDefaults = usedDefaults || typeof data.type !== 'string'

    const palette =
      typeof data.palette === 'string'
        ? data.palette
        : DEFAULT_INTENT.palette
    usedDefaults = usedDefaults || typeof data.palette !== 'string'

    const pages = Array.isArray(data.pages)
      ? data.pages.map((p) => String(p))
      : DEFAULT_INTENT.pages
    usedDefaults = usedDefaults || !Array.isArray(data.pages)

    const audience =
      typeof data.audience === 'string'
        ? data.audience
        : DEFAULT_INTENT.audience
    usedDefaults = usedDefaults || typeof data.audience !== 'string'

    const tone = typeof data.tone === 'string' ? data.tone : DEFAULT_INTENT.tone
    usedDefaults = usedDefaults || typeof data.tone !== 'string'

    const style =
      typeof data.style === 'string' ? data.style : DEFAULT_INTENT.style
    usedDefaults = usedDefaults || typeof data.style !== 'string'

    const intent: IntentResult = {
      type,
      sections,
      palette,
      dbRequired: data.dbRequired === true,
      dbForms,
      pages,
      audience,
      tone,
      style,
    }

    if (usedDefaults) {
      intent.warning = 'Some preferences could not be parsed and were filled with defaults.'
    }

    return intent
  } catch (err) {
    console.error('[analyzeIntent] failed:', err)
    const message = (err instanceof Error ? err.message : String(err)).trim().replace(/[.!?;:,]+$/, '')
    return {
      ...DEFAULT_INTENT,
      warning: `Intent analysis failed: ${message}. Using a default plan.`,
    }
  }
}
