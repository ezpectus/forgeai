'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SubmitTemplate } from './SubmitTemplate'
import { TemplateCard, type TemplateSummary } from './TemplateCard'

const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'websites', label: 'Websites' },
  { value: 'presentations', label: 'Presentations' },
  { value: 'carousels', label: 'Carousels' },
  { value: 'reports', label: 'Reports' },
]

export function GalleryView({ onSelect }: { onSelect?: (id: string) => void }) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const limit = 12

  async function fetchTemplates() {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (type !== 'all') params.set('type', type)
    params.set('page', String(page))
    params.set('limit', String(limit))

    try {
      const res = await fetch(`/api/templates?${params.toString()}`)
      const data = (await res.json()) as {
        data?: TemplateSummary[]
        total?: number
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? `Failed to load templates (${res.status})`)
      }

      setTemplates(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
      setTemplates([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Template Gallery</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubmitOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Submit
          </Button>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-8"
            />
          </div>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
            className="rounded border bg-background px-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {submitOpen && (
        <div className="rounded border bg-background p-4 shadow">
          <SubmitTemplate onClose={() => setSubmitOpen(false)} />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={onSelect ?? (() => undefined)}
                rating={ratings[template.id] ?? 0}
                onRate={(value) =>
                  setRatings((prev) => ({ ...prev, [template.id]: value }))
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
