#!/usr/bin/env node
/**
 * Security + leak scanner for ForgeAI.
 * Runs from the repo root. Non-zero exit if potential secrets or
 * dangerous patterns are found in source code/docs.
 *
 * Usage:
 *   npm run security
 *   node scripts/security-scan.mjs
 *
 * Inline ignore (only when you are 100% sure it is a false positive):
 *   // security-scan:ignore <reason>
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

// Files and folders to skip entirely
const SKIP_PATHS = [
  'node_modules',
  '.next',
  'out',
  'dist',
  '.git',
  'internal',
  'docs',
  'tests',
  '.windsurf',
  '.env',
  '.env.local',
  '.env.example',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.tsbuildinfo',
]

// Only scan these extensions (case-insensitive)
const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
])

// Patterns that likely indicate a leaked secret
const SECRET_PATTERNS = [
  // OpenRouter
  { regex: /sk-or-[a-zA-Z0-9]{24,}/g, name: 'OpenRouter API key' },
  // HuggingFace
  { regex: /hf_[a-zA-Z0-9]{20,}/g, name: 'HuggingFace token' },
  // Supabase
  { regex: /sb_[a-zA-Z0-9]{20,}/g, name: 'Supabase key' },
  // Vercel
  { regex: /vercel_[a-zA-Z0-9]{20,}/g, name: 'Vercel token' },
  // Generic JWT
  { regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.?[A-Za-z0-9_-]*/g, name: 'JWT token' },
  // AWS
  { regex: /AKIA[0-9A-Z]{16}/g, name: 'AWS access key' },
  // Private keys
  { regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, name: 'Private key' },
  // Generic high-entropy token
  {
    regex: /(?:api[_-]?key|token|secret|password|auth)["']?\s*[:=]\s*["']([a-zA-Z0-9_\-]{32,})["']/gi,
    name: 'Generic secret assignment',
  },
  // Long base64/hex that could be a secret
  {
    regex: /["']([a-f0-9]{64,}|[A-Za-z0-9+/]{64,}={0,2})["']/g,
    name: 'Long hex/base64 secret-looking string',
  },
]

// Patterns that indicate dangerous code / vulnerabilities
// security-scan:ignore these lines define detection regex patterns, not real usage
const DANGER_PATTERNS = [
  { regex: /dangerouslySetInnerHTML\s*:/g, name: 'dangerouslySetInnerHTML' }, // security-scan:ignore regex definition
  { regex: /\.innerHTML\s*=/g, name: 'innerHTML assignment' }, // security-scan:ignore regex definition
  { regex: /eval\s*\(/g, name: 'eval()' }, // security-scan:ignore regex definition
  { regex: /new\s+Function\s*\(/g, name: 'new Function()' }, // security-scan:ignore regex definition
  { regex: /document\.write\s*\(/g, name: 'document.write()' }, // security-scan:ignore regex definition
  { regex: /setTimeout\s*\(\s*["'`]/g, name: 'setTimeout with string' }, // security-scan:ignore regex definition
  { regex: /setInterval\s*\(\s*["'`]/g, name: 'setInterval with string' }, // security-scan:ignore regex definition
  { regex: /Function\s*\(\s*["'`]/g, name: 'Function() constructor with string' }, // security-scan:ignore regex definition
  { regex: /<script\b[^>]*>/gi, name: 'inline <script> tag' }, // security-scan:ignore regex definition
  { regex: /__proto__\s*[:=]/g, name: 'prototype pollution (__proto__) ' }, // security-scan:ignore regex definition
  { regex: /constructor\.prototype\s*[:=]/g, name: 'prototype pollution (constructor.prototype)' }, // security-scan:ignore regex definition
  { regex: /import\s*\(\s*[^\'"`]+\)/g, name: 'dynamic import with variable' }, // security-scan:ignore regex definition
  { regex: /require\s*\(\s*[^\'"`]+\)/g, name: 'dynamic require with variable' }, // security-scan:ignore regex definition
  { regex: /fetch\s*\(\s*[^\'"`]+\)/g, name: 'fetch with user-controlled URL (SSRF risk)' }, // security-scan:ignore regex definition
  { regex: /exec\s*\(|spawn\s*\(|execSync\s*\(|spawnSync\s*\(/g, name: 'shell execution' }, // security-scan:ignore regex definition
]

const IGNORE_COMMENT = /security-scan:ignore\s+(.+)/

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    const rel = relative(ROOT, full)

    if (SKIP_PATHS.some((skip) => rel === skip || rel.startsWith(skip + '/'))) {
      continue
    }

    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile()) {
      const ext = '.' + entry.name.split('.').pop().toLowerCase()
      if (EXTENSIONS.has(ext)) {
        yield rel
      }
    }
  }
}

async function scanFile(relPath) {
  const fullPath = join(ROOT, relPath)
  const content = await readFile(fullPath, 'utf-8')
  const lines = content.split('\n')
  const findings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Skip lines with an explicit ignore comment
    if (IGNORE_COMMENT.test(line)) {
      continue
    }

    for (const { regex, name } of SECRET_PATTERNS) {
      const matches = line.matchAll ? [...line.matchAll(regex)] : []
      for (const match of matches) {
        const value = match[1] ?? match[0]
        if (value.length < 20 && /sk-or-|hf_|vercel_|sb_|eyJ|AKIA/.test(value)) {
          // keep short matches for known prefixes
        } else if (value.length < 32) {
          // skip short generic strings that are likely not real secrets
          continue
        }
        findings.push({
          type: 'secret',
          name,
          line: lineNum,
          match: match[0].slice(0, 80),
        })
      }
    }

    for (const { regex, name } of DANGER_PATTERNS) {
      const matches = line.matchAll ? [...line.matchAll(regex)] : []
      for (const match of matches) {
        findings.push({
          type: 'danger',
          name,
          line: lineNum,
          match: match[0].slice(0, 80),
        })
      }
    }
  }

  return findings
}

async function main() {
  console.log('🔒 Running ForgeAI security and leak scan...\n')

  const findingsByFile = []
  for await (const rel of walk(ROOT)) {
    try {
      const findings = await scanFile(rel)
      if (findings.length > 0) {
        findingsByFile.push({ file: rel, findings })
      }
    } catch (err) {
      console.error(`Error reading ${rel}: ${err.message}`)
    }
  }

  if (findingsByFile.length === 0) {
    console.log('✅ No potential secrets or dangerous patterns found.')
    process.exit(0)
  }

  console.log(`⚠️  Found ${findingsByFile.length} file(s) with potential issues:\n`)
  for (const { file, findings } of findingsByFile) {
    console.log(`--- ${file} ---`)
    for (const f of findings) {
      const label = f.type === 'secret' ? 'LEAK' : 'DANGER'
      console.log(`  [${label}] line ${f.line}: ${f.name}`)
      console.log(`    match: ${f.match}`)
    }
    console.log('')
  }

  console.log(
    'If a finding is a false positive, add an inline comment on that line:\n' +
      '  // security-scan:ignore <reason>\n'
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
