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

  return `You are a frontend developer. Generate a TypeScript React component named ${componentName}.

Project scope:
- Allowed: ${allowed.join(', ')}
- Forbidden: ${forbidden.join(', ')}

Stack:
${stack}

Constraints:
${constraints}

Hard validation rules — the component MUST pass all of these:
- Use Tailwind CSS classes for styling. Do NOT use inline styles (style={{...}}) or CSS-in-JS.
- Every <img> tag MUST have an alt attribute.
- Every <form> tag MUST have a name attribute.
- Only import from allowed packages: ${allowedDeps}.
- Do NOT import from forbidden packages: ${forbiddenDeps}.
- The component must be a default export (e.g. "export default function ${componentName}()" or "const ${componentName} = () => ...; export default ${componentName};").
- Do NOT use dangerouslySetInnerHTML, eval, new Function, document.write, or inline script tags.
- Make the component self-contained and responsive.

Skeleton:
export default function ${componentName}() {
  return (
    <div>
      {/* component */}
    </div>
  )
}

Output format: Return only the TypeScript React component code. No markdown, no explanation, no code fence markers.`
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
          ? 'This component should include images (use <img> with alt text).'
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
