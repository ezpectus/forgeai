import { transform } from 'esbuild'

export interface ValidationDeps {
  allowed?: string[]
  forbidden?: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export async function validateComponent(
  name: string,
  code: string,
  rules: string[],
  deps?: ValidationDeps
): Promise<ValidationResult> {
  const errors: string[] = []

  if (rules.includes('syntax')) {
    try {
      await transform(code, { loader: 'tsx', format: 'esm' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`syntax: ${message}`)
    }
  }

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
        const pkg = dep.split('/')[0]
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
    if (/dangerouslySetInnerHTML/.test(code)) {
      errors.push('dangerouslySetInnerHTML is forbidden')
    }
  }

  if (rules.includes('noScript')) {
    if (/<script\b/i.test(code)) { // security-scan:ignore detection regex
      errors.push('inline <script> tags are forbidden') // security-scan:ignore error message text
    }
  }

  if (rules.includes('noPrototypePollution')) {
    if (/\b__proto__\b/.test(code) || /constructor\.prototype/.test(code)) {
      errors.push('prototype pollution patterns are forbidden')
    }
  }

  if (rules.includes('noPromptInjection')) {
    if (
      /ignore\s+(all\s+)?previous\s+instructions/i.test(code) ||
      /disregard\s+(all\s+)?previous\s+instructions/i.test(code)
    ) {
      errors.push('prompt-injection instructions are forbidden')
    }
  }

  if (rules.includes('noEval')) {
    if (
      /\beval\s*\(/.test(code) ||
      /new\s+Function\s*\(/.test(code) ||
      /document\.write\s*\(/.test(code)
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
    if (!/export\s+default\s+function/.test(code)) {
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
