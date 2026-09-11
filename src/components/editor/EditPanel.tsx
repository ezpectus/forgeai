'use client'

import { useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { saveSnapshot } from '@/lib/version-history'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { useKeys } from '@/stores/keys'
import { getLastGenerationPrefs } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VersionHistory } from './VersionHistory'

function DiffView({ oldCode, newCode }: { oldCode: string; newCode: string }) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 overflow-hidden text-xs">
      <div className="overflow-auto rounded border bg-muted p-2">
        <p className="mb-1 font-semibold">Current</p>
        <pre className="whitespace-pre-wrap">{oldCode}</pre>
      </div>
      <div className="overflow-auto rounded border p-2">
        <p className="mb-1 font-semibold">Proposed</p>
        <pre className="whitespace-pre-wrap">{newCode}</pre>
      </div>
    </div>
  )
}

export function EditPanel() {
  const { selectedComponent, editorOpen, closeEditor } = useUI()
  const { components, updateComponent, templateId, files, setFiles } = useProject()
  const { openrouter, huggingface, gemini } = useKeys()

  const component = components.find((c) => c.name === selectedComponent)

  const [instruction, setInstruction] = useState('')
  const [newCode, setNewCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    if (!component || !instruction.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generate/component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentName: component.name,
          templateId: templateId ?? 'website',
          currentCode: component.code,
          instruction: instruction.trim(),
          auth: { openrouter, huggingface, gemini },
          ...(() => {
            const { provider, model } = getLastGenerationPrefs()
            return provider && model ? { provider, model } : {}
          })(),
        }),
      })

      const data = (await res.json()) as {
        component?: { code: string }
        error?: string
      }

      if (!res.ok || !data.component) {
        throw new Error(data.error ?? 'Regeneration failed')
      }

      setNewCode(data.component.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setLoading(false)
    }
  }

  function handleAccept() {
    if (!component || !newCode) return
    updateComponent(component.name, {
      code: newCode,
      version: component.version + 1,
      status: 'ready',
      error: undefined,
    })
    saveSnapshot(component.name, newCode, instruction.trim() || undefined)
    if (files) {
      setFiles({
        ...files,
        [`src/components/sections/${component.name}.tsx`]: newCode,
      })
    }
    setNewCode('')
    setInstruction('')
  }

  function handleReject() {
    setNewCode('')
    setError(null)
  }

  if (!editorOpen || !component) return null

  return (
    <div className="fixed right-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-full max-w-md flex-col border-l bg-background p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit {component.name}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeEditor}
          title="Close editor"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Describe the change you want.
      </p>
      <Textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Make the button red and bigger"
        className="mt-2 min-h-[100px] resize-none"
      />

      <Button
        onClick={handleApply}
        disabled={!instruction.trim() || loading}
        className="mt-2 gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Apply
      </Button>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {component && (
        <VersionHistory
          componentName={component.name}
          currentCode={component.code}
          onRestore={(code) => {
            updateComponent(component.name, { code, status: 'ready', error: undefined })
            if (files) {
              setFiles({
                ...files,
                [`src/components/sections/${component.name}.tsx`]: code,
              })
            }
          }}
        />
      )}

      {newCode && (
        <>
          <div className="mt-4 flex-1 overflow-hidden">
            <DiffView oldCode={component.code} newCode={newCode} />
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={handleAccept} className="flex-1 gap-2">
              <Check className="h-4 w-4" />
              Accept
            </Button>
            <Button variant="outline" onClick={handleReject} className="flex-1">
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
