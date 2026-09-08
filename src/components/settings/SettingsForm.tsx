'use client'

import { useState } from 'react'
import { Check, HelpCircle, Loader2, X } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useUI } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Provider = 'openrouter' | 'huggingface' | 'supabase' | 'vercel'

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
}[] = [
  {
    key: 'openrouter',
    label: 'OpenRouter API Key',
    type: 'password',
    link: 'https://openrouter.ai/keys',
    provider: 'openrouter',
  },
  {
    key: 'huggingface',
    label: 'HuggingFace Token',
    type: 'password',
    link: 'https://hf.co/settings/tokens',
    provider: 'huggingface',
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

export function SettingsForm() {
  const { closeSettings } = useUI()
  const keys = useKeys()

  const [values, setValues] = useState({
    openrouter: keys.openrouter ?? '',
    huggingface: keys.huggingface ?? '',
    supabaseUrl: keys.supabaseUrl ?? '',
    supabaseKey: keys.supabaseKey ?? '',
    vercel: keys.vercel ?? '',
  })

  const [tests, setTests] = useState<Record<Provider, TestState>>({
    openrouter: { status: 'idle' },
    huggingface: { status: 'idle' },
    supabase: { status: 'idle' },
    vercel: { status: 'idle' },
  })

  const [saving, setSaving] = useState(false)

  async function handleTest(provider: Provider) {
    setTests((prev) => ({ ...prev, [provider]: { status: 'testing' } }))

    const token =
      provider === 'supabase'
        ? (keys.supabaseKey ?? '')
        : (values[provider as keyof typeof values] ?? '')

    try {
      const res = await fetch(`/api/health?provider=${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setTests((prev) => ({
          ...prev,
          [provider]: { status: 'ok' },
        }))
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        setTests((prev) => ({
          ...prev,
          [provider]: { status: 'error', message: data.error },
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
      {fields.map(({ key, label, type, link, provider }) => (
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
            {provider && (
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
                  <Check className="mr-1 h-4 w-4 text-green-500" />
                )}
                {tests[provider].status === 'error' && (
                  <X className="mr-1 h-4 w-4 text-red-500" />
                )}
                Test
              </Button>
            )}
          </div>
          {tests[provider as Provider]?.status === 'error' && (
            <p className="text-xs text-red-500">
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
