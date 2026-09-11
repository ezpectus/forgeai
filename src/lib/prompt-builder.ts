import type { ComponentSpec, IntentResult } from '@/types'

export function buildSystemPrompt(
  config: ComponentSpec,
  componentName: string
): string {
  const allowed = config.scope?.allowed ?? []
  const forbidden = config.scope?.forbidden ?? []
  const stack = JSON.stringify(config.stack ?? {}, null, 2)
  const constraints = JSON.stringify(config.constraints ?? {}, null, 2)
  const allowedDeps = (
    (config.constraints?.allowedDependencies ?? []) as string[]
  ).join(', ') || 'react, next, lucide-react'
  const forbiddenDeps = (
    (config.constraints?.forbiddenDependencies ?? []) as string[]
  ).join(', ')

  return `You are a senior frontend developer generating ONE section of a larger landing page. Output a TypeScript React component named ${componentName}.

== Design principles (quality bar) ==
- Write REAL copy, not placeholder. Concrete business names, prices, quotes, hours — invented but plausible and specific to the request. "Join 2,400+ members" beats "Join us". Never use "Lorem", "placeholder", "Sample" or TODO text.
- Structure beats decoration: semantic tags (<section>, <header>, <nav>, <footer>), one <h2>/<h3> hierarchy per section, aria-labels on interactive elements.
- Data-driven markup: repeated cards/items go through const data = [...] + .map() — never copy-paste the same block three times.
- Layout rhythm: wrap content in <section className="py-16 md:py-24"> + <div className="container mx-auto px-4 max-w-6xl">. Responsive first: grid-cols-1 → md:grid-cols-2/3.
- Visual hierarchy: one dominant headline, supporting subline, clear CTA. Sections need whitespace — generous padding, muted backgrounds alternating (e.g. bg-white ↔ bg-{palette}-50).
- Icons come from lucide-react imports — never emojis or hand-drawn SVG blobs.

== Hard rules (a violation = regeneration, costs money) ==
- Tailwind classes ONLY. No style={{...}}, no <style> blocks, no CSS-in-JS.
- NO local images: <img src="/..."> is FORBIDDEN — generated projects ship zero image files, the src will 404. For visuals use Tailwind gradients (bg-gradient-to-br from-...-400 to-...-300), colored panels, initials avatars, or lucide icons. If an <img> is truly needed, only a full https:// URL is allowed — and prefer not to.
- NO navigation/navbar/header markup — the site layout already renders a shared Nav. Your section starts below it.
- Every <img> needs alt; every <form> needs a name attribute.
- Only import from: ${allowedDeps}. Never import from: ${forbiddenDeps}.
- Default export: "export default function ${componentName}()".
- No dangerouslySetInnerHTML, eval, new Function, document.write, or script tags.
- Interactivity (useState, onClick, useEffect) requires 'use client' as the first line. Static sections must NOT include it.

Project scope:
- Allowed: ${allowed.join(', ')}
- Forbidden: ${forbidden.join(', ')}

Stack:
${stack}

Constraints:
${constraints}

Skeleton:
export default function ${componentName}() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* real content */}
      </div>
    </section>
  )
}

Output format: Return only the component code. No markdown fences, no commentary, no imports of other generated sections.`
}

export function buildUserPrompt(
  intent: IntentResult,
  componentName: string,
  prompt: string
): string {
  const section = intent.sections.find((s) => s.name === componentName)
  const details = section
    ? [
        `Type: ${section.type}`,
        `Description: ${section.description}`,
        section.requiresForm
          ? 'This component MUST contain a <form> element with a name attribute.'
          : null,
        section.requiresImages
          ? 'This section benefits from visuals — render them as Tailwind gradients/panels or lucide icons (local image files do not exist).'
          : null,
        `Target page: ${section.page ?? 'index'}`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return `User request: ${prompt}
Component: ${componentName}
${details}
Sections: ${intent.sections.map((s) => s.name).join(', ')}
Palette: ${intent.palette}
Audience: ${intent.audience ?? 'general'}
Tone: ${intent.tone ?? 'professional'}
Style: ${intent.style ?? 'modern'}`
}
