import { readFile } from 'fs/promises'
import { join } from 'path'
import type { ComponentSpec } from '@/types'

/**
 * Load a template config by ID. Checks built-in configs/templates/ first,
 * then falls back to the public/templates/ gallery index. This is shared
 * between the generate and component routes so both support gallery templates.
 */
const SAFE_TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{0,62}$/

export async function loadTemplateConfig(
  templateId: string
): Promise<ComponentSpec> {
  // Reject anything that could escape the template directories before any
  // path is joined — templateId arrives from request bodies.
  if (!SAFE_TEMPLATE_ID.test(templateId)) {
    throw new Error(`Invalid template id: ${templateId}`)
  }

  // 1. Try built-in config directory
  const configPath = join(process.cwd(), 'configs/templates', `${templateId}.json`)
  try {
    const raw = await readFile(configPath, 'utf-8')
    return JSON.parse(raw) as ComponentSpec
  } catch {
    // Not in built-in configs; try the public gallery.
  }

  // 2. Try the public templates gallery index
  try {
    const indexRaw = await readFile(
      join(process.cwd(), 'public/templates/index.json'),
      'utf-8'
    )
    const index = JSON.parse(indexRaw) as Array<{
      id: string
      path: string
    }>
    const item = index.find((i) => i.id === templateId)
    if (item) {
      // item.path is trusted index data, but a hand-edited/poisoned index.json
      // could point anywhere — enforce the same shape the templates route does.
      if (!/^\/templates\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(item.path)) {
        throw new Error(`Template path invalid for id: ${templateId}`)
      }
      const raw = await readFile(
        join(process.cwd(), 'public', item.path),
        'utf-8'
      )
      return JSON.parse(raw) as ComponentSpec
    }
  } catch {
    // Index missing or unreadable; fall through to the default website config.
  }

  // 3. Last-resort fallback keeps generation working if the built-in config
  // read itself failed; for any other id, surface "not found" to the caller.
  if (templateId === 'website') {
    const raw = await readFile(
      join(process.cwd(), 'configs/templates/website.json'),
      'utf-8'
    )
    return JSON.parse(raw) as ComponentSpec
  }

  throw new Error(`Template config not found: ${templateId}`)
}
