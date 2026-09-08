import type { MiddlewareHandler } from 'hono'

/**
 * Attach OWASP-recommended security headers to every API response and remove
 * the `X-Powered-By` header so the server fingerprint is not leaked.
 */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-XSS-Protection', '0')
  c.header('X-Powered-By', '')
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

  // Ensure no X-Powered-By slips through from downstream middleware or Hono itself.
  if (c.res) {
    c.res.headers.delete('X-Powered-By')
  }
}
