'use client'

import { useEffect, useState } from 'react'
import { Settings, Sparkles, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUI } from '@/stores/ui'

const STORAGE_KEY = 'forgeai_welcome_seen'

export function OnboardingDialog() {
  const [open, setOpen] = useState(false)
  const { openSettings } = useUI()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    setOpen(false)
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  function handleOpenSettings() {
    openSettings()
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome to ForgeAI
          </DialogTitle>
          <DialogDescription>
            Generate a complete website, presentation, report or landing page from a prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Step
            icon={Settings}
            title="Add your API keys"
            description="Open settings and add at least one AI provider key (OpenRouter, Gemini or HuggingFace)."
          />
          <Step
            icon={Globe}
            title="Choose a mode"
            description="Pick Website, Slides, Reports or any other mode in the sidebar."
          />
          <Step
            icon={FileText}
            title="Prompt and generate"
            description="Describe what you want and press Ctrl/Cmd + Enter to generate."
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleOpenSettings} variant="outline" className="flex-1 gap-2">
            <Settings className="h-4 w-4" />
            Open settings
          </Button>
          <Button onClick={handleClose} className="flex-1">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Step({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
