'use client'

import { AlertCircle, RotateCcw, Plus } from 'lucide-react'
import { useProject } from '@/stores/project'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Dedicated error view shown when a generation fails. Gives the user a clear
 * summary and quick actions to retry with the same prompt or start fresh.
 */
export function GenerationError() {
  const { error, setStatus, setError, reset } = useProject()

  function handleRetry() {
    setStatus('idle')
    setError(null)
  }

  function handleNewProject() {
    reset()
  }

  return (
    <Card className="flex w-full max-w-xl flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Generation failed</h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong while generating your project.
        </p>
      </div>
      {error && (
        <p className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={handleRetry} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={handleNewProject} className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>
    </Card>
  )
}
