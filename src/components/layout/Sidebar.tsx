'use client'

import {
  FileText,
  Folder,
  Globe,
  Headphones,
  Home,
  Image,
  LayoutGrid,
  MessageSquare,
  Monitor,
  PenTool,
  Table2,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUI } from '@/stores/ui'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

const functions = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'slides', label: 'Slides', icon: Monitor },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'canvas', label: 'Canvas', icon: PenTool },
  { id: 'carousel', label: 'Carousel', icon: LayoutGrid },
  { id: 'audio', label: 'Audio', icon: Headphones },
  { id: 'spreadsheets', label: 'Spreadsheets', icon: Table2 },
]

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'projects', label: 'My Projects', icon: Folder },
]

/**
 * Navigation sidebar listing all ForgeAI functions (Website, Slides, Images, etc.)
 * with a desktop sidebar and a mobile dialog version.
 */
export function Sidebar({ className }: { className?: string }) {
  const {
    mobileSidebarOpen,
    closeMobileSidebar,
    activeMode,
    setActiveMode,
    galleryOpen,
    customizeTemplateId,
    openGallery,
    closeGallery,
    closeCustomize,
    openProjects,
    closeProjects,
    projectsOpen,
  } = useUI()

  const isInGallery = galleryOpen || customizeTemplateId !== null

  function selectMode(id: string) {
    setActiveMode(id)
    closeProjects()
    if (isInGallery) {
      closeGallery()
      closeCustomize()
    }
    closeMobileSidebar()
  }

  const topNav = (
    <nav className="flex flex-col gap-1 border-b p-3">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          item.id === 'home'
            ? !isInGallery
            : item.id === 'projects'
              ? projectsOpen
              : isInGallery
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'home') {
                closeGallery()
                closeCustomize()
                closeProjects()
              } else if (item.id === 'projects') {
                openProjects()
              } else {
                closeProjects()
                openGallery()
              }
              closeMobileSidebar()
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  const list = (
    <nav className="flex flex-col gap-1 overflow-y-auto p-3">
      <p className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
        Mode
      </p>
      {functions.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => selectMode(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeMode === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      <div
        className={cn(
          'hidden h-full w-[240px] flex-col border-r bg-background md:flex',
          className
        )}
      >
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          ForgeAI
        </div>
        {topNav}
        {list}
      </div>

      <Dialog open={mobileSidebarOpen} onOpenChange={closeMobileSidebar}>
        <DialogContent className="fixed inset-y-0 left-0 top-0 h-full w-[280px] max-w-none translate-x-0 translate-y-0 justify-start rounded-none border-r bg-background p-0">
          <div className="flex h-14 items-center border-b px-4 font-semibold">
            ForgeAI
          </div>
          {topNav}
          {list}
        </DialogContent>
      </Dialog>
    </>
  )
}
