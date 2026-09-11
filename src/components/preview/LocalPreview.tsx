'use client'

import { useEffect, useRef, useState } from 'react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

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

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      // allow-scripts only — no same-origin, no forms-post to our origin.
      // Generated FormHandler falls back to mailto without env vars anyway.
      sandbox="allow-scripts"
      className="h-full w-full rounded border bg-white"
      title="Local project preview"
    />
  )
}
