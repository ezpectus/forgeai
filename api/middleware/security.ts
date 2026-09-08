import type { MiddlewareHandler } from 'hono'

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-XSS-Protection', '0')
  c.header(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none';"
  )

  // HSTS only when served over HTTPS. Local dev usually is http, so make it opt-in via env.
  if (process.env.FORCE_HSTS === 'true') {
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  await next()
}
