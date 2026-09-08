'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          className={cn(
            'absolute z-50 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
            className
          )}
          style={{ left: '50%', bottom: '100%', marginBottom: '0.5rem' }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }
