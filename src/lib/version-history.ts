export interface Snapshot {
  id: string
  timestamp: number
  code: string
  instruction?: string
}

const history: Record<string, Snapshot[]> = {}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function saveSnapshot(
  componentName: string,
  code: string,
  instruction?: string
): Snapshot {
  const snapshot: Snapshot = {
    id: createId(),
    timestamp: Date.now(),
    code,
    instruction,
  }

  if (!history[componentName]) {
    history[componentName] = []
  }

  history[componentName].push(snapshot)
  return snapshot
}

export function getHistory(componentName: string): Snapshot[] {
  return history[componentName] ?? []
}

export function rollbackTo(componentName: string, id: string): Snapshot | null {
  const snapshots = history[componentName]
  if (!snapshots) return null

  const index = snapshots.findIndex((s) => s.id === id)
  if (index === -1) return null

  // Remove later snapshots so the chosen one becomes the latest
  const [target] = snapshots.splice(index, 1)
  snapshots.push(target)

  return target
}

export function getCurrent(componentName: string): Snapshot | null {
  const snapshots = history[componentName]
  return snapshots?.[snapshots.length - 1] ?? null
}
