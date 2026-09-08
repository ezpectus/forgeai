import type { ReactNode } from 'react'
import { GenerationProgress } from '@/components/generate/GenerationProgress'
import { PromptInput } from '@/components/prompt/PromptInput'
import { useProject } from '@/stores/project'
import { cn } from '@/lib/utils'

export function MainArea({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const { status } = useProject()

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-6',
        className
      )}
    >
      {children ??
        (status === 'generating' ? <GenerationProgress /> : <PromptInput />)}
    </main>
  )
}
