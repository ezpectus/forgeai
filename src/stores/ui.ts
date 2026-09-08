import { create } from 'zustand'
import type { UIState } from '@/types'

export type UIStore = UIState & {
  openSettings: () => void
  closeSettings: () => void
  openEditor: () => void
  closeEditor: () => void
  openGallery: () => void
  closeGallery: () => void
  openCustomize: (templateId: string) => void
  closeCustomize: () => void
  selectComponent: (name: string | null) => void
  setDeployStatus: (status: UIState['deployStatus']) => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleMobileSidebar: () => void
}

const initialState: UIState = {
  settingsOpen: false,
  editorOpen: false,
  galleryOpen: false,
  customizeTemplateId: null,
  selectedComponent: null,
  deployStatus: 'idle',
  mobileSidebarOpen: false,
}

// Zustand store that controls the visible shell: open panels, selected
// component, deploy status, and mobile sidebar.
export const useUI = create<UIStore>((set) => ({
  ...initialState,

  openSettings: () => set({ settingsOpen: true }),

  closeSettings: () => set({ settingsOpen: false }),

  openEditor: () => set({ editorOpen: true }),

  closeEditor: () => set({ editorOpen: false, selectedComponent: null }),

  openGallery: () => set({ galleryOpen: true }),

  closeGallery: () => set({ galleryOpen: false }),

  openCustomize: (customizeTemplateId) =>
    set({ customizeTemplateId, galleryOpen: false }),

  closeCustomize: () => set({ customizeTemplateId: null }),

  selectComponent: (selectedComponent) => set({ selectedComponent }),

  setDeployStatus: (deployStatus) => set({ deployStatus }),

  openMobileSidebar: () => set({ mobileSidebarOpen: true }),

  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
}))
