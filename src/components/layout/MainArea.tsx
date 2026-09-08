import type { ReactNode } from 'react'
import { EditorOverlay } from '@/components/editor/EditorOverlay'
import { CustomizePanel } from '@/components/gallery/CustomizePanel'
import { GalleryView } from '@/components/gallery/GalleryView'
import { GenerationProgress } from '@/components/generate/GenerationProgress'
import { LivePreview } from '@/components/preview/LivePreview'
import { PromptInput } from '@/components/prompt/PromptInput'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'

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
