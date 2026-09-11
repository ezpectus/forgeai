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

    // Build the fake secrets dynamically — the scanner now scans tests/ too,
    // and literal key strings in the source would be flagged here. The temp
    // file still receives the real patterns, so the positive detection stays.
    const fixture = `
export default function Evil() {
  const key = '${'sk-or-'}${'x'.repeat(32)}'
  const hf = '${'hf_'}${'x'.repeat(36)}'
  const vercel = '${'vercel_'}${'x'.repeat(32)}'
  ${'ev'}al("document.location = 'https://evil.com'")
  return <div><scr${'ipt'}>alert(1)</scr${'ipt'}></div>
}
`
    writeFileSync(resolve(tempDir, 'insecure.tsx'), fixture)

    try {
      const { exitCode, output } = runScanner(tempDir)
      expect(exitCode).not.toBe(0)
      expect(output).toContain('OpenRouter API key')
      expect(output).toContain('HuggingFace token')
      expect(output).toContain('Vercel token')
      expect(output).toContain('eval()') // security-scan:ignore test assertion
      expect(output).toContain('inline <script> tag') // security-scan:ignore test assertion
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
