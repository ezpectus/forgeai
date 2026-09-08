'use client'

import { useState } from 'react'
import {
  FileText,
  Globe,
  Headphones,
  Image,
  LayoutGrid,
  Menu,
  MessageSquare,
  Monitor,
  PenTool,
  Table2,
  Video,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
  const [mobileOpen, setMobileOpen] = useState(false)

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
              setMobileOpen(false)
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

      <div className="fixed left-0 top-0 z-50 flex h-14 w-full items-center justify-between border-b bg-background px-4 md:hidden">
        <span className="font-semibold">ForgeAI</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-40 flex flex-col border-b bg-background pb-4 md:hidden">
          {list}
        </div>
      )}
    </>
  )
}
