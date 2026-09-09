'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { fetchModels, type ModelSummary } from '@/lib/health'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const providers = [
  { id: 'auto', label: 'Auto (any key)' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'huggingface', label: 'HuggingFace' },
]

const fallbackModels: Record<string, ModelSummary[]> = {
  openrouter: [
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', free: true },
    { id: 'Qwen/Qwen2.5-Coder', name: 'Qwen 2.5 Coder', free: false },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', free: false },
    { id: 'openai/gpt-4o', name: 'GPT-4o', free: false },
  ],
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: true },
    { id: 'gemini-pro', name: 'Gemini Pro', free: true },
  ],
  huggingface: [
    { id: 'deepseek-ai/deepseek-coder-6.7b-instruct', name: 'DeepSeek Coder 6.7B', free: true },
    { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B Chat', free: true },
  ],
}

interface ModelSelectorProps {
  provider: string
  model: string
  onChange: (provider: string, model: string) => void
}

export function ModelSelector({ provider, model, onChange }: ModelSelectorProps) {
  const { openrouter, huggingface, gemini } = useKeys()
  const [models, setModels] = useState<ModelSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerKey = useMemo(() => {
    if (provider === 'openrouter') return openrouter ?? ''
    if (provider === 'gemini') return gemini ?? ''
    if (provider === 'huggingface') return huggingface ?? ''
    return ''
  }, [provider, openrouter, huggingface, gemini])

  async function loadModels() {
    if (provider === 'auto') {
      setModels([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fetched = await fetchModels(provider, providerKey)
      const list = fetched.length > 0 ? fetched : (fallbackModels[provider] ?? [])
      setModels(list)

      const first = list[0]?.id
      const currentValid = list.some((m) => m.id === model)
      if (first && !currentValid && provider !== 'auto') {
        onChange(provider, first)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setModels(fallbackModels[provider] ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, providerKey])

  const availableProviders = useMemo(
    () =>
      providers.filter(
        (p) =>
          p.id === 'auto' ||
          (p.id === 'openrouter' && openrouter) ||
          (p.id === 'gemini' && gemini) ||
          (p.id === 'huggingface' && huggingface)
      ),
    [openrouter, gemini, huggingface]
  )

  // If the saved provider is no longer available (key removed), fall back to auto
  useEffect(() => {
    if (provider !== 'auto' && !availableProviders.some((p) => p.id === provider)) {
      onChange('auto', '')
    }
  }, [provider, availableProviders, onChange])

  const selectedProviderLabel = useMemo(
    () => availableProviders.find((p) => p.id === provider)?.label ?? provider,
    [availableProviders, provider]
  )

  const shownModels = useMemo(
    () => (provider === 'auto' ? [] : models.length > 0 ? models : fallbackModels[provider] ?? []),
    [provider, models]
  )

  const selectedModelName = useMemo(
    () => shownModels.find((m) => m.id === model)?.name,
    [shownModels, model]
  )

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex gap-2">
        <Select
          value={provider}
          onValueChange={(value) => {
            onChange(value, '')
          }}
        >
          <SelectTrigger
            className="w-full sm:w-[140px]"
            aria-label="AI provider"
          >
            <SelectValue placeholder="Provider">
              {selectedProviderLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {provider !== 'auto' && (
          <Select value={model} onValueChange={(value) => onChange(provider, value)}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              disabled={loading || shownModels.length === 0}
              aria-label="AI model"
            >
              <SelectValue placeholder={loading ? 'Loading…' : 'Select model'}>
                {selectedModelName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {shownModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {m.free ? '(free)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {provider !== 'auto' && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={loading}
            onClick={loadModels}
            title="Refresh models"
            aria-label="Refresh models"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
