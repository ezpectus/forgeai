'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe, Loader2, Rocket, Shield, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useKeys } from '@/stores/keys'
import { useProject } from '@/stores/project'
import { useHistory } from '@/stores/history'
import { resolveGenerationProvider } from '@/lib/health'
import { getLastGenerationPrefs, setLastGenerationPrefs } from '@/lib/prefs'
import { estimateCost, formatCost } from '@/lib/cost-estimate'
import { SSEClient } from '@/lib/sse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUI } from '@/stores/ui'
import { functions } from '@/components/layout/Sidebar'
import type { ComponentState, IntentResult } from '@/types'
import { ExampleChips } from './ExampleChips'
import { ModelSelector } from './ModelSelector'
import { FaqSection } from './FaqSection'
import { HomeTemplates } from './HomeTemplates'

/**
 * Main prompt input component. Collects the user's idea, lets them pick an AI
 * model, and starts the streaming generation process via the orchestrator.
 */
export function PromptInput() {
  const { openrouter, huggingface, gemini } = useKeys()
  const { openGallery, activeMode } = useUI()
  const { add: addToHistory } = useHistory()
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
    reset,
    status,
    error,
    regenerateAt,
  } = useProject()

  const {
    provider: lastProvider,
    model: lastModel,
    prompt: lastPrompt,
  } = getLastGenerationPrefs()

  const [prompt, setPromptLocal] = useState(lastPrompt)
  const [provider, setProvider] = useState(lastProvider)
  const [model, setModel] = useState(lastModel)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setLastGenerationPrefs({ provider, model })
  }, [provider, model])

  useEffect(() => {
    setLastGenerationPrefs({ prompt })
  }, [prompt])

  const hasKeys = Boolean(openrouter || huggingface || gemini)
  const isGenerating = status === 'generating'
  const isBusy = isGenerating || checking
  const modeLabel =
    functions.find((f) => f.id === activeMode)?.label.toLowerCase() ??
    activeMode
  const promptTooShort = prompt.trim().length > 0 && prompt.trim().length < 10
  const promptTooLong = prompt.length > 2000
  const canGenerate =
    prompt.trim().length >= 10 && !promptTooLong && hasKeys && !isBusy

  const costEstimate = useMemo(
    () => estimateCost(prompt, provider, model),
    [prompt, provider, model]
  )

  function handleSelect(text: string) {
    setPromptLocal(text)
    setPrompt(text)
  }

  async function handleGenerate() {
    if (isBusy || !prompt.trim() || !hasKeys) return

    const trimmed = prompt.trim()
    setPromptLocal(trimmed)
    setPrompt(trimmed)
    reset()
    setTemplateId(activeMode)
    setStatus('generating')
    setError(null)
    setChecking(true)

    const resolved = await resolveGenerationProvider(provider, model, {
      openrouter,
      huggingface,
      gemini,
    })

    if (!resolved.ok) {
      setChecking(false)
      setStatus('error')
      setError(resolved.error)
      return
    }

    const client = new SSEClient()
    setGenerationClient(client)
    await client.connect(
      '/api/generate',
      {
        prompt: trimmed,
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
          const done = data as { projectId?: string; files?: Record<string, string> }
          if (done.projectId) {
            setProjectId(done.projectId)
          }
          setChecking(false)
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
          setChecking(false)
          setGenerationClient(null)
        }
      },
      (err) => {
        setStatus('error')
        setError(err.message)
        setChecking(false)
        setGenerationClient(null)
      },
      () => {
        if (useProject.getState().status === 'generating') {
          setStatus('ready')
        }
        setChecking(false)
        setGenerationClient(null)
      }
    )
  }

  useEffect(() => {
    if (regenerateAt && canGenerate) {
      handleGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerateAt])

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <HomeTemplates />

      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Generate {modeLabel} from one sentence.
        </h1>
        <p className="text-lg text-muted-foreground">
          Type what you want, pick a model, and get a live URL. Open source,
          BYOK, and deployable in seconds.
        </p>
      </div>

      <Label htmlFor="prompt-input" className="sr-only">
        What do you want to build?
      </Label>
      <Textarea
        id="prompt-input"
        placeholder={`Describe the ${modeLabel} you want...`}
        value={prompt}
        onChange={(e) => {
          setPromptLocal(e.target.value)
          setPrompt(e.target.value)
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handleGenerate()
          }
        }}
        autoResize
        aria-describedby="prompt-hint"
        className={cn(
          'min-h-[120px] resize-none text-base',
          promptTooLong && 'border-destructive focus-visible:ring-destructive'
        )}
      />

      <div
        id="prompt-hint"
        className="flex items-center justify-between text-xs text-muted-foreground"
      >
        <span className={cn(promptTooLong && 'text-destructive')}>
          {prompt.length}/2000 characters
          {promptTooShort && ' — add a few more details'}
          {promptTooLong && ' — too long'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPromptLocal('')
              setPrompt('')
            }}
            disabled={!prompt}
            aria-label="Clear prompt"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
          <span>Mode: {modeLabel} · Ctrl / Cmd + Enter</span>
        </div>
      </div>

      <ExampleChips onSelect={handleSelect} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ModelSelector
          provider={provider}
          model={model}
          onChange={(p, m) => {
            setProvider(p)
            setModel(m)
          }}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openGallery}
            className="w-full sm:w-auto"
          >
            Templates
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full gap-2 sm:w-auto"
            aria-busy={isBusy}
          >
            {(isBusy || checking) && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isBusy && <Sparkles className="h-4 w-4" />}
            {isGenerating
              ? 'Generating…'
              : checking
                ? 'Checking key…'
                : 'Generate'}
          </Button>
        </div>
      </div>

      {hasKeys && (
        <p className="text-right text-xs text-muted-foreground">
          Estimated cost: {formatCost(costEstimate)}
        </p>
      )}

      {!hasKeys && (
        <p className="text-sm text-destructive">
          Add an OpenRouter, HuggingFace, or Gemini key in Settings to generate.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded border p-3">
          <Rocket className="h-4 w-4 text-primary" />
          <span>Prompt to live URL</span>
        </div>
        <div className="flex items-center gap-2 rounded border p-3">
          <Globe className="h-4 w-4 text-primary" />
          <span>Websites, slides, reports, images</span>
        </div>
        <div className="flex items-center gap-2 rounded border p-3">
          <Shield className="h-4 w-4 text-primary" />
          <span>Your API keys, your machine</span>
        </div>
      </div>

      <FaqSection />
    </div>
  )
}
