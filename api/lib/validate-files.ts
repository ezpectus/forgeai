import type { DeployFiles } from '@/types'

/**
 * Validate a client-supplied file map before it is written anywhere:
 * export ZIP (unzipped on the user's machine) or Vercel deploy payload.
 * Rejects zip-slip traversal, absolute paths, drive letters, and non-string
 * content. Returns an error string or null when clean.
 */
const MAX_FILES = 100
const MAX_TOTAL_BYTES = 2 * 1024 * 1024
const MAX_PATH_LEN = 256

export function validateFileMap(files: DeployFiles): string | null {
  const entries = Object.entries(files)
  if (entries.length > MAX_FILES) {
    return `Too many files (max ${MAX_FILES})`
  }
  let total = 0
  for (const [path, content] of entries) {
    if (path.length > MAX_PATH_LEN) {
      return `File path too long: ${path.slice(0, 64)}...`
    }
    if (
      path.startsWith('/') ||
      path.startsWith('\\') ||
      /^[a-zA-Z]:/.test(path) ||
      path.split('/').includes('..')
    ) {
      return `Invalid file path: ${path}`
    }
    if (typeof content !== 'string') {
      return `File content must be a string: ${path}`
    }
    total += content.length
    if (total > MAX_TOTAL_BYTES) {
      return 'Files payload too large (max 2MB total)'
    }
  }
  return null
}
