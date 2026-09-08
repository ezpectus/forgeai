import { useState } from 'react'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ComponentState } from '@/types'

const statusIcons = {
  pending: Circle,
  generating: Loader2,
  ready: CheckCircle,
  error: AlertCircle,
  editing: Circle,
}

const statusClasses = {
  pending: 'text-muted-foreground',
  generating: 'text-primary',
  ready: 'text-green-500',
  error: 'text-red-500',
  editing: 'text-muted-foreground',
}

export function ComponentStatusRow({
  component,
}: {
  component: ComponentState
}) {
  const [open, setOpen] = useState(false)
  const Icon = statusIcons[component.status]
  const isSpinning = component.status === 'generating'

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${statusClasses[component.status]} ${
              isSpinning ? 'animate-spin' : ''
            }`}
          />
          <span className="font-medium">{component.name}</span>
          {component.cost !== undefined && (
            <span className="text-xs text-muted-foreground">
              ${component.cost.toFixed(6)}
            </span>
          )}
        </div>
        {component.code && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:text-foreground"
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {component.error && (
        <p className="mt-1 text-sm text-red-500">{component.error}</p>
      )}
      {open && component.code && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
          {component.code}
        </pre>
      )}
    </div>
  )
}
