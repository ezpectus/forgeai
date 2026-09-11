'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Download, FileCode, Folder } from 'lucide-react'
import { useProject } from '@/stores/project'
import { Button } from '@/components/ui/button'

/**
 * Honest local preview: a browsable view of the generated project's files.
 * A real rendered preview requires a bundler (S22) — until then this shows
 * exactly what was generated instead of an empty area.
 */
export function ProjectFiles() {
  const { files, projectId } = useProject()
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const paths = useMemo(() => Object.keys(files ?? {}).sort(), [files])
  const tree = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const p of paths) {
      const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '(root)'
      ;(groups[dir] ??= []).push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [paths])

  if (!files || paths.length === 0) return null

  const current = selected ?? paths[0]
  const code = files[current] ?? ''
  const lines = code.split('\n')

  async function handleDownload() {
    if (!files || downloading) return
    setDownloading(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? `Export failed (HTTP ${res.status})`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forgeai-${(projectId ?? 'project').slice(0, 8)}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // surfaced nowhere else — log so it's diagnosable
      console.error('[ProjectFiles] export failed')
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2 rounded border bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">
          Project files ({paths.length})
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copy file"
            aria-label="Copy file"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={downloading}
            title="Download ZIP"
            aria-label="Download ZIP"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid max-h-[420px] grid-cols-[180px_1fr] overflow-hidden">
        <div className="overflow-y-auto border-r p-2 text-xs">
          {tree.map(([dir, filesInDir]) => (
            <div key={dir} className="mb-2">
              <p className="mb-1 flex items-center gap-1 px-1 text-muted-foreground">
                <Folder className="h-3 w-3" />
                {dir}
              </p>
              {filesInDir.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left font-mono ${
                    p === current
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60'
                  }`}
                >
                  <FileCode className="h-3 w-3 shrink-0" />
                  {p.slice(dir === '(root)' ? 0 : dir.length + 1)}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="overflow-auto">
          <p className="sticky top-0 border-b bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {current}
          </p>
          <pre className="p-2 font-mono text-[11px] leading-relaxed">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 shrink-0 select-none pr-2 text-right text-muted-foreground/50">
                  {i + 1}
                </span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}
