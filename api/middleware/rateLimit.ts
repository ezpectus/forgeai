import type { Context, MiddlewareHandler } from 'hono'

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
const SWEEP_INTERVAL_MS = WINDOW_MS
// Only trust X-Forwarded-For when the deployment explicitly says it sits
// behind a proxy — otherwise the client can rotate the header per request and
// bypass the limit entirely.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true'

let lastSweep = Date.now()

/** Drop expired windows so the map can't grow unbounded. */
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, entry] of limits) {
    if (entry.resetAt <= now) limits.delete(key)
  }
}

function clientKey(c: Context): string {
  if (TRUST_PROXY) {
    const fwd = c.req.header('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
  }
  try {
    const addr = c.env?.incoming?.socket?.remoteAddress
    if (addr) return String(addr)
  } catch {
    // not running under @hono/node-server (e.g. tests via app.fetch)
  }
  return 'local'
}

/**
 * Simple in-memory per-IP rate limiter. Allows a configurable number of
 * requests per minute and returns `429` with `RateLimit-*` headers when exceeded.
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  if (LIMIT <= 0) {
    await next()
    return
  }

  const now = Date.now()
  sweep(now)

  const ip = clientKey(c)
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
