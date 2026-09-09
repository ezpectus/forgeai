'use client'

import { useEffect, useState } from 'react'
import { Globe, Loader2, Rocket, Shield, Sparkles } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useProject } from '@/stores/project'
import { useHistory } from '@/stores/history'
import { resolveGenerationProvider } from '@/lib/health'
import { getLastGenerationPrefs, setLastGenerationPrefs } from '@/lib/prefs'
import { SSEClient } from '@/lib/sse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUI } from '@/stores/ui'
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
    setCost,
    setGenerationClient,
    reset,
    status,
    error,
  } = useProject()

  const { provider: lastProvider, model: lastModel } = getLastGenerationPrefs()

  const [prompt, setPromptLocal] = useState('')
  const [provider, setProvider] = useState(lastProvider)
  const [model, setModel] = useState(lastModel)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setLastGenerationPrefs({ provider, model })
  }, [provider, model])

  const hasKeys = Boolean(openrouter || huggingface || gemini)
  const isGenerating = status === 'generating'
  const isBusy = isGenerating || checking

  function handleSelect(text: string) {
    setPromptLocal(text)
    setPrompt(text)
  }

  async function handleGenerate() {
    if (!prompt.trim() || !hasKeys) return

    const trimmed = prompt.trim()
    setPromptLocal(trimmed)
    setPrompt(trimmed)
    reset()
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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Build a website from one sentence.
        </h1>
        <p className="text-lg text-muted-foreground">
          Prompt → design → live URL. Open source, BYOK, and deployable in
          seconds.
        </p>
      </div>

      <Textarea
        placeholder="Describe the website you want..."
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
        className="min-h-[120px] resize-none text-base"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{prompt.length} characters</span>
        <span>Ctrl / Cmd + Enter to generate</span>
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
            disabled={!prompt.trim() || !hasKeys || isBusy}
            className="w-full gap-2 sm:w-auto"
          >
            {(isBusy || checking) && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isBusy && <Sparkles className="h-4 w-4" />}
            {checking ? 'Checking key…' : 'Generate'}
          </Button>
        </div>
      </div>

      {!hasKeys && (
        <p className="text-sm text-destructive">
          Add an OpenRouter, HuggingFace, or Gemini key in Settings to generate.
        </p>
      )}

      {error && status === 'error' && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
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

      <HomeTemplates />

      <FaqSection />
    </div>
  )
}
