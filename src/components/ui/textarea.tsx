import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node

        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            node
        }
      },
      [ref]
    )

    React.useEffect(() => {
      if (!autoResize) return

      const el = innerRef.current
      if (!el) return

      const maxHeight = 300
      el.style.height = 'auto'
      const target = Math.min(el.scrollHeight, maxHeight)
      el.style.height = `${target}px`
      el.style.overflowY =
        el.scrollHeight > maxHeight ? 'auto' as const : 'hidden' as const
    })

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={setRef}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
