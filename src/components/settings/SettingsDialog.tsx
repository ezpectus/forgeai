'use client'

import { useUI } from '@/stores/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SettingsForm } from './SettingsForm'

export function SettingsDialog() {
  const { settingsOpen, closeSettings } = useUI()

  return (
    <Dialog open={settingsOpen} onOpenChange={closeSettings}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Keys are stored in your browser only. We never see them.
          </DialogDescription>
        </DialogHeader>
        <SettingsForm />
      </DialogContent>
    </Dialog>
  )
}
