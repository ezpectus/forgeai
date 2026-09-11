import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { assembleProject } from '@/lib/assemble'
import { toIdentifier, toPageSlug } from '@/lib/intent'
import type { AppEnv } from '../lib/env'
import type { ComponentState, IntentResult } from '@/types'

const app = new Hono<AppEnv>()

/**
 * POST /api/assemble — rebuild the project file map from an intent +
 * component list. Used when individual sections are retried after a partial
 * generation: the client regenerates the failed components via
 * /api/generate/component, then calls this to reassemble the project.
 */
app.post('/', async (c) => {
  let body: {
    intent?: IntentResult
    components?: ComponentState[]
    projectId?: string
  }
  try {
    body = await c.req.json<typeof body>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  const intent = body.intent
  const components = body.components
  if (!intent || !Array.isArray(intent.sections) || intent.sections.length === 0) {
    return c.json({ error: 'intent.sections is required', code: 'BAD_REQUEST' }, 400)
  }
  if (!components || !Array.isArray(components) || components.length === 0) {
    return c.json({ error: 'components is required', code: 'BAD_REQUEST' }, 400)
  }
  if (components.some((comp) => typeof comp?.code !== 'string')) {
    return c.json({ error: 'every component needs string code', code: 'BAD_REQUEST' }, 400)
  }

  // Client-supplied intent bypasses analyzeIntent's sanitizer — without this,
  // a section name/page like "../../x" would escape into the file map.
  const safeIntent: IntentResult = {
    ...intent,
    sections: intent.sections
      .map((s) => ({
        ...s,
        name: toIdentifier(String(s.name ?? '')),
        page: toPageSlug(String(s.page ?? 'index')),
      }))
      .filter((s) => s.name.length > 0),
    pages: Array.isArray(intent.pages)
      ? intent.pages.map((p) => toPageSlug(String(p)))
      : ['index'],
  }
  const safeComponents = components.map((comp) => ({
    ...comp,
    name: toIdentifier(String(comp.name)),
  }))

  const projectId = body.projectId ?? randomUUID()
  const files = assembleProject(safeIntent, safeComponents, projectId)
  return c.json({ projectId, files })
})

export default app
