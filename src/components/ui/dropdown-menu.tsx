import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
  null
)

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) {
    throw new Error(
      'DropdownMenu compound components must be used inside <DropdownMenu />'
    )
  }
  return ctx
}

interface DropdownMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
}

function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  children: React.ReactNode
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild = false, children, ...props }, ref) => {
  const { open, onOpenChange } = useDropdownMenu()
  const handleClick = () => onOpenChange(!open)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
      ref,
      ...props,
    } as React.Attributes)
  }
  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useDropdownMenu()
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
        className
      )}
      {...props}
    />
  )
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
