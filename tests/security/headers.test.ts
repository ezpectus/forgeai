import { describe, expect, it, beforeAll } from 'vitest'

let app: typeof import('../../api/main').default

describe('API security headers', () => {
  const routes = ['/api/health', '/api/templates']

  beforeAll(async () => {
    // Force a fixed rate-limit ceiling for the tests so the middleware is not
    // disabled in the dev (NODE_ENV != 'production') default. TRUST_PROXY lets
    // the test exercise per-IP keys via x-forwarded-for.
    process.env.RATE_LIMIT_RPM = '10'
    process.env.TRUST_PROXY = 'true'
    app = (await import('../../api/main')).default
  })

  it('applies security headers on all routes', async () => {
    for (const route of routes) {
      const res = await app.fetch(new Request(`http://localhost:3001${route}`))

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin'
      )
      expect(res.headers.get('Permissions-Policy')).toContain('camera=()')
      expect(res.headers.get('Content-Security-Policy')).toBe(
        "default-src 'self'; frame-ancestors 'none';"
      )
      expect(res.headers.get('X-Powered-By')).toBeNull()
    }
  })

  it('returns rate-limit headers on every response', async () => {
    const res = await app.fetch(new Request('http://localhost:3001/api/health'))

    expect(res.status).toBe(200)
    expect(res.headers.get('RateLimit-Limit')).toBe(
      String(process.env.RATE_LIMIT_RPM)
    )
    expect(Number(res.headers.get('RateLimit-Remaining'))).toBeGreaterThanOrEqual(0)
    expect(Number(res.headers.get('RateLimit-Reset'))).toBeGreaterThan(0)
  })

  it('enforces rate limiting after the configured burst', async () => {
    const limit = Number(process.env.RATE_LIMIT_RPM)
    const url = 'http://localhost:3001/api/health'
    const headers = { 'x-forwarded-for': '10.0.0.2' }

    // Exhaust the rate limit
    for (let i = 0; i < limit; i++) {
      const res = await app.fetch(new Request(url, { headers })) // security-scan:ignore test request, not user-controlled
      expect(res.status).toBe(200)
    }

    // Next request should be rate limited
    const res = await app.fetch(new Request(url, { headers })) // security-scan:ignore test request, not user-controlled
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMIT')
    expect(res.headers.get('RateLimit-Remaining')).toBe('0')
  })
})
