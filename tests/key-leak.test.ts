import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')
const scanner = resolve(repoRoot, 'scripts/security-scan.mjs')

function runScanner(cwd: string) {
  try {
    const output = execFileSync(
      process.execPath,
      [scanner],
      { cwd, encoding: 'utf-8' }
    )
    return { exitCode: 0, output }
  } catch (err: unknown) {
    const error = err as { status: number; stdout?: string }
    return {
      exitCode: error.status as number,
      output: (error.stdout ?? '') as string,
    }
  }
}

describe('security and key leak scan', () => {
  it('finds no leaks in the actual codebase', () => {
    const { exitCode, output } = runScanner(repoRoot)
    expect(exitCode).toBe(0)
    expect(output).toContain('No potential secrets or dangerous patterns found')
  })

  it('detects leaked keys and dangerous patterns in a fixture', () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), 'forgeai-security-'))

    const fixture = `
export default function Evil() {
  const key = 'sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  const hf = 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  const vercel = 'vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  eval("document.location = 'https://evil.com'")
  return <div><script>alert(1)</script></div>
}
`
    writeFileSync(resolve(tempDir, 'insecure.tsx'), fixture)

    try {
      const { exitCode, output } = runScanner(tempDir)
      expect(exitCode).not.toBe(0)
      expect(output).toContain('OpenRouter API key')
      expect(output).toContain('HuggingFace token')
      expect(output).toContain('Vercel token')
      expect(output).toContain('eval()')
      expect(output).toContain('inline <script> tag')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
