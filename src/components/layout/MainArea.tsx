'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { PromptInput } from '@/components/prompt/PromptInput'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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
  const { status, deployUrl } = useProject()
  const { deployStatus, galleryOpen, customizeTemplateId, openCustomize } =
    useUI()

  const previewStatus =
    deployStatus === 'deployed'
      ? 'ready'
      : deployStatus === 'failed'
        ? 'error'
        : 'building'

  let content = <PromptInput />

  if (status === 'generating') {
    content = <GenerationProgress />
  } else if (status === 'ready' && deployUrl) {
    content = (
      <EditorOverlay>
        <LivePreview
          url={deployUrl}
          status={previewStatus}
          error={useProject.getState().error ?? undefined}
        />
      </EditorOverlay>
    )
  } else if (status === 'ready') {
    content = <GenerationSuccess />
  } else if (customizeTemplateId) {
    content = <CustomizePanel templateId={customizeTemplateId} />
  } else if (galleryOpen) {
    content = <GalleryView onSelect={(id) => openCustomize(id)} />
  }

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-6',
        className
      )}
    >
      {children ?? content}
    </main>
  )
}
