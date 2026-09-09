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
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(body.supabaseUrl, body.supabaseKey)

        // Try executing via the Supabase SQL REST endpoint.
        // The service role key is required for DDL statements.
        const { error } = await supabase.rpc('exec_sql', { sql })

        if (error) {
          return c.json({
            sql,
            executed: false,
            error: error.message,
            instructions:
              'The exec_sql function is not available. Run the SQL manually in the Supabase SQL Editor (Dashboard > SQL Editor).',
          })
        }

        return c.json({
          sql,
          executed: true,
          message: 'Schema applied successfully.',
        })
      } catch (execErr) {
        const execMessage =
          execErr instanceof Error ? execErr.message : String(execErr)
        return c.json({
          sql,
          executed: false,
          error: execMessage,
          instructions:
            'Automatic execution failed. Run the SQL manually in the Supabase SQL Editor (Dashboard > SQL Editor).',
        })
      }
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
