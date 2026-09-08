'use client'

import { create } from 'zustand'
import {
  deleteHistory as deleteIDBHistory,
  getHistory as getIDBHistory,
  saveHistory as saveIDBHistory,
} from '@/lib/indexeddb'
import type { ProjectRecord } from '@/types'

export interface HistoryStore {
  projects: ProjectRecord[]
  loaded: boolean
  load: () => Promise<void>
  add: (project: ProjectRecord) => Promise<void>
  remove: (id: string) => Promise<void>
  clear: () => Promise<void>
}

export const useHistory = create<HistoryStore>((set) => ({
  projects: [],
  loaded: false,

  load: async () => {
    const rows = await getIDBHistory()
    const projects = rows.map((row) => row as unknown as ProjectRecord)
    set({ projects, loaded: true })
  },

  add: async (project) => {
    await saveIDBHistory(project.id, project as unknown as Record<string, unknown>)
    set((state) => ({
      projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
    }))
  },

  remove: async (id) => {
    await deleteIDBHistory(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }))
  },

  clear: async () => {
    const ids = useHistory.getState().projects.map((p) => p.id)
    await Promise.all(ids.map((id) => deleteIDBHistory(id)))
    set({ projects: [] })
  },
}))

if (typeof window !== 'undefined') {
  useHistory
    .getState()
    .load()
    .catch(() => undefined)
}
