import { create } from 'zustand'
import type { UIState } from '@/types'

export type UIStore = UIState & {
  openSettings: () => void
  closeSettings: () => void
  openEditor: () => void
  closeEditor: () => void
  selectComponent: (name: string | null) => void
  setDeployStatus: (status: UIState['deployStatus']) => void
}

const initialState: UIState = {
  settingsOpen: false,
  editorOpen: false,
  selectedComponent: null,
  deployStatus: 'idle',
}

export const useUI = create<UIStore>((set) => ({
  ...initialState,

  openSettings: () => set({ settingsOpen: true }),

  closeSettings: () => set({ settingsOpen: false }),

  openEditor: () => set({ editorOpen: true }),

  closeEditor: () => set({ editorOpen: false, selectedComponent: null }),

  selectComponent: (selectedComponent) => set({ selectedComponent }),

  setDeployStatus: (deployStatus) => set({ deployStatus }),
}))
