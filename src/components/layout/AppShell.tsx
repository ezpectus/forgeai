'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useUI } from '@/stores/ui'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainArea } from './MainArea'
import { StatusBar } from './StatusBar'

const EditPanel = dynamic(
  () =>
    import('@/components/editor/EditPanel').then((mod) => ({
      default: mod.EditPanel,
    })),
  { ssr: false }
)
const SettingsDialog = dynamic(
  () =>
    import('@/components/settings/SettingsDialog').then((mod) => ({
      default: mod.SettingsDialog,
    })),
  { ssr: false }
)
const ProjectsDialog = dynamic(
  () =>
    import('@/components/projects/ProjectsDialog').then((mod) => ({
      default: mod.ProjectsDialog,
    })),
  { ssr: false }
)

export function AppShell({ children }: { children?: ReactNode }) {
  const { closeSettings, closeProjects, closeGallery, closeCustomize } = useUI()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeSettings()
        closeProjects()
        closeGallery()
        closeCustomize()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeSettings, closeProjects, closeGallery, closeCustomize])

  return (
    <div className="flex h-screen w-full flex-col md:grid md:grid-cols-[240px_1fr] md:grid-rows-[auto_1fr_auto]">
      <Sidebar className="md:col-start-1 md:row-span-3" />
      <TopBar />
      <MainArea className="md:col-start-2">{children}</MainArea>
      <StatusBar />
      <EditPanel />
      <SettingsDialog />
      <ProjectsDialog />
    </div>
  )
}
