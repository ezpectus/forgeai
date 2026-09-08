import type { MiddlewareHandler } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()
const LIMIT = Number(process.env.RATE_LIMIT_RPM ?? 10)
const WINDOW_MS = 60_000

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const entry = limits.get(ip)

  if (entry && entry.resetAt > now) {
    if (entry.count >= LIMIT) {
      return c.json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }, 429)
    }
    entry.count += 1
  } else {
    limits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }

  await next()
}
