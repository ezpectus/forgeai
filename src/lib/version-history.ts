export interface Snapshot {
  id: string
  timestamp: number
  code: string
  instruction?: string
}

const STORAGE_KEY = 'forgeai_version_history'
const MAX_SNAPSHOTS_PER_COMPONENT = 50

// Backed by localStorage so version history survives page refresh — the
// previous module-level object silently lost everything on reload.
let history: Record<string, Snapshot[]> | null = null

function load(): Record<string, Snapshot[]> {
  if (history) return history
  history = {}
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      if (parsed && typeof parsed === 'object') {
        history = parsed as Record<string, Snapshot[]>
      }
    } catch {
      // corrupted entry — start clean
      history = {}
    }
  }
  return history
}

function persist() {
  if (typeof window === 'undefined' || !history) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // storage full — history is best-effort
  }
}

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

  const store = load()
  if (!store[componentName]) {
    store[componentName] = []
  }

  store[componentName].push(snapshot)
  if (store[componentName].length > MAX_SNAPSHOTS_PER_COMPONENT) {
    store[componentName] = store[componentName].slice(-MAX_SNAPSHOTS_PER_COMPONENT)
  }
  persist()
  return snapshot
}

export function getHistory(componentName: string): Snapshot[] {
  return load()[componentName] ?? []
}

export function rollbackTo(componentName: string, id: string): Snapshot | null {
  const store = load()
  const snapshots = store[componentName]
  if (!snapshots) return null

  const index = snapshots.findIndex((s) => s.id === id)
  if (index === -1) return null

  // Re-order so the chosen snapshot becomes the latest. Later snapshots are
  // kept — restore is non-destructive (you can un-restore).
  const [target] = snapshots.splice(index, 1)
  snapshots.push(target)
  persist()

  return target
}

export function getCurrent(componentName: string): Snapshot | null {
  const snapshots = load()[componentName]
  return snapshots?.[snapshots.length - 1] ?? null
}
