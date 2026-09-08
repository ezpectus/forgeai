import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  const provider = c.req.query('provider')

  if (provider) {
    return c.json({ status: 'error', error: 'Provider not available' }, 503)
  }

  return c.json({ status: 'ok' })
})

export default app
