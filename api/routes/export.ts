import JSZip from 'jszip'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/env'
import type { DeployFiles } from '@/types'

const app = new Hono<AppEnv>()

/**
 * Export endpoint. Receives the generated project files, packs them into a ZIP,
 * and streams it back as a downloadable archive.
 */
app.post('/', async (c) => {
  const body = await c.req.json<{ files: DeployFiles; projectId?: string }>()
  const projectId = body.projectId ?? 'forgeai-project'

  const zip = new JSZip()

  for (const [path, content] of Object.entries(body.files)) {
    zip.file(path, content)
  }

  const buffer = await zip.generateAsync({ type: 'arraybuffer' })

  return c.newResponse(buffer, 200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${projectId}.zip"`,
  })
})

export default app
