import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../lib/env'

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  c.set('auth', token)
  await next()
}
