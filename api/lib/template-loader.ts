import { readFile } from 'fs/promises'
import { join } from 'path'
import type { ComponentSpec } from '@/types'

/**
 * Load a template config by ID. Checks built-in configs/templates/ first,
 * then falls back to the public/templates/ gallery index. This is shared
 * between the generate and component routes so both support gallery templates.
 */
export async function loadTemplateConfig(
  templateId: string
): Promise<ComponentSpec> {
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
      const raw = await readFile(
        join(process.cwd(), 'public', item.path),
        'utf-8'
      )
      return JSON.parse(raw) as ComponentSpec
    }
  } catch {
    // Index missing or unreadable; fall through to the default website config.
  }

  // 3. Fall back to the default website config
  const raw = await readFile(
    join(process.cwd(), 'configs/templates/website.json'),
    'utf-8'
  )
  return JSON.parse(raw) as ComponentSpec
}
