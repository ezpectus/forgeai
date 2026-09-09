import { useEffect, useState } from 'react'
import { useProject } from '@/stores/project'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, Clock } from 'lucide-react'
import { ComponentStatusRow } from './ComponentStatusRow'

/**
 * Show the live generation progress: intent summary, component status rows,
 * progress bar, estimated cost, and any error.
 */
export function GenerationProgress() {
  const {
    status,
    components,
    intent,
    cost,
    error,
    generationClient,
    setStatus,
    setError,
    setGenerationClient,
  } = useProject()

  function handleCancel() {
    generationClient?.disconnect()
    setStatus('idle')
    setError('Generation cancelled')
    setGenerationClient(null)
  }

  const done = components.filter(
    (c) => c.status === 'ready' || c.status === 'error'
  ).length
  const total = intent?.sections.length ?? 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (status !== 'generating') return
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [status])

  const generatingNow = components.find((c) => c.status === 'generating')
  const stepLabel =
    !intent && total === 0
      ? 'Analyzing your request…'
      : done < total
        ? generatingNow
          ? `Generating ${generatingNow.name}…`
          : 'Building sections…'
        : 'Assembling project…'

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Generating...</h2>
        {status === 'generating' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">{stepLabel}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(elapsed)}
          </span>
        </div>
        <span>
          {done}/{total} components
        </span>
      </div>

      <Progress value={progress} className="w-full" />

      {intent && (
        <div className="rounded-md border p-3 text-sm">
          <p>
            <span className="font-medium">Type:</span> {intent.type}
          </p>
          <p>
            <span className="font-medium">Palette:</span> {intent.palette}
          </p>
          <p>
            <span className="font-medium">Tone:</span> {intent.tone}
          </p>
          <p>
            <span className="font-medium">Style:</span> {intent.style}
          </p>

          {intent.warning && (
            <p className="mt-2 rounded bg-yellow-500/10 p-2 text-xs text-yellow-700">
              {intent.warning}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {components.map((component) => (
          <ComponentStatusRow key={component.name} component={component} />
        ))}
      </div>

      {cost > 0 && (
        <p className="text-sm text-muted-foreground">
          Estimated cost: ${cost.toFixed(6)}
        </p>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
