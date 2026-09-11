'use client'

import { useState } from 'react'
import { AlertCircle, Pencil, RotateCcw, Plus, Wallet } from 'lucide-react'
import { useProject } from '@/stores/project'
import { useKeys } from '@/stores/keys'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ComponentState } from '@/types'

/**
 * Dedicated error view shown when a generation fails. Gives the user a clear
 * summary and quick actions to edit the prompt, regenerate with the same prompt,
 * or start fresh.
 */
export function GenerationError() {
  const {
    error, setStatus, setError, reset, regenerate,
    components, intent, prompt, projectId, templateId,
    updateComponent, setFiles, setProjectId,
  } = useProject()
  const keys = useKeys()
  const [retrying, setRetrying] = useState(false)
  const budgetHit = error?.includes('Cost budget exceeded') ?? false
  const failedSections = components.filter((c) => c.status === 'error')
  // Per-section retry only makes sense once the intent plan exists.
  const canRetrySections = failedSections.length > 0 && !!intent

  async function handleRetrySections() {
    if (!intent) return
    setRetrying(true)
    setError(null)
    try {
      const auth = {
        openrouter: keys.openrouter ?? '',
        huggingface: keys.huggingface ?? '',
        gemini: keys.gemini ?? '',
      }
      for (const failed of failedSections) {
        const section = intent.sections.find((s) => s.name === failed.name)
        const res = await fetch('/api/generate/component', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            componentName: failed.name,
            // No usable code — regenerate from scratch with section context.
            currentCode: '// failed generation — regenerate fully',
            instruction: `${prompt}\n\nSection "${failed.name}": ${section?.description ?? 'generate this section'}`,
            templateId: templateId ?? 'website',
            auth,
            provider: failed.provider,
            model: failed.model,
          }),
        })
        const data = (await res.json()) as {
          component?: ComponentState
          error?: string
        }
        if (!res.ok || !data.component) {
          throw new Error(data.error ?? `Retry failed for ${failed.name}`)
        }
        updateComponent(failed.name, data.component)
      }

      // Rebuild the file map with the recovered sections.
      const state = useProject.getState()
      const assembled = await fetch('/api/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          components: state.components,
          projectId: projectId ?? undefined,
        }),
      })
      const assembledData = (await assembled.json()) as {
        projectId?: string
        files?: Record<string, string>
        error?: string
      }
      if (!assembled.ok || !assembledData.files) {
        throw new Error(assembledData.error ?? 'Reassembly failed')
      }
      if (assembledData.projectId) setProjectId(assembledData.projectId)
      setFiles(assembledData.files)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Section retry failed')
    } finally {
      setRetrying(false)
    }
  }

  function handleEditPrompt() {
    setStatus('idle')
    setError(null)
  }

  function handleRegenerate() {
    setError(null)
    regenerate()
  }

  function handleNewProject() {
    reset()
  }

  return (
    <Card className="flex w-full max-w-xl flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        {budgetHit ? (
          <Wallet className="h-6 w-6 text-destructive" />
        ) : (
          <AlertCircle className="h-6 w-6 text-destructive" />
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold">
          {budgetHit ? 'Cost budget reached' : 'Generation failed'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {budgetHit
            ? 'The generation stopped to protect your provider credit.'
            : 'Something went wrong while generating your project.'}
        </p>
      </div>
      {budgetHit && (
        <p className="text-xs text-muted-foreground">
          Raise the cap with <code>MAX_GENERATION_COST_USD</code> in <code>.env</code>, or use a cheaper model.
        </p>
      )}
      {error && (
        <p className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {canRetrySections && (
        <Button
          variant="secondary"
          onClick={handleRetrySections}
          disabled={retrying}
          className="w-full gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {retrying
            ? 'Retrying…'
            : `Retry ${failedSections.length} failed section${failedSections.length > 1 ? 's' : ''}`}
        </Button>
      )}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={handleEditPrompt} className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit prompt
        </Button>
        <Button onClick={handleRegenerate} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Regenerate
        </Button>
        <Button variant="outline" onClick={handleNewProject} className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>
    </Card>
  )
}
