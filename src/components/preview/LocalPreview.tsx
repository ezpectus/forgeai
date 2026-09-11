'use client'

import { useEffect, useRef, useState } from 'react'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: undefined },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '390px' },
] as const

type DeviceId = (typeof DEVICES)[number]['id']

/**
 * Real local preview: POSTs the generated files to /api/preview, which
 * bundles them server-side (esbuild + Tailwind) and returns JS + CSS that
 * render the site inside a sandboxed srcdoc iframe. No external CDN, no
 * deploy needed — edits to files re-render here on demand.
 */
export function LocalPreview() {
  const { files } = useProject()
  const { selectComponent, openEditor } = useUI()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [device, setDevice] = useState<DeviceId>('desktop')

  // The srcdoc iframe has an opaque origin (sandbox w/o allow-same-origin),
  // so its postMessage arrives with origin 'null'. EditorOverlay's origin
  // check only accepts the deployUrl/window origin — handle selection clicks
  // here instead, scoped to THIS iframe's contentWindow.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (
        event.data?.action === 'select' &&
        typeof event.data.component === 'string'
      ) {
        selectComponent(event.data.component)
        openEditor()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [selectComponent, openEditor])

  const seqRef = useRef(0)

  useEffect(() => {
    if (!files) return
    let alive = true
    const seq = ++seqRef.current
    setError(null)

    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          js?: string
          css?: string
          error?: string
        }
        if (!res.ok || !data.js) {
          throw new Error(data.error ?? `Preview failed (HTTP ${res.status})`)
        }
        // Drop stale responses — a newer files-map build may have started.
        if (!alive || seq !== seqRef.current) return
        // `</script` inside the bundle would close the iframe's script tag —
        // escape it before inlining.
        const safeJs = data.js.replace(/<\/script/gi, '<\\/script')
        const safeCss = (data.css ?? '').replace(/<\/style/gi, '<\\/style')
        setHtml(
          `<!doctype html><html><head><meta charset="utf-8"><style>${safeCss}</style></head>` +
            `<body style="margin:0"><div id="root"></div><script>${safeJs}</script></body></html>` // security-scan:ignore srcdoc iframe needs an inline script tag
        )
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Preview failed')
        }
      })

    return () => {
      alive = false
    }
  }, [files, reloadKey])

  if (!files) return null

  if (error) {
    return (
      <Card className="m-4 p-6">
        <p className="font-medium text-destructive">Preview unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-3 text-sm text-primary underline"
        >
          Retry
        </button>
      </Card>
    )
  }

  if (!html) {
    return (
      <div className="flex h-full w-full flex-col gap-2 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  const active = DEVICES.find((d) => d.id === device) ?? DEVICES[0]

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex items-center justify-end gap-1" role="group" aria-label="Preview device">
        {DEVICES.map((d) => (
          <Button
            key={d.id}
            type="button"
            variant={device === d.id ? 'default' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setDevice(d.id)}
            title={`${d.label} preview${d.width ? ` (${d.width})` : ''}`}
            aria-label={`${d.label} preview`}
            aria-pressed={device === d.id}
          >
            <d.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded bg-muted/30 p-1">
        <iframe
          ref={iframeRef}
          srcDoc={html}
          // allow-scripts only — no same-origin, no forms-post to our origin.
          // Generated FormHandler falls back to mailto without env vars anyway.
          sandbox="allow-scripts"
          className={cn(
            'h-full rounded border bg-white transition-[width] duration-200',
            !active.width && 'w-full'
          )}
          style={active.width ? { width: active.width } : undefined}
          title="Local project preview"
        />
      </div>
    </div>
  )
}
