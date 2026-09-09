'use client'

import { useState } from 'react'
import { Check, HelpCircle, Loader2, Trash2, X } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useUI } from '@/stores/ui'
import { checkProviderHealth } from '@/lib/health'
import type { ProviderKeys } from '@/lib/health'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Provider = 'openrouter' | 'huggingface' | 'gemini' | 'supabase' | 'vercel'

// The /api/health endpoint currently only supports AI providers.
const AI_PROVIDERS: Provider[] = ['openrouter', 'huggingface', 'gemini']

interface TestState {
  status: 'idle' | 'testing' | 'ok' | 'error'
  message?: string
}

const fields: {
  key: keyof Omit<
    ReturnType<typeof useKeys.getState>,
    'setKey' | 'deleteKey' | 'loadKeys'
  >
  label: string
  type: 'password' | 'text'
  link: string
  provider?: Provider
  help?: string
  rateLimitLink?: string
}[] = [
  {
    key: 'openrouter',
    label: 'OpenRouter API Key',
    type: 'password',
    link: 'https://openrouter.ai/keys',
    provider: 'openrouter',
    help: 'Create a key, then check Limits in your account. Free models work with $0 balance.',
  },
  {
    key: 'huggingface',
    label: 'HuggingFace Token',
    type: 'password',
    link: 'https://hf.co/settings/tokens',
    provider: 'huggingface',
    help: 'Use a token with read access. Inference is free for open models.',
  },
  {
    key: 'gemini',
    label: 'Gemini API Key',
    type: 'password',
    link: 'https://aistudio.google.com/app/apikey',
    provider: 'gemini',
    help: 'Make sure the Generative Language API is enabled on the same project. Rate limits are shown in Google AI Studio only for that project.',
    rateLimitLink:
      'https://aistudio.google.com/app/plan_information',
  },
  {
    key: 'supabaseUrl',
    label: 'Supabase URL',
    type: 'text',
    link: 'https://supabase.com',
    provider: 'supabase',
  },
  {
    key: 'supabaseKey',
    label: 'Supabase Key',
    type: 'password',
    link: 'https://supabase.com',
    provider: 'supabase',
  },
  {
    key: 'vercel',
    label: 'Vercel Token',
    type: 'password',
    link: 'https://vercel.com/account/tokens',
    provider: 'vercel',
  },
]

/**
 * Settings dialog form. Lets the user enter, test, and persist API keys
 * for all supported providers in IndexedDB (BYOK).
 */
export function SettingsForm() {
  const { closeSettings } = useUI()
  const keys = useKeys()

  const [values, setValues] = useState({
    openrouter: keys.openrouter ?? '',
    huggingface: keys.huggingface ?? '',
    gemini: keys.gemini ?? '',
    supabaseUrl: keys.supabaseUrl ?? '',
    supabaseKey: keys.supabaseKey ?? '',
    vercel: keys.vercel ?? '',
  })

  const [tests, setTests] = useState<Record<Provider, TestState>>({
    openrouter: { status: 'idle' },
    huggingface: { status: 'idle' },
    gemini: { status: 'idle' },
    supabase: { status: 'idle' },
    vercel: { status: 'idle' },
  })

  const [saving, setSaving] = useState(false)

  async function handleTest(provider: Provider) {
    setTests((prev) => ({ ...prev, [provider]: { status: 'testing' } }))

    const token = (values[provider as keyof typeof values] ?? '').trim()

    const testKeys: ProviderKeys = {}
    if (provider === 'openrouter') testKeys.openrouter = token
    if (provider === 'gemini') testKeys.gemini = token
    if (provider === 'huggingface') testKeys.huggingface = token

    try {
      const result = await checkProviderHealth(provider, testKeys)

      if (result.ok) {
        setTests((prev) => ({
          ...prev,
          [provider]: { status: 'ok' },
        }))
      } else {
        setTests((prev) => ({
          ...prev,
          [provider]: { status: 'error', message: result.error ?? 'Test failed' },
        }))
      }
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [provider]: { status: 'error', message: 'Connection failed' },
      }))
    }
  }

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(values) as [keyof typeof values, string][]

    await Promise.all(
      entries.map(([key, value]) =>
        value ? keys.setKey(key, value) : keys.deleteKey(key)
      )
    )

    setSaving(false)
    closeSettings()
  }

  function handleCancel() {
    closeSettings()
  }

  return (
    <div className="grid gap-4 py-4">
      {fields.map(({ key, label, type, link, provider, help, rateLimitLink }) => (
        <div key={key} className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={key}>{label}</Label>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title={`Get ${label}`}
            >
              <HelpCircle className="h-4 w-4" />
            </a>
          </div>
          <div className="flex gap-2">
            <Input
              id={key}
              type={type}
              value={values[key as keyof typeof values]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              className="flex-1"
            />
            {values[key as keyof typeof values] && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setValues((prev) => ({ ...prev, [key]: '' }))
                }
                title={`Clear ${label}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {provider && AI_PROVIDERS.includes(provider) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={tests[provider].status === 'testing'}
                onClick={() => handleTest(provider)}
              >
                {tests[provider].status === 'testing' && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {tests[provider].status === 'ok' && (
                  <Check className="mr-1 h-4 w-4 text-success" />
                )}
                {tests[provider].status === 'error' && (
                  <X className="mr-1 h-4 w-4 text-destructive" />
                )}
                Test
              </Button>
            )}
          </div>
          {help && (
            <p className="text-xs text-muted-foreground">{help}</p>
          )}

          {rateLimitLink && (
            <a
              href={rateLimitLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Check rate limits / project quota →
            </a>
          )}

          {tests[provider as Provider]?.status === 'error' && (
            <p className="text-xs text-destructive">
              {tests[provider as Provider].message}
            </p>
          )}
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  )
}
