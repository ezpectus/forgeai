'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred. Try again or reload the page.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  )
}
