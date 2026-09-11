import { Hono } from 'hono'
import { deployers } from '@/plugins/deployers'
import { validateFileMap } from '../lib/validate-files'
import type { AppEnv } from '../lib/env'
import type { DeployFiles, Deployer } from '@/types'

const DEPLOYERS = Object.fromEntries(
  deployers.map((d) => [d.name, d])
) as Record<string, Deployer>

const app = new Hono<AppEnv>()

/**
 * Deploy endpoint. Routes the request to a deployer from the `deployers`
 * array (currently: Vercel) and returns the live URL for the generated project.
 */
app.post('/', async (c) => {
  const auth = c.get('auth') as string | null
  let body: {
    provider: string
    files: DeployFiles
    projectId?: string
  }

  try {
    body = await c.req.json<typeof body>()
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400)
  }

  if (!auth) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  if (!body.files || typeof body.files !== 'object') {
    return c.json({ error: 'files is required', code: 'BAD_REQUEST' }, 400)
  }

  // Same validation as /api/export — client-supplied keys go straight into
  // the deployer's payload; traversal/absolute paths are never legit.
  const fileError = validateFileMap(body.files)
  if (fileError) {
    return c.json({ error: fileError, code: 'BAD_REQUEST' }, 400)
  }

  const deployer = DEPLOYERS[body.provider as keyof typeof DEPLOYERS]

  if (!deployer) {
    return c.json({ error: 'Provider not available' }, 400)
  }

  try {
    // NEXT_PUBLIC_PROJECT_ID lets the generated site's FormHandler tag form
    // submissions with this deployment's id instead of the 'forgeai' default.
    const env: Record<string, string> = {}
    if (body.projectId && /^[a-zA-Z0-9-]{1,64}$/.test(body.projectId)) {
      env.NEXT_PUBLIC_PROJECT_ID = body.projectId
    }
    const result = await deployer.deploy(body.files, auth, env)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
