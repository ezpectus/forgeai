import { Hono } from 'hono'
import { OpenRouter } from '@/plugins/providers/openrouter'
import type { AppEnv } from '../lib/env'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const provider = c.req.query('provider')
  const auth = c.get('auth') as string | null

  if (!provider) {
    return c.json({ status: 'ok' })
  }

  if (provider !== 'openrouter') {
    return c.json({ status: 'error', error: 'Provider not available' }, 503)
  }

  if (!auth) {
    return c.json(
      { status: 'error', error: 'Missing Authorization header' },
      401
    )
  }

  const ok = await OpenRouter.health(auth)

  if (!ok) {
    return c.json(
      { status: 'error', error: 'Provider health check failed' },
      503
    )
  }

  return c.json({ status: 'ok' })
})

export default app
