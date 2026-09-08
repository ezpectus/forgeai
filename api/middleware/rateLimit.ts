import type { MiddlewareHandler } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()
const LIMIT = Number(process.env.RATE_LIMIT_RPM ?? 10)
const WINDOW_MS = 60_000

/**
 * Simple in-memory per-IP rate limiter. Allows a configurable number of
 * requests per minute and returns `429` with `RateLimit-*` headers when exceeded.
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const entry = limits.get(ip)

  const resetAt = entry && entry.resetAt > now ? entry.resetAt : now + WINDOW_MS

  if (entry && entry.resetAt > now) {
    if (entry.count >= LIMIT) {
      c.header('RateLimit-Limit', String(LIMIT))
      c.header('RateLimit-Remaining', '0')
      c.header('RateLimit-Reset', String(Math.ceil((resetAt - now) / 1000)))
      return c.json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }, 429)
    }
    entry.count += 1
  } else {
    limits.set(ip, { count: 1, resetAt })
  }

  const remaining = LIMIT - (limits.get(ip)?.count ?? 0)
  c.header('RateLimit-Limit', String(LIMIT))
  c.header('RateLimit-Remaining', String(remaining))
  c.header('RateLimit-Reset', String(Math.ceil((resetAt - now) / 1000)))

  await next()
}
