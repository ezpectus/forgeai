'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { fetchModels, checkProviderHealth, type ModelSummary } from '@/lib/health'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { Gemini } from '@/plugins/providers/gemini'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

// Build fallback model lists from the provider's own defaultModel + supportedModels
// so there is a single source of truth and no hardcoded duplicates.
function buildFallbackModels(provider: string): ModelSummary[] {
  if (provider === 'openrouter') {
    return OpenRouter.supportedModels.length > 0
      ? OpenRouter.supportedModels.map((id) => ({ id, name: id, free: id.endsWith(':free') || id === 'openrouter/free' }))
      : [{ id: OpenRouter.defaultModel, name: OpenRouter.defaultModel }]
  }
  if (provider === 'gemini') {
    return Gemini.supportedModels.map((id) => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      free: id.includes('flash') || id.includes('lite'),
    }))
  }
  if (provider === 'huggingface') {
    return HuggingFace.supportedModels.map((id) => ({ id, name: id, free: true }))
  }
  return []
}

const fallbackModels: Record<string, ModelSummary[]> = {
  openrouter: buildFallbackModels('openrouter'),
  gemini: buildFallbackModels('gemini'),
  huggingface: buildFallbackModels('huggingface'),
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

  const [health, setHealth] = useState<Record<string, 'ok' | 'error' | 'checking'>>({})

  async function loadModels() {
    if (provider === 'auto') {
      setModels([])
      setError(null)
      return
    }

    setModels(fallbackModels[provider] ?? [])
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

  useEffect(() => {
    let cancelled = false
    async function checkAll() {
      const next: Record<string, 'ok' | 'error' | 'checking'> = {}
      for (const p of providers) {
        if (p.id === 'auto') continue
        const key =
          p.id === 'openrouter'
            ? openrouter
            : p.id === 'gemini'
              ? gemini
              : p.id === 'huggingface'
                ? huggingface
                : ''
        if (!key) {
          next[p.id] = 'error'
          continue
        }
        next[p.id] = 'checking'
        const result = await checkProviderHealth(p.id, {
          openrouter,
          gemini,
          huggingface,
        })
        if (!cancelled) {
          next[p.id] = result.ok ? 'ok' : 'error'
        }
      }
      if (!cancelled) setHealth(next)
    }
    checkAll()
    return () => {
      cancelled = true
    }
  }, [openrouter, gemini, huggingface])

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
                <span className="flex items-center gap-2">
                  <span
                    className={
                      'h-2 w-2 rounded-full ' +
                      (p.id === 'auto'
                        ? 'bg-gray-400'
                        : health[p.id] === 'ok'
                          ? 'bg-green-500'
                          : health[p.id] === 'error'
                            ? 'bg-red-500'
                            : 'bg-gray-400 animate-pulse')
                    }
                    aria-hidden="true"
                  />
                  {p.label}
                </span>
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
              {shownModels.map((m, index) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name}
                    {m.free && (
                      <Badge variant="secondary" className="text-[10px]">
                        free
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        recommended
                      </Badge>
                    )}
                  </span>
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
