'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { useKeys } from '@/stores/keys'
import { useHistory } from '@/stores/history'
import { resolveGenerationProvider } from '@/lib/health'
import { getLastGenerationPrefs, setLastGenerationPrefs } from '@/lib/prefs'
import { estimateCost, formatCost } from '@/lib/cost-estimate'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SSEClient } from '@/lib/sse'
import { ModelSelector } from '@/components/prompt/ModelSelector'
import type { ComponentState, IntentResult } from '@/types'

export function CustomizePanel({ templateId }: { templateId: string }) {
  const {
    setPrompt,
    setStatus,
    setError,
    setIntent,
    addComponent,
    updateComponent,
    setProjectId,
    setTemplateId,
    setCost,
    setGenerationClient,
    setFiles,
    reset,
    error,
  } = useProject()
  const { closeCustomize, activeMode } = useUI()
  const { openrouter, huggingface, gemini } = useKeys()
  const { add: addToHistory } = useHistory()
  const { provider: lastProvider, model: lastModel } = getLastGenerationPrefs()

  const [prompt, setPromptLocal] = useState('')
  const [provider, setProvider] = useState(lastProvider)
  const [model, setModel] = useState(lastModel)
  const [loading, setLoading] = useState(false)
  const hasKeys = Boolean(openrouter || huggingface || gemini)

  const costEstimate = useMemo(
    () => estimateCost(prompt, provider, model),
    [prompt, provider, model]
  )

  useEffect(() => {
    setLastGenerationPrefs({ provider, model })
  }, [provider, model])

  async function handleCustomize() {
    if (!prompt.trim() || !hasKeys || loading) return

    const trimmed = prompt.trim()
    reset()
    setPrompt(trimmed)
    setTemplateId(templateId)
    setStatus('generating')
    setError(null)
    setLoading(true)

    const resolved = await resolveGenerationProvider(provider, model, {
      openrouter,
      huggingface,
      gemini,
    })

    if (!resolved.ok) {
      setLoading(false)
      setStatus('error')
      setError(resolved.error)
      return
    }

    closeCustomize()

    const client = new SSEClient()
    setGenerationClient(client)
    await client.connect(
      `/api/templates/${templateId}/customize`,
      {
        prompt: prompt.trim(),
        provider: resolved.provider,
        model: resolved.model,
        auth: { openrouter, huggingface, gemini },
        token: resolved.token,
      },
      (event, data) => {
        if (event === 'intent') {
          setIntent(data as IntentResult)
        }

        if (event === 'component') {
          const component = data as ComponentState
          const existing = useProject
            .getState()
            .components.find((c) => c.name === component.name)

          if (existing) {
            updateComponent(component.name, component)
          } else {
            addComponent(component)
          }

          if (component.status === 'ready' && component.cost) {
            const current = useProject.getState().cost
            setCost(current + component.cost)
          }
        }

        if (event === 'done') {
          setStatus('ready')
          setLoading(false)
          const done = data as { projectId?: string; files?: Record<string, string> }
          if (done.projectId) {
            setProjectId(done.projectId)
          }
          if (done.files) {
            setFiles(done.files)
          }
          const state = useProject.getState()
          if (state.projectId) {
            addToHistory({
              id: state.projectId,
              prompt: state.prompt,
              mode: activeMode,
              provider: resolved.provider,
              model: resolved.model,
              cost: state.cost,
              componentCount: state.components.length,
              status: 'ready',
              createdAt: new Date().toISOString(),
              files: done.files,
            })
          }
          setGenerationClient(null)
        }

        if (event === 'error') {
          const { message } = data as { message: string }
          setStatus('error')
          setError(message)
          setLoading(false)
          setGenerationClient(null)
        }
      },
      (err) => {
        setStatus('error')
        setError(err.message)
        setLoading(false)
        setGenerationClient(null)
      },
      () => {
        if (useProject.getState().status === 'generating') {
          setStatus('ready')
        }
        setLoading(false)
        setGenerationClient(null)
      }
    )
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customize {templateId}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeCustomize}
          title="Close customization"
          aria-label="Close customization"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-muted-foreground">
        Describe how you want this template customized.
      </p>

      <Label htmlFor="customize-input" className="sr-only">
        Customize this template
      </Label>
      <Textarea
        id="customize-input"
        placeholder="Make it bold, minimal, with a dark theme..."
        value={prompt}
        onChange={(e) => {
          setPromptLocal(e.target.value)
          setPrompt(e.target.value)
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handleCustomize()
          }
        }}
        autoResize
        aria-describedby="customize-hint"
        className="min-h-[120px] resize-none"
      />

      <div
        id="customize-hint"
        className="flex items-center justify-between text-xs text-muted-foreground"
      >
        <button
          type="button"
          onClick={() => {
            setPromptLocal('')
            setPrompt('')
          }}
          disabled={!prompt}
          aria-label="Clear customization prompt"
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
        <span className="flex items-center gap-2">
          <span>{formatCost(costEstimate)}</span>
          <span>Ctrl / Cmd + Enter to customize</span>
        </span>
      </div>

      <ModelSelector
        provider={provider}
        model={model}
        onChange={(p, m) => {
          setProvider(p)
          setModel(m)
        }}
      />

      {!hasKeys && (
        <p className="text-sm text-destructive">
          Add an API key in Settings to customize this template.
        </p>
      )}

      <Button
        onClick={handleCustomize}
        disabled={!prompt.trim() || !hasKeys || loading}
        className="gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && <Sparkles className="h-4 w-4" />}
        Customize Template
      </Button>
    </div>
  )
}
