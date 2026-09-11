'use client'

import { useState } from 'react'
import { useHistory } from '@/stores/history'
import { useUI } from '@/stores/ui'
import { useKeys } from '@/stores/keys'
import { openUrl } from '@/lib/open-url'
import type { ProjectRecord } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Folder, Inbox, Download, Rocket } from 'lucide-react'

export function ProjectsDialog() {
  const { projectsOpen, closeProjects } = useUI()
  const { projects, remove, add, loaded } = useHistory()
  const { vercel } = useKeys()
  const [redeploying, setRedeploying] = useState<string | null>(null)
  const [redeployError, setRedeployError] = useState<{ id: string; message: string } | null>(null)

  async function handleDownload(project: ProjectRecord) {
    if (!project.files) return
    setRedeployError(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: project.files }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? `Export failed (HTTP ${res.status})`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forgeai-${project.id.slice(0, 8)}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setRedeployError({
        id: project.id,
        message: err instanceof Error ? err.message : 'Export failed',
      })
    }
  }

  async function handleRedeploy(project: ProjectRecord) {
    if (!project.files || !vercel) return
    setRedeploying(project.id)
    setRedeployError(null)

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vercel}`,
        },
        body: JSON.stringify({
          provider: 'vercel',
          files: project.files,
          projectId: project.id,
        }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setRedeployError({
          id: project.id,
          message: data.error ?? 'Deploy failed',
        })
        return
      }
      await add({ ...project, deployUrl: data.url })
    } catch (err) {
      setRedeployError({
        id: project.id,
        message: err instanceof Error ? err.message : 'Deploy failed',
      })
    } finally {
      setRedeploying(null)
    }
  }

  return (
    <Dialog open={projectsOpen} onOpenChange={closeProjects}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            My Projects
          </DialogTitle>
          <DialogDescription>
            Your recent generations are saved locally in this browser.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[320px] rounded border p-2">
          {!loaded && <p className="text-sm text-muted-foreground">Loading...</p>}

          {loaded && projects.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p>No projects yet.</p>
              <p>Generate something and it will appear here.</p>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col gap-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-2 rounded border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium">
                      {project.prompt}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => remove(project.id)}
                      title="Delete project"
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{project.status}</span>
                    <span>·</span>
                    <span>{project.componentCount} components</span>
                    <span>·</span>
                    <span>${project.cost.toFixed(4)}</span>
                    <span>·</span>
                    <span>
                      {new Date(project.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={!project.files}
                      onClick={() => handleDownload(project)}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={!project.files || !vercel || redeploying === project.id}
                      onClick={() => handleRedeploy(project)}
                    >
                      <Rocket className="h-3 w-3" />
                      Redeploy
                    </Button>
                    {project.deployUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => openUrl(project.deployUrl)}
                      >
                        Open URL
                      </Button>
                    )}
                  </div>
                  {redeployError?.id === project.id && (
                    <p className="text-xs text-destructive">
                      {redeployError.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={closeProjects}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
