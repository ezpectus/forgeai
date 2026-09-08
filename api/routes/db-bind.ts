import { Hono } from 'hono'
import { generateSchema } from '@/lib/db-schema'
import type { AppEnv } from '../lib/env'
import type { FormIntent } from '@/lib/db-schema'

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  const body = await c.req.json<{
    projectId: string
    forms: FormIntent[]
    supabaseUrl?: string
    supabaseKey?: string
  }>()

  try {
    const sql = generateSchema(body.forms, body.projectId)

    if (body.supabaseUrl && body.supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(body.supabaseUrl, body.supabaseKey)

      const { error } = await supabase.rpc('exec_sql', { sql })

      if (error) {
        return c.json({
          sql,
          executed: false,
          error: error.message,
          instructions:
            'Service role key required for automatic execution. Run the SQL manually in the Supabase SQL Editor.',
        })
      }

      return c.json({
        sql,
        executed: true,
        message: 'Schema applied successfully.',
      })
    }

    return c.json({
      sql,
      executed: false,
      instructions:
        'Service role key not provided. Run the SQL manually in the Supabase SQL Editor.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default app
