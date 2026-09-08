import { create } from 'zustand'
import type { ComponentState, IntentResult, ProjectState } from '@/types'

export type ProjectStore = ProjectState & {
  setPrompt: (prompt: string) => void
  setIntent: (intent: IntentResult | null) => void
  addComponent: (component: ComponentState) => void
  updateComponent: (name: string, updates: Partial<ComponentState>) => void
  setProjectId: (id: string | null) => void
  setStatus: (status: ProjectState['status']) => void
  setDeployUrl: (url: string | null) => void
  setCost: (cost: number) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState: ProjectState = {
  projectId: null,
  prompt: '',
  intent: null,
  components: [],
  status: 'idle',
  deployUrl: null,
  cost: 0,
  error: null,
}

// Zustand store that holds the current generation's state: prompt, intent,
// generated components, deploy URL, cost, and any error message.
export const useProject = create<ProjectStore>((set, get) => ({
  ...initialState,

  setPrompt: (prompt) => set({ prompt }),

  setIntent: (intent) => set({ intent }),

  addComponent: (component) =>
    set({ components: [...get().components, component] }),

  updateComponent: (name, updates) =>
    set({
      components: get().components.map((component) =>
        component.name === name ? { ...component, ...updates } : component
      ),
    }),

  setProjectId: (projectId) => set({ projectId }),

  setStatus: (status) => set({ status }),

  setDeployUrl: (deployUrl) => set({ deployUrl }),

  setCost: (cost) => set({ cost }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))
