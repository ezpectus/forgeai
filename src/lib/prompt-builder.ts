import type { ComponentSpec, IntentResult } from '@/types'

export function buildSystemPrompt(
  config: ComponentSpec,
  componentName: string
): string {
  const allowed = config.scope?.allowed ?? []
  const forbidden = config.scope?.forbidden ?? []
  const stack = JSON.stringify(config.stack ?? {}, null, 2)
  const constraints = JSON.stringify(config.constraints ?? {}, null, 2)

  return `You are a frontend developer. Generate a TypeScript React component named ${componentName}.

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
    <div>
      {/* component */}
    </div>
  )
}

Output format: Return only the TypeScript React component code. No markdown, no explanation.`
}

export function buildUserPrompt(
  intent: IntentResult,
  componentName: string,
  prompt: string
): string {
  return `User request: ${prompt}
Component: ${componentName}
Sections: ${intent.sections.map((s) => s.name).join(', ')}
Palette: ${intent.palette}
Audience: ${intent.audience ?? 'general'}
Tone: ${intent.tone ?? 'professional'}
Style: ${intent.style ?? 'modern'}`
}
