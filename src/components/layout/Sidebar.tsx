'use client'

import { useState } from 'react'
import {
  FileText,
  Globe,
  Headphones,
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

export function Sidebar({ className }: { className?: string }) {
  const [active, setActive] = useState('website')
  const { mobileSidebarOpen, closeMobileSidebar } = useUI()

  const list = (
    <nav className="flex flex-col gap-1 p-3">
      {functions.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActive(item.id)
              closeMobileSidebar()
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active === item.id
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
          'hidden w-[240px] flex-col border-r bg-background md:flex',
          className
        )}
      >
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          ForgeAI
        </div>
        {list}
      </div>

      <Dialog open={mobileSidebarOpen} onOpenChange={closeMobileSidebar}>
        <DialogContent className="fixed inset-y-0 left-0 top-0 h-full w-[280px] max-w-none translate-x-0 translate-y-0 justify-start rounded-none border-r bg-background p-0">
          <div className="flex h-14 items-center border-b px-4 font-semibold">
            ForgeAI
          </div>
          {list}
        </DialogContent>
      </Dialog>
    </>
  )
}
