import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { authMiddleware } from './middleware/auth'
import { corsMiddleware } from './middleware/cors'
import { rateLimitMiddleware } from './middleware/rateLimit'
import type { AppEnv } from './lib/env'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { log } from './lib/logger'
import componentRoute from './routes/component'
import deployRoute from './routes/deploy'
import templatesRoute from './routes/templates'
import deployStatusRoute from './routes/deploy-status'
import exportRoute from './routes/export'
import generateRoute from './routes/generate'
import assembleRoute from './routes/assemble'
import previewRoute from './routes/preview'
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

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Internal server error'
  log.error('Unhandled API error:', err)
  return c.json({ status: 'error', error: message }, 500)
})

// Read the real package version so the root listing can never drift stale.
const apiVersion = (() => {
  try {
    const raw = readFileSync(
      join(fileURLToPath(new URL('.', import.meta.url)), '..', 'package.json'),
      'utf-8'
    )
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
})()

app.get('/', (c) =>
  c.json({
    message: 'ForgeAI API',
    version: apiVersion,
    endpoints: {
      health: 'GET /api/health',
      models: 'GET /api/models?provider=openrouter|gemini|huggingface',
      templates: 'GET /api/templates',
      generate: 'POST /api/generate',
      component: 'POST /api/generate/component',
      assemble: 'POST /api/assemble',
      preview: 'POST /api/preview',
      export: 'POST /api/export',
      deploy: 'POST /api/deploy',
      deployStatus: 'GET /api/deploy/:id/status?provider=vercel',
    },
  })
)

app.notFound((c) =>
  c.json({ error: 'Not Found', path: c.req.path }, 404)
)

app.route('/api/health', healthRoute)
app.route('/api/models', modelsRoute)
app.route('/api/templates', templatesRoute)
app.route('/api/generate', generateRoute)
app.route('/api/generate/component', componentRoute)
app.route('/api/assemble', assembleRoute)
app.route('/api/preview', previewRoute)
app.route('/api/export', exportRoute)
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
