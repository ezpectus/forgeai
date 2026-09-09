'use client'

import { useState } from 'react'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Circle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useProject } from '@/stores/project'
import { useKeys } from '@/stores/keys'
import type { ComponentState } from '@/types'

const statusIcons = {
  pending: Circle,
  generating: Loader2,
  ready: CheckCircle,
  error: AlertCircle,
  editing: Circle,
}

const statusClasses = {
  pending: 'text-muted-foreground',
  generating: 'text-primary',
  ready: 'text-success',
  error: 'text-destructive',
  editing: 'text-muted-foreground',
}

export function ComponentStatusRow({
  component,
}: {
  component: ComponentState
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const { projectId, prompt, templateId, updateComponent } = useProject()
  const { openrouter, huggingface, gemini } = useKeys()
  const Icon = statusIcons[component.status]
  const isSpinning = component.status === 'generating'

  async function handleCopy() {
    if (!component.code) return
    await navigator.clipboard.writeText(component.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleRetry() {
    if (!projectId || retrying) return

    setRetrying(true)
    updateComponent(component.name, {
      status: 'generating',
      error: undefined,
    })

    try {
      const instruction = `Original request: ${prompt}. Regenerate the ${component.name} section to fix: ${component.error || 'unknown error'}.`
      const res = await fetch('/api/generate/component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          componentName: component.name,
          currentCode: component.code,
          instruction,
          templateId: templateId || 'website',
          auth: { openrouter, huggingface, gemini },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Retry failed')
      }

      const updated = data.component as ComponentState
      updateComponent(component.name, {
        ...updated,
        status: updated.status,
        cost: updated.cost,
        error: updated.error,
      })

      if (updated.cost !== undefined) {
        const current = useProject.getState().cost
        const oldCost = component.cost ?? 0
        useProject.getState().setCost(current - oldCost + updated.cost)
      }
    } catch (err) {
      updateComponent(component.name, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${statusClasses[component.status]} ${
              isSpinning ? 'animate-spin' : ''
            }`}
          />
          <span className="font-medium">{component.name}</span>
          {component.cost !== undefined && (
            <span className="text-xs text-muted-foreground">
              ${component.cost.toFixed(6)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {component.status === 'error' && projectId && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              title="Retry this component"
              aria-label="Retry this component"
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          )}
          {component.code && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy code"
                aria-label="Copy code"
                className="text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                title={open ? 'Hide code' : 'Show code'}
                aria-label={open ? 'Hide code' : 'Show code'}
                className="text-muted-foreground hover:text-foreground"
              >
                {open ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
      {component.error && (
        <p className="mt-1 text-sm text-destructive">{component.error}</p>
      )}
      {open && component.code && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
          {component.code}
        </pre>
      )}
    </div>
  )
}
