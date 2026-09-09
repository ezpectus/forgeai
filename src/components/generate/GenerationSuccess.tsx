'use client'

import { Check, Plus, ExternalLink, Copy, Loader2, AlertCircle, Download, Rocket } from 'lucide-react'
import { useState } from 'react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { openUrl } from '@/lib/open-url'
import { formatCost } from '@/lib/cost-estimate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DeployButton, ExportMenu } from '@/components/layout/TopBar'
import { ComponentStatusRow } from './ComponentStatusRow'

/**
 * Shown when a project is ready. Summarizes the result and gives quick actions
 * for exporting, deploying, opening the live URL, or starting a new project.
 */
export function GenerationSuccess() {
  const {
    components,
    cost,
    intent,
    projectId,
    deployUrl,
    error,
    reset,
  } = useProject()

  const [copied, setCopied] = useState(false)
  const { deployStatus } = useUI()

  function handleNewProject() {
    reset()
  }

  function copyUrl() {
    if (!deployUrl) return
    navigator.clipboard.writeText(deployUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your project is ready
        </h2>
        <p className="text-sm text-muted-foreground">
          {components.length} components · {formatCost(cost)}
          {projectId && ` · ID ${projectId.slice(0, 8)}`}
        </p>
      </div>

      {intent && (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded border p-2 text-center">
            <p className="font-medium capitalize">{intent.type}</p>
            <p className="text-xs text-muted-foreground">Type</p>
          </div>
          <div className="rounded border p-2 text-center">
            <p className="font-medium capitalize">{intent.palette}</p>
            <p className="text-xs text-muted-foreground">Palette</p>
          </div>
          <div className="rounded border p-2 text-center">
            <p className="font-medium capitalize">{intent.tone}</p>
            <p className="text-xs text-muted-foreground">Tone</p>
          </div>
          <div className="rounded border p-2 text-center">
            <p className="font-medium capitalize">{intent.style}</p>
            <p className="text-xs text-muted-foreground">Style</p>
          </div>
        </div>
      )}

      {deployUrl ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-primary underline"
              >
                {deployUrl}
              </a>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyUrl}
                title="Copy URL"
                aria-label={copied ? 'URL copied' : 'Copy URL'}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openUrl(deployUrl)}
                title="Open"
                aria-label="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : deployStatus === 'deploying' ? (
        <div className="flex items-center gap-2 rounded border p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Deploying to Vercel...</span>
        </div>
      ) : deployStatus === 'failed' ? (
        <div className="flex items-center gap-2 rounded border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Deploy failed. Check your Vercel token and try again.</span>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What&apos;s next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Download the full project as a ZIP and run it locally.</span>
              </div>
              <div className="flex items-start gap-2">
                <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Deploy to Vercel in one click if you have a token.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {components.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Components</p>
          {components.map((component) => (
            <ComponentStatusRow key={component.name} component={component} />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <ExportMenu />
            <DeployButton />
          </div>
          <Button variant="outline" onClick={handleNewProject} className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
