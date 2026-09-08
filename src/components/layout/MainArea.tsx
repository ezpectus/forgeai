'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { PromptInput } from '@/components/prompt/PromptInput'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'

const CustomizePanel = dynamic(
  () =>
    import('@/components/gallery/CustomizePanel').then((m) => m.CustomizePanel)
)
const GalleryView = dynamic(
  () =>
    import('@/components/gallery/GalleryView').then((mod) => ({
      default: mod.GalleryView,
    }))
)
const GenerationProgress = dynamic(
  () =>
    import('@/components/generate/GenerationProgress').then((mod) => ({
      default: mod.GenerationProgress,
    }))
)
const LivePreview = dynamic(
  () =>
    import('@/components/preview/LivePreview').then((mod) => ({
      default: mod.LivePreview,
    }))
)
const EditorOverlay = dynamic(
  () =>
    import('@/components/editor/EditorOverlay').then((mod) => ({
      default: mod.EditorOverlay,
    }))
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

  if (customizeTemplateId) {
    content = <CustomizePanel templateId={customizeTemplateId} />
  } else if (galleryOpen) {
    content = <GalleryView onSelect={(id) => openCustomize(id)} />
  } else if (status === 'generating') {
    content = <GenerationProgress />
  } else if (deployUrl) {
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
    content = <GenerationProgress />
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
