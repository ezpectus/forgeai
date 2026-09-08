import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { authMiddleware } from './middleware/auth'
import { corsMiddleware } from './middleware/cors'
import { rateLimitMiddleware } from './middleware/rateLimit'
import type { AppEnv } from './lib/env'
import { log } from './lib/logger'
import generateRoute from './routes/generate'
import healthRoute from './routes/health'

const app = new Hono<AppEnv>()

app.use(logger())
app.use(corsMiddleware)
app.use(rateLimitMiddleware)
app.use(authMiddleware)

app.route('/api/health', healthRoute)
app.route('/api/generate', generateRoute)

const port = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  serve({ fetch: app.fetch, port }, () => {
    log.info(`API server running on http://localhost:${port}`)
  })
}

export default app
