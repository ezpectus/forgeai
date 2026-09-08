import { create } from 'zustand'
import { deleteKey as deleteIDBKey, getKey, setKey as setIDBKey } from '@/lib/indexeddb'
import type { KeysState } from '@/types'

export type KeysStore = KeysState & {
  setKey: (key: keyof KeysState, value: string) => Promise<void>
  deleteKey: (key: keyof KeysState) => Promise<void>
  loadKeys: () => Promise<void>
}

const initialState: KeysState = {
  openrouter: null,
  huggingface: null,
  supabaseUrl: null,
  supabaseKey: null,
  vercel: null,
}

export const useKeys = create<KeysStore>((set) => ({
  ...initialState,

  setKey: async (key, value) => {
    await setIDBKey(key, value)
    set({ [key]: value } as Partial<KeysStore>)
  },

  deleteKey: async (key) => {
    await deleteIDBKey(key)
    set({ [key]: null } as Partial<KeysStore>)
  },

  loadKeys: async () => {
    const [openrouter, huggingface, supabaseUrl, supabaseKey, vercel] =
      await Promise.all([
        getKey('openrouter'),
        getKey('huggingface'),
        getKey('supabaseUrl'),
        getKey('supabaseKey'),
        getKey('vercel'),
      ])
    set({ openrouter, huggingface, supabaseUrl, supabaseKey, vercel })
  },
}))

if (typeof window !== 'undefined') {
  useKeys
    .getState()
    .loadKeys()
    .catch(() => undefined)
}
