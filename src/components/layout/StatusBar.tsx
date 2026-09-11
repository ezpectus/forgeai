'use client'

import { useProject } from '@/stores/project'

export function StatusBar() {
  // Three single-value selectors — an object selector without `useShallow`
  // returns a new snapshot every call and loops React's useSyncExternalStore.
  const status = useProject((state) => state.status)
  const components = useProject((state) => state.components)
  const cost = useProject((state) => state.cost)

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
