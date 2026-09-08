import { Hono } from 'hono'
import { VercelDeployer } from '@/plugins/deployers/vercel'
import { E2BDeployer } from '@/plugins/deployers/e2b'
import type { AppEnv } from '../lib/env'
import type { DeployFiles } from '@/types'

const DEPLOYERS = {
  vercel: VercelDeployer,
  e2b: E2BDeployer,
}

const app = new Hono<AppEnv>()

/**
 * Deploy endpoint. Routes the request to the chosen deployer (Vercel or E2B)
 * and returns the live URL for the generated project.
 */
app.post('/', async (c) => {
  const auth = c.get('auth') as string | null
  const body = await c.req.json<{
    projectId: string
    provider: string
    files: DeployFiles
  }>()

  if (!auth) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  const deployer = DEPLOYERS[body.provider as keyof typeof DEPLOYERS]

  if (!deployer) {
    return c.json({ error: 'Provider not available' }, 400)
  }

  try {
    const result = await deployer.deploy(body.files, auth)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
