import type { MiddlewareHandler } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()
// In development (NODE_ENV is unset or not 'production') the limit defaults to
// 0 so the dev UX is not blocked by aggressive throttling. Set RATE_LIMIT_RPM
// or NODE_ENV=production to enforce real limits.
const LIMIT = Number(
  process.env.RATE_LIMIT_RPM ??
    (process.env.NODE_ENV === 'production' ? 10 : 0)
)
const WINDOW_MS = 60_000

/**
 * Simple in-memory per-IP rate limiter. Allows a configurable number of
 * requests per minute and returns `429` with `RateLimit-*` headers when exceeded.
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (LIMIT <= 0) {
    await next()
    return
  }

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
