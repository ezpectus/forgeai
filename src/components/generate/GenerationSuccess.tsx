'use client'

import { Check, Plus, ExternalLink, Copy } from 'lucide-react'
import { useState } from 'react'
import { useProject } from '@/stores/project'
import { Button } from '@/components/ui/button'
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
          {components.length} components · ${cost.toFixed(6)}
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
        <div className="flex flex-col gap-2 rounded border p-4">
          <p className="text-sm font-medium">Live URL</p>
          <div className="flex items-center gap-2">
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 truncate text-sm text-primary underline"
            >
              {deployUrl}
            </a>
            <Button variant="ghost" size="icon" onClick={copyUrl} title="Copy URL">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.open(deployUrl, '_blank')} title="Open">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Export the code or deploy to Vercel to get a live URL.
        </p>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <ExportMenu />
          <DeployButton />
        </div>
        <Button variant="outline" onClick={handleNewProject} className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>
    </div>
  )
}
