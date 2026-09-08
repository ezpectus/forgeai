import { describe, expect, it } from 'vitest'
import app from '../../api/main'

describe('API security headers', () => {
  it('applies X-Content-Type-Options, X-Frame-Options and Referrer-Policy', async () => {
    const req = new Request('http://localhost:3001/api/health', {
      method: 'GET',
    })
    const res = await app.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    )
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()')
  })

  it('enforces rate limiting after the configured burst', async () => {
    const limit = Number(process.env.RATE_LIMIT_RPM ?? 10)
    const url = 'http://localhost:3001/api/health'
    const headers = { 'x-forwarded-for': '10.0.0.2' }

    // Exhaust the rate limit
    for (let i = 0; i < limit; i++) {
      const res = await app.fetch(new Request(url, { headers }))
      expect(res.status).toBe(200)
    }

    // Next request should be rate limited
    const res = await app.fetch(new Request(url, { headers }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('RATE_LIMIT')
  })
})
