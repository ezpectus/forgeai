'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function Home() {
  const [open, setOpen] = useState(false)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold tracking-tight">ForgeAI</h1>
      <p className="text-lg text-muted-foreground">
        Open-source prompt-to-live-URL generator
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to ForgeAI</DialogTitle>
            <DialogDescription>
              This is a sample dialog to verify the shadcn/ui components render.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </main>
  )
}
