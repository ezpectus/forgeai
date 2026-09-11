'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Check,
  Copy,
  Download,
  LayoutGrid,
  Menu,
  Moon,
  Rocket,
  Settings,
  Sun,
} from 'lucide-react'
import { useKeys } from '@/stores/keys'
import { useProject } from '@/stores/project'
import { useUI } from '@/stores/ui'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function DeployButton() {
  const { status, components, files, setDeployUrl, deployUrl, setError, projectId } = useProject()
  const { deployStatus, setDeployStatus } = useUI()
  const { vercel } = useKeys()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const canDeploy =
    status === 'ready' && vercel && deployStatus !== 'deploying'

  async function handleDeploy() {
    if (!canDeploy) return

    setDeployStatus('deploying')

    const deployFiles = files ?? {}

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vercel}`,
        },
        body: JSON.stringify({
          provider: 'vercel',
          files: deployFiles,
          projectId,
        }),
      })

      const data = (await res.json()) as {
        url?: string
        deployId?: string
        pending?: boolean
        error?: string
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Deploy failed')
      }

      setDeployUrl(data.url)
      setDeployStatus('deployed')
      if (data.pending && data.deployId) {
        toast({
          title: 'Deployment still building',
          description:
            'Vercel returned a URL but the build is not confirmed ready yet — the site may take a minute to go live.',
        })
        void pollDeployStatus(data.deployId)
      }
    } catch (err) {
      setDeployStatus('failed')
      setError(err instanceof Error ? err.message : 'Deploy failed')
    }
  }

  // Follow a pending deployment via the real status endpoint so a failed
  // Vercel build is surfaced instead of leaving the UI on "deployed".
  async function pollDeployStatus(deployId: string) {
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const res = await fetch(
          `/api/deploy/${deployId}/status?provider=vercel`,
          { headers: { Authorization: `Bearer ${vercel}` } }
        )
        const data = (await res.json()) as { status?: string; error?: string }
        if (data.status === 'ready') {
          toast({ title: 'Deployment is live' })
          return
        }
        if (data.status === 'error') {
          setDeployStatus('failed')
          setError(data.error ?? 'Vercel deployment failed')
          return
        }
      } catch {
        // transient poll failure — keep polling
      }
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
        <Button
          variant="outline"
          size="sm"
          onClick={copyUrl}
          className="gap-2"
          title="Copy deploy URL"
          aria-label="Copy deploy URL"
        >
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

export function ExportMenu() {
  const { components, files, projectId } = useProject()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasComponents = components.length > 0

  async function handleDownload() {
    setError(null)
    const exportFiles = files ?? {}

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: exportFiles, projectId }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? `Export failed (HTTP ${res.status})`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'forgeai-project.zip'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasComponents}
            title={hasComponents ? 'Export project' : 'Generate a project first'}
          >
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
      {error && (
        <span className="max-w-40 truncate text-xs text-destructive" title={error}>
          {error}
        </span>
      )}
    </>
  )
}

function GalleryButton() {
  const {
    galleryOpen,
    customizeTemplateId,
    openGallery,
    closeGallery,
    closeCustomize,
  } = useUI()
  const isOpen = galleryOpen || customizeTemplateId !== null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={
        isOpen
          ? () => {
              closeGallery()
              closeCustomize()
            }
          : openGallery
      }
      className="gap-2"
      title={isOpen ? 'Close templates' : 'Browse templates'}
      aria-label={isOpen ? 'Close templates' : 'Browse templates'}
    >
      <LayoutGrid className="h-4 w-4" />
      <span className="hidden sm:inline">{isOpen ? 'Home' : 'Templates'}</span>
    </Button>
  )
}

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      title={`Theme: ${theme} (click for ${next})`}
      aria-label={`Theme is ${theme}, switch to ${next}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

function MobileMenu() {
  const toggleMobileSidebar = useUI((state) => state.toggleMobileSidebar)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMobileSidebar}
      className="md:hidden"
      title="Open menu"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

/**
 * Top application bar with branding, theme toggle, settings, templates,
 * export, and deploy actions. Holds the action buttons used on every page.
 */
export function TopBar() {
  const openSettings = useUI((state) => state.openSettings)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2 md:hidden">
        <MobileMenu />
        <Image
          src="/favicon.svg"
          alt="ForgeAI"
          width={24}
          height={24}
          priority
          unoptimized
        />
        <span className="font-semibold">ForgeAI</span>
      </div>

      <div className="hidden items-center gap-2 text-lg font-semibold md:flex">
        <Image
          src="/favicon.svg"
          alt="ForgeAI"
          width={24}
          height={24}
          priority
          unoptimized
        />
        ForgeAI
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <Button
          variant="outline"
          size="sm"
          onClick={openSettings}
          className="gap-2"
          title="Open settings"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <GalleryButton />

        <ExportMenu />

        <DeployButton />
      </div>
    </header>
  )
}
