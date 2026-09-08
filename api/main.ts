import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { authMiddleware } from './middleware/auth'
import { corsMiddleware } from './middleware/cors'
import { rateLimitMiddleware } from './middleware/rateLimit'
import type { AppEnv } from './lib/env'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { log } from './lib/logger'
import componentRoute from './routes/component'
import dbBindRoute from './routes/db-bind'
import deployRoute from './routes/deploy'
import templatesRoute from './routes/templates'
import deployStatusRoute from './routes/deploy-status'
import exportRoute from './routes/export'
import generateRoute from './routes/generate'
import healthRoute from './routes/health'
import modelsRoute from './routes/models'

import { securityHeaders } from './middleware/security'

// Hono app instance that wires security, CORS, rate limiting, auth and all
// generation/deploy/export routes together.
const app = new Hono<AppEnv>()

app.use(logger())
app.use(securityHeaders)
app.use(corsMiddleware)
app.use(rateLimitMiddleware)
app.use(authMiddleware)

app.route('/api/health', healthRoute)
app.route('/api/models', modelsRoute)
app.route('/api/templates', templatesRoute)
app.route('/api/generate', generateRoute)
app.route('/api/generate/component', componentRoute)
app.route('/api/export', exportRoute)
app.route('/api/db/bind', dbBindRoute)
app.route('/api/deploy', deployRoute)
app.route('/api/deploy', deployStatusRoute)

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)

const __filename = fileURLToPath(import.meta.url)
const isMain = process.argv.some((arg) => resolve(arg) === __filename)

// Start the Hono server only when this file is the entry point (not during tests).
if (isMain) {
  serve({ fetch: app.fetch, port }, () => {
    log.info(`API server running on http://localhost:${port}`)
  })
}

export default app
