'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useUI } from '@/stores/ui'
import { functions } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import {
  TemplateCard,
  type TemplateSummary,
} from '@/components/gallery/TemplateCard'

const modeToTemplateType: Record<string, string> = {
  website: 'websites',
  slides: 'presentations',
  reports: 'reports',
  carousel: 'carousels',
}

export function HomeTemplates() {
  const { openCustomize, openGallery, activeMode } = useUI()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)

  const mode = useMemo(
    () => functions.find((f) => f.id === activeMode),
    [activeMode]
  )
  const modeLabel = mode?.label.toLowerCase() ?? activeMode
  const templateType = modeToTemplateType[activeMode]

  useEffect(() => {
    async function load() {
      if (!templateType) {
        setTemplates([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/templates?type=${templateType}&limit=3`)
        const data = (await res.json()) as {
          data?: TemplateSummary[]
          error?: string
        }
        setTemplates(data.data ?? [])
      } catch {
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeMode, templateType])

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded border p-4 text-sm text-muted-foreground">
        <p>No {modeLabel} templates available.</p>
        <Button variant="link" size="sm" onClick={openGallery}>
          Browse all templates
        </Button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Start from a {modeLabel} template
          </h2>
          <p className="text-xs text-muted-foreground">
            Pick a starting point and customize it
          </p>
        </div>
        <Button variant="link" size="sm" onClick={openGallery}>
          Browse all
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={(id) => openCustomize(id)}
          />
        ))}
      </div>
    </div>
  )
}
