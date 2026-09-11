'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { PromptInput } from '@/components/prompt/PromptInput'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { GenerationError } from '@/components/generate/GenerationError'

const loading = () => (
  <div className="flex h-full w-full items-center justify-center p-6">
    <Skeleton className="h-full w-full" />
  </div>
)

const CustomizePanel = dynamic(
  () =>
    import('@/components/gallery/CustomizePanel').then((m) => m.CustomizePanel),
  { ssr: false, loading }
)
const GalleryView = dynamic(
  () =>
    import('@/components/gallery/GalleryView').then((mod) => mod.GalleryView),
  { ssr: false, loading }
)
const GenerationProgress = dynamic(
  () =>
    import('@/components/generate/GenerationProgress').then(
      (mod) => mod.GenerationProgress
    ),
  { ssr: false, loading }
)
const GenerationSuccess = dynamic(
  () =>
    import('@/components/generate/GenerationSuccess').then(
      (mod) => mod.GenerationSuccess
    ),
  { ssr: false, loading }
)
const LivePreview = dynamic(
  () =>
    import('@/components/preview/LivePreview').then((mod) => mod.LivePreview),
  { ssr: false, loading }
)
const ProjectFiles = dynamic(
  () =>
    import('@/components/preview/ProjectFiles').then((m) => m.ProjectFiles),
  { ssr: false, loading }
)
const LocalPreview = dynamic(
  () =>
    import('@/components/preview/LocalPreview').then((m) => m.LocalPreview),
  { ssr: false, loading }
)
const EditorOverlay = dynamic(
  () =>
    import('@/components/editor/EditorOverlay').then(
      (mod) => mod.EditorOverlay
    ),
  { ssr: false, loading }
)

export function MainArea({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const { status, deployUrl, error } = useProject()
  const { deployStatus, galleryOpen, customizeTemplateId, openCustomize } =
    useUI()

  const previewStatus =
    deployStatus === 'deployed'
      ? 'ready'
      : deployStatus === 'failed'
        ? 'error'
        : 'building'

  // Navigation (gallery / customize / reports) must take priority over a ready project,
  // otherwise the user can never switch modes or start a new template after generation.
  let content: ReactNode = <PromptInput />
  if (customizeTemplateId) {
    content = <CustomizePanel templateId={customizeTemplateId} />
  } else if (galleryOpen) {
    content = <GalleryView onSelect={(id) => openCustomize(id)} />
  } else if (status === 'generating') {
    content = <GenerationProgress />
  } else if (status === 'ready' && deployUrl) {
    content = (
      <EditorOverlay>
        <LivePreview
          url={deployUrl}
          status={previewStatus}
          error={error ?? undefined}
        />
      </EditorOverlay>
    )
  } else if (status === 'error') {
    content = <GenerationError />
  } else if (status === 'ready') {
    // No deployed URL — render the project locally (server-side bundle +
    // compiled Tailwind in a sandboxed iframe) plus a file browser (S22).
    content = (
      <EditorOverlay>
        <div className="flex h-full w-full flex-col gap-4">
          <div className="min-h-0 flex-1">
            <LocalPreview />
          </div>
          <GenerationSuccess />
          <ProjectFiles />
        </div>
      </EditorOverlay>
    )
  }

  let viewLabel = 'Prompt input'
  if (customizeTemplateId) {
    viewLabel = 'Customizing template'
  } else if (galleryOpen) {
    viewLabel = 'Template gallery'
  } else if (status === 'generating') {
    viewLabel = 'Generating project'
  } else if (status === 'error') {
    viewLabel = 'Generation failed'
  } else if (status === 'ready' && deployUrl) {
    viewLabel = 'Live preview'
  } else if (status === 'ready') {
    viewLabel = 'Project ready'
  }

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-6',
        className
      )}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {viewLabel}
      </div>
      {children ?? content}
    </main>
  )
}
