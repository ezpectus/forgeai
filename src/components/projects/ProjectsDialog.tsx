'use client'

import { useHistory } from '@/stores/history'
import { useUI } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Folder } from 'lucide-react'

export function ProjectsDialog() {
  const { projectsOpen, closeProjects } = useUI()
  const { projects, remove, loaded } = useHistory()

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
            <p className="text-sm text-muted-foreground">
              No projects yet. Generate something and it will appear here.
            </p>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col gap-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-1 rounded border p-3"
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
