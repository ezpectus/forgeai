import { Hono } from 'hono'
import { VercelDeployer } from '@/plugins/deployers/vercel'
import { E2BDeployer } from '@/plugins/deployers/e2b'
import type { AppEnv } from '../lib/env'

const DEPLOYERS = {
  vercel: VercelDeployer,
  e2b: E2BDeployer,
}

const app = new Hono<AppEnv>()

app.get('/:id/status', async (c) => {
  const auth = c.get('auth') as string | null
  const id = c.req.param('id')
  const provider = c.req.query('provider') ?? 'vercel'

  if (!auth) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  const deployer = DEPLOYERS[provider as keyof typeof DEPLOYERS]

  if (!deployer) {
    return c.json({ error: 'Provider not available' }, 400)
  }

  try {
    const result = await deployer.status(id, auth)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
