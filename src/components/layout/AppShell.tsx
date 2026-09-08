import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
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

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col md:grid md:grid-cols-[240px_1fr] md:grid-rows-[auto_1fr_auto]">
      <Sidebar className="md:col-start-1 md:row-span-3" />
      <TopBar />
      <MainArea className="md:col-start-2">{children}</MainArea>
      <StatusBar />
      <EditPanel />
      <SettingsDialog />
    </div>
  )
}
