import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelect() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) {
    throw new Error('Select compound components must be used inside <Select />')
  }
  return ctx
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children?: React.ReactNode
}

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelect()
  return (
    <button
      type="button"
      ref={ref}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ placeholder, ...props }, ref) => {
  const { value } = useSelect()
  return (
    <span ref={ref} {...props}>
      {value || placeholder}
    </span>
  )
})
SelectValue.displayName = 'SelectValue'

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useSelect()
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
        className
      )}
      {...props}
    />
  )
})
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const { value: selected, onValueChange, setOpen } = useSelect()
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        selected === value && 'bg-accent text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
SelectItem.displayName = 'SelectItem'

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
