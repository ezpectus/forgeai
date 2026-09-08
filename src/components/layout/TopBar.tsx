'use client'

import { useState } from 'react'
import { Check, Copy, Download, Rocket, Settings } from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function DeployButton() {
  const { status, components, setDeployUrl, deployUrl, setError } = useProject()
  const { deployStatus, setDeployStatus } = useUI()
  const { vercel } = useKeys()
  const [copied, setCopied] = useState(false)

  const canDeploy =
    status === 'ready' && !deployUrl && vercel && deployStatus !== 'deploying'

  async function handleDeploy() {
    if (!canDeploy) return

    setDeployStatus('deploying')

    const files: Record<string, string> = {}
    for (const component of components) {
      files[`src/components/sections/${component.name}.tsx`] = component.code
    }

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'forgeai',
          provider: 'vercel',
          files,
        }),
      })

      const data = (await res.json()) as {
        url?: string
        deployId?: string
        error?: string
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Deploy failed')
      }

      setDeployUrl(data.url)
      setDeployStatus('deployed')
    } catch (err) {
      setDeployStatus('failed')
      setError(err instanceof Error ? err.message : 'Deploy failed')
    }
  }

  function copyUrl() {
    if (!deployUrl) return
    navigator.clipboard.writeText(deployUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <Button
        size="sm"
        disabled={!canDeploy}
        className="gap-2"
        onClick={handleDeploy}
        title="Deploy to Vercel"
      >
        <Rocket className="h-4 w-4" />
        <span className="hidden sm:inline">
          {deployStatus === 'deploying' ? 'Deploying...' : 'Deploy'}
        </span>
      </Button>

      {deployUrl && (
        <Button variant="outline" size="sm" onClick={copyUrl} className="gap-2">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Copy URL</span>
        </Button>
      )}
    </>
  )
}

function ExportMenu() {
  const { components } = useProject()
  const [open, setOpen] = useState(false)

  async function handleDownload() {
    const files: Record<string, string> = {}
    for (const component of components) {
      files[`src/components/sections/${component.name}.tsx`] = component.code
    }

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })

    if (!res.ok) return

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'forgeai-project.zip'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleDownload}>
          Download ZIP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopBar() {
  const openSettings = useUI((state) => state.openSettings)

  return (
    <header className="flex h-14 justify-between border-b bg-background px-4">
      <span className="hidden text-lg font-semibold md:inline">ForgeAI</span>
      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <ExportMenu />

        <DeployButton />
      </div>
    </header>
  )
}
