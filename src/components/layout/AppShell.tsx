import type { ReactNode } from 'react'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainArea } from './MainArea'
import { StatusBar } from './StatusBar'

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col pt-14 md:grid md:grid-cols-[240px_1fr] md:grid-rows-[auto_1fr_auto] md:pt-0">
      <Sidebar className="md:col-start-1 md:row-span-3" />
      <TopBar />
      <MainArea className="md:col-start-2">{children}</MainArea>
      <StatusBar />
      <SettingsDialog />
    </div>
  )
}
