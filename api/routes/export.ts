import JSZip from 'jszip'
import { Hono } from 'hono'
import { validateFileMap } from '../lib/validate-files'
import type { AppEnv } from '../lib/env'
import type { DeployFiles } from '@/types'

const app = new Hono<AppEnv>()

/**
 * Export endpoint. Receives the generated project files, packs them into a ZIP,
 * and streams it back as a downloadable archive.
 */
app.post('/', async (c) => {
  let body: { files: DeployFiles; projectId?: string }
  try {
    body = await c.req.json<{ files: DeployFiles; projectId?: string }>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  if (!body.files || typeof body.files !== 'object') {
    return c.json({ error: 'files is required', code: 'BAD_REQUEST' }, 400)
  }

  // projectId lands in a response header — strip anything that could break
  // or inject into the header value.
  const projectId = (body.projectId ?? 'forgeai-project').replace(
    /[^a-zA-Z0-9._-]/g,
    '-'
  )

  const zip = new JSZip()

  // File keys come from the client — reject zip-slip paths before packing.
  // The archive is downloaded and unzipped on the user's machine, so a
  // `../` entry would escape the target directory there.
  const fileError = validateFileMap(body.files)
  if (fileError) {
    return c.json({ error: fileError, code: 'BAD_REQUEST' }, 400)
  }
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
