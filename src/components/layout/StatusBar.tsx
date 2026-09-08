'use client'

import { useProject } from '@/stores/project'

export function StatusBar() {
  const { status, components, cost } = useProject((state) => ({
    status: state.status,
    components: state.components,
    cost: state.cost,
  }))

  const readyCount = components.filter((c) => c.status === 'ready').length

  return (
    <footer className="flex h-8 items-center justify-between border-t bg-muted px-4 text-xs text-muted-foreground">
      <span className="capitalize">Status: {status}</span>
      <span>
        Components: {readyCount}/{components.length}
      </span>
      <span>Cost: ${cost.toFixed(4)}</span>
    </footer>
  )
}
