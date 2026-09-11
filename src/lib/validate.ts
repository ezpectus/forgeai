import { transform } from 'esbuild'

export interface ValidationDeps {
  allowed?: string[]
  forbidden?: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Run a configurable set of validation rules against a generated component
 * before it is accepted into the project. Catches syntax errors, disallowed
 * imports, unsafe patterns, and missing accessibility requirements.
 */
export async function validateComponent(
  name: string,
  code: string,
  rules: string[],
  deps?: ValidationDeps
): Promise<ValidationResult> {
  const errors: string[] = []

  // Pattern rules run on the esbuild-transformed output: comments are stripped
  // so a `// no eval here` comment or JSDoc can't false-positive a rejection
  // that would burn a paid regeneration attempt.
  let transformed: string | null = null

  if (rules.includes('syntax')) {
    try {
      transformed = (await transform(code, { loader: 'tsx', format: 'esm' }))
        .code
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`syntax: ${message}`)
    }
  }

  // Identifier/statement-level patterns (eval, __proto__, dangerous props)
  // survive the JSX→jsx() transform, so scan the transformed output where
  // comments are stripped. Element-level patterns (<img, <form, style={{)
  // must run on the raw source — the transform rewrites JSX syntax away.
  const patternSource = transformed ?? code

  if (
    rules.includes('noForbiddenImports') ||
    rules.includes('noUnusedImports')
  ) {
    const importMatches = code.matchAll(
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    )
    const imports = Array.from(importMatches).map((m) => m[1])

    if (rules.includes('noForbiddenImports') && deps?.forbidden) {
      for (const dep of imports) {
        if (deps.forbidden.includes(dep)) {
          errors.push(`forbidden import: ${dep}`)
        }
      }
    }

    if (rules.includes('noForbiddenImports') && deps?.allowed) {
      for (const dep of imports) {
        // For scoped packages like @supabase/supabase-js, take the first two
        // segments. For non-scoped like react, take the first segment.
        const pkg = dep.startsWith('@')
          ? dep.split('/').slice(0, 2).join('/')
          : dep.split('/')[0]
        if (!deps.allowed.includes(pkg)) {
          errors.push(`unallowed import: ${pkg}`)
        }
      }
    }

    if (rules.includes('noUnusedImports')) {
      const used = Array.from(
        code.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g)
      ).map((m) => m[1])
      const importsWithIdentifiers = Array.from(
        code.matchAll(
          /import\s+(?:\{([^}]+)\}\s+from|([A-Za-z_$][A-Za-z0-9_$]*)\s+from)\s+['"]([^'"]+)['"]/g
        )
      )
      for (const m of importsWithIdentifiers) {
        const ids = (m[1] ?? m[2] ?? '').split(',').map((s) => s.trim())
        for (const id of ids) {
          if (!id || id === '*') continue
          const count = used.filter((u) => u === id).length
          if (count <= 1) {
            errors.push(`unused import: ${id}`)
          }
        }
      }
    }
  }

  if (rules.includes('noDangerousHtml')) {
    if (/dangerouslySetInnerHTML/.test(patternSource)) {
      errors.push('dangerouslySetInnerHTML is forbidden')
    }
  }

  if (rules.includes('noScript')) {
    if (/<script\b/i.test(code)) { // security-scan:ignore detection regex
      errors.push('inline <script> tags are forbidden') // security-scan:ignore error message text
    }
  }

  if (rules.includes('noPrototypePollution')) {
    if (/\b__proto__\b/.test(patternSource) || /constructor\.prototype/.test(patternSource)) {
      errors.push('prototype pollution patterns are forbidden')
    }
  }

  if (rules.includes('noPromptInjection')) {
    // Deliberately scan the raw source: an injected instruction inside a
    // comment is still shipped in the exported file and is the tell-tale
    // payload — unlike eval, a comment mention here is itself the problem.
    if (
      /ignore\s+(all\s+)?previous\s+instructions/i.test(code) ||
      /disregard\s+(all\s+)?previous\s+instructions/i.test(code)
    ) {
      errors.push('prompt-injection instructions are forbidden')
    }
  }

  if (rules.includes('noEval')) {
    if (
      /\beval\s*\(/.test(patternSource) ||
      /new\s+Function\s*\(/.test(patternSource) ||
      /document\.write\s*\(/.test(patternSource)
    ) {
      errors.push('eval, new Function, or document.write is forbidden')
    }
  }

  if (rules.includes('usesTailwindOnly')) {
    if (/style=\{\{/.test(code)) {
      errors.push('inline styles (style={{...}}) are forbidden')
    }
  }

  if (rules.includes('hasDefaultExport')) {
    // Accept `export default function`, `export default () =>`, `export default Hero`, etc.
    if (!/export\s+default\s+(?:function|class|\(|\w|<)/i.test(code)) {
      errors.push('component must have a default export')
    }
  }

  if (rules.includes('imagesHaveAlt')) {
    const imgTags = Array.from(code.matchAll(/<img[^>]*>/g))
    for (const [tag] of imgTags) {
      if (!/alt=/.test(tag)) {
        errors.push('img tag missing alt attribute')
        break
      }
    }
  }

  if (rules.includes('noLocalImageRefs')) {
    // Generated projects contain no public/ image files — a local <img src>
    // is guaranteed to 404. External URLs or CSS/lucide icons instead.
    if (/<img[^>]+src=["']\/[^/]/i.test(code)) {
      errors.push(
        'local image references are forbidden — no image files are generated; use an external URL, CSS, or a lucide icon'
      )
    }
  }

  if (rules.includes('formsHaveNames')) {
    const forms = Array.from(code.matchAll(/<form[^>]*>/g))
    for (const [form] of forms) {
      if (!/name=/.test(form)) {
        errors.push('form tag missing name attribute')
        break
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [] }
}
