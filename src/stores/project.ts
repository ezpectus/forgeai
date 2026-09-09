import { create } from 'zustand'
import type { Cancellable, ComponentState, IntentResult, ProjectState } from '@/types'

export type ProjectStore = ProjectState & {
  setPrompt: (prompt: string) => void
  setIntent: (intent: IntentResult | null) => void
  addComponent: (component: ComponentState) => void
  updateComponent: (name: string, updates: Partial<ComponentState>) => void
  setProjectId: (id: string | null) => void
  setTemplateId: (templateId: string | null) => void
  setStatus: (status: ProjectState['status']) => void
  setDeployUrl: (url: string | null) => void
  setCost: (cost: number) => void
  setError: (error: string | null) => void
  setGenerationClient: (client: Cancellable | null) => void
  setFiles: (files: Record<string, string> | null) => void
  reset: () => void
  regenerate: () => void
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
  generationClient: null,
  regenerateAt: 0,
  templateId: null,
  files: null,
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

  setTemplateId: (templateId) => set({ templateId }),

  setStatus: (status) => set({ status }),

  setDeployUrl: (deployUrl) => set({ deployUrl }),

  setCost: (cost) => set({ cost }),

  setError: (error) => set({ error }),

  setGenerationClient: (client) => set({ generationClient: client }),

  setFiles: (files) => set({ files }),

  reset: () => {
    get().generationClient?.disconnect()
    set(initialState)
  },

  regenerate: () =>
    set({
      status: 'idle',
      error: null,
      regenerateAt: Date.now(),
    }),
}))
