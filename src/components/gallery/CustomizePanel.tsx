'use client'

import { useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SSEClient } from '@/lib/sse'
import type { ComponentState, IntentResult } from '@/types'

export function CustomizePanel({ templateId }: { templateId: string }) {
  const {
    setPrompt,
    setStatus,
    setError,
    setIntent,
    addComponent,
    updateComponent,
    setCost,
    reset,
  } = useProject()
  const { closeCustomize } = useUI()
  const [prompt, setPromptLocal] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCustomize() {
    if (!prompt.trim()) return

    reset()
    setStatus('generating')
    setError(null)
    setLoading(true)

    const client = new SSEClient()
    await client.connect(
      `/api/templates/${templateId}/customize`,
      { prompt: prompt.trim() },
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
        }

        if (event === 'error') {
          const { message } = data as { message: string }
          setStatus('error')
          setError(message)
          setLoading(false)
        }
      },
      (err) => {
        setStatus('error')
        setError(err.message)
        setLoading(false)
      },
      () => {
        if (useProject.getState().status === 'generating') {
          setStatus('ready')
        }
        setLoading(false)
      }
    )
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customize {templateId}</h2>
        <Button variant="ghost" size="icon" onClick={closeCustomize}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-muted-foreground">
        Describe how you want this template customized.
      </p>

      <Textarea
        placeholder="Make it bold, minimal, with a dark theme..."
        value={prompt}
        onChange={(e) => {
          setPromptLocal(e.target.value)
          setPrompt(e.target.value)
        }}
        className="min-h-[120px] resize-none"
      />

      <Button
        onClick={handleCustomize}
        disabled={!prompt.trim() || loading}
        className="gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && <Sparkles className="h-4 w-4" />}
        Customize Template
      </Button>
    </div>
  )
}
