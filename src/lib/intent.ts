import { callWithFallback } from './fallback'
import { buildProviderChain } from './provider-chain'
import { ProviderError } from '@/types'
import type { IntentResult, SectionIntent, GenResult } from '@/types'

const SYSTEM_PROMPT = `You analyze website requests. Return valid JSON only.

Plan CONTENT sections only — the site layout renders its own navigation bar,
so NEVER plan nav/navbar/header/topbar sections; they are dropped and waste
a generation call.

For "type" of each section, prefer these known kinds (the renderer + prompts
understand them best): hero, features, pricing, testimonials, faq, cta,
gallery, stats, team, contact-form, newsletter, footer, about,
services, portfolio-grid, steps, logos, comparison, banner. Use others only
when the request genuinely needs something unlisted.

Set "requiresImages": false — generated projects cannot ship image files;
sections use gradients, icons, and layout instead.

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
    .replace(/\n```\s*$/i, '')
    .trim()
}

// Remove trailing commas that are legal in JS but break JSON.parse.
// Keeps commas inside strings untouched.
function removeTrailingCommas(json: string): string {
  let out = ''
  let inString = false
  let escape = false
  for (let i = 0; i < json.length; i++) {
    const c = json[i]
    if (escape) {
      out += c
      escape = false
      continue
    }
    if (c === '\\') {
      out += c
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      out += c
      continue
    }
    if (!inString && c === ',') {
      let j = i + 1
      while (j < json.length && /\s/.test(json[j])) j++
      if (j < json.length && (json[j] === '}' || json[j] === ']')) {
        continue
      }
    }
    out += c
  }
  return out
}

function safeJsonParse(text: string): unknown {
  const cleaned = removeTrailingCommas(stripJsonBlock(text))
  return JSON.parse(cleaned)
}

/**
 * Turn an AI-provided section name into a safe JS identifier (PascalCase).
 * `assembleProject` interpolates this into `import X from ...` and `<X />` —
 * a raw name like "contact-form" or "my hero" produces uncompilable output.
 */
export function toIdentifier(raw: string): string {
  const words = raw.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/)
  const id = words
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    .replace(/^[^A-Za-z_]+/, '')
  return id
}

/**
 * Turn an AI-provided page name into a safe Next.js route segment.
 * Prevents `../`-style escapes, `a/b` nesting, and reserved segments.
 */
export function toPageSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) return 'index'
  if (slug === 'api' || slug.startsWith('_')) return `p-${slug}`
  return slug
}

// Normalize a raw section object into a typed `SectionIntent`, or reject it.
function asSection(raw: unknown): SectionIntent | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rawName = typeof r.name === 'string' ? r.name : ''
  const name = toIdentifier(rawName)
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
      typeof r.page === 'string' && r.page
        ? toPageSlug(r.page)
        : 'index',
  }
}

/** Two sections sanitizing to the same identifier would collide on import. */
function dedupeSections(sections: SectionIntent[]): SectionIntent[] {
  const counts = new Map<string, number>()
  return sections.map((s) => {
    const n = (counts.get(s.name) ?? 0) + 1
    counts.set(s.name, n)
    return n === 1 ? s : { ...s, name: `${s.name}${n}` }
  })
}

const DEFAULT_INTENT: IntentResult = {
  type: 'landing',
  sections: [
    {
      name: 'Hero',
      type: 'hero',
      description: 'Main headline and call to action',
      priority: 1,
      page: 'index',
    },
    {
      name: 'Features',
      type: 'features',
      description: 'Key selling points',
      priority: 2,
      page: 'index',
    },
    {
      name: 'Pricing',
      type: 'pricing',
      description: 'Pricing plans',
      priority: 3,
      page: 'index',
    },
    {
      name: 'Footer',
      type: 'footer',
      description: 'Footer with links and copyright',
      priority: 4,
      page: 'index',
    },
  ],
  palette: 'slate-blue',
  dbRequired: false,
  dbForms: [],
  pages: ['index'],
  audience: 'general',
  tone: 'professional',
  style: 'modern',
}

/**
 * Send the user's prompt to an AI model and convert the returned JSON into a
 * structured build plan: sections, palette, tone, and whether a database is needed.
 */
export async function analyzeIntent(
  prompt: string,
  auth: Record<string, string>,
  preferred?: { provider: string; model: string },
  signal?: AbortSignal
): Promise<IntentResult> {
  const chain = buildProviderChain(auth, preferred)

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
        signal,
      },
      auth,
      chain,
      (res: GenResult) => {
        const parsed = safeJsonParse(res.code)
        if (!parsed || typeof parsed !== 'object') {
          throw new ProviderError('AI returned non-object JSON', 503)
        }
      }
    )

    const parsed = safeJsonParse(result.code) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_INTENT, warning: 'Could not parse AI response. Using a default plan.' }
    }

    const data = parsed as Record<string, unknown>
    let usedDefaults = false

    const rawSections = data.sections
    const sections = Array.isArray(rawSections)
      ? dedupeSections(
          rawSections.map(asSection).filter(Boolean) as SectionIntent[]
        )
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
      ? Array.from(
          new Set(data.pages.map((p) => toPageSlug(String(p))))
        )
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
    // Cancellation is not a parse failure — rethrow so the route sees the 499
    // instead of falling back to a default plan the client no longer wants.
    if (signal?.aborted || (err instanceof ProviderError && err.status === 499)) {
      throw err
    }
    console.error('[analyzeIntent] failed:', err)
    const message = (err instanceof Error ? err.message : String(err)).trim().replace(/[.!?;:,]+$/, '')
    return {
      ...DEFAULT_INTENT,
      warning: `Intent analysis failed: ${message}. Using a default plan.`,
    }
  }
}
