'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useProject } from '@/stores/project'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ExampleChips } from './ExampleChips'

const models = [
  { value: 'deepseek-v3', label: 'DeepSeek V3 (OpenRouter)' },
  { value: 'deepseek-coder', label: 'DeepSeek Coder (HuggingFace)' },
  { value: 'qwen-coder', label: 'Qwen Coder (OpenRouter)' },
  { value: 'gpt-4o', label: 'GPT-4o (OpenRouter)' },
]

export function PromptInput() {
  const { openrouter, huggingface } = useKeys()
  const { setPrompt, setStatus, setError, status } = useProject()

  const [prompt, setPromptLocal] = useState('')
  const [model, setModel] = useState(models[0].value)

  const hasKeys = Boolean(openrouter || huggingface)
  const isGenerating = status === 'generating'

  function handleSelect(text: string) {
    setPromptLocal(text)
    setPrompt(text)
  }

  async function handleGenerate() {
    if (!prompt.trim() || !hasKeys) return

    setPrompt(prompt.trim())
    setStatus('generating')
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(data.error)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">ForgeAI</h1>
      <p className="text-muted-foreground">
        Open-source prompt-to-live-URL generator
      </p>

      <Textarea
        placeholder="Describe the website you want..."
        value={prompt}
        onChange={(e) => {
          setPromptLocal(e.target.value)
          setPrompt(e.target.value)
        }}
        className="min-h-[120px] resize-none text-base"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{prompt.length} characters</span>
        <ExampleChips onSelect={handleSelect} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => undefined}
            className="w-full sm:w-auto"
          >
            Templates
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || !hasKeys || isGenerating}
            className="w-full gap-2 sm:w-auto"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isGenerating && <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      {!hasKeys && (
        <p className="text-sm text-red-500">
          Add an OpenRouter or HuggingFace key in Settings to generate.
        </p>
      )}
    </div>
  )
}
