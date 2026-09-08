import type { ReactNode } from 'react'
import { PromptInput } from '@/components/prompt/PromptInput'
import { cn } from '@/lib/utils'

export function MainArea({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-6',
        className
      )}
    >
      {children ?? <PromptInput />}
    </main>
  )
}
