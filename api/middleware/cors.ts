import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'

const origins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000']

export const corsMiddleware: MiddlewareHandler = cors({
  origin: origins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})
