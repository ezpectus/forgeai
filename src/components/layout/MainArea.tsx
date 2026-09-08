import type { ReactNode } from 'react'
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
      {children ?? (
        <div className="max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            What do you want to build?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Type a prompt and ForgeAI will generate a live website for you.
          </p>
        </div>
      )}
    </main>
  )
}
