const DB_NAME = 'forgeai-db'
const DB_VERSION = 1
const STORE_NAME = 'keys'

// Open the browser's IndexedDB used to store user API keys locally (BYOK).
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

// Read a saved API key from the browser's local IndexedDB store.
export async function getKey(id: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => {
      const result = request.result as { id: string; value: string } | undefined
      resolve(result?.value ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

// Persist an API key in the browser's local IndexedDB store.
export async function setKey(id: string, value: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put({ id, value })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Remove a saved API key from the browser's local IndexedDB store.
export async function deleteKey(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
