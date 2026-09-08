'use client'

import { useState } from 'react'
import { Download, Rocket, Settings } from 'lucide-react'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TopBar() {
  const deployUrl = useProject((state) => state.deployUrl)
  const openSettings = useUI((state) => state.openSettings)
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <span className="hidden text-lg font-semibold md:inline">ForgeAI</span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Download ZIP</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          disabled={!deployUrl}
          className="gap-2"
          onClick={() => window.open(deployUrl ?? '', '_blank')}
        >
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Deploy</span>
        </Button>
      </div>
    </header>
  )
}
