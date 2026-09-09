'use client'

import { useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import type { DeployStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Render the generated site in a sandboxed iframe, with skeleton, error, and
 * refresh states. Used in the main preview panel after deployment.
 */
export function LivePreview({
  url,
  status,
  error,
}: {
  url: string
  status: DeployStatus['status']
  error?: string
}) {
  const [key, setKey] = useState(0)

  if (status === 'building' || !url) {
    return (
      <div className="flex h-full w-full flex-col gap-2 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Card className="m-4 p-6">
        <p className="font-medium text-destructive">Deploy failed</p>
        {error && <p className="mt-1 text-sm text-muted-foreground">{error}</p>}
      </Card>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <span className="truncate text-sm text-muted-foreground">{url}</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setKey((k) => k + 1)}
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(url, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <iframe
        key={key}
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        className="h-full w-full"
        title="Live preview"
        loading="lazy"
      />
    </div>
  )
}
