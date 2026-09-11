'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * Template submission = "download the JSON and open a PR". The server-side
 * write endpoint only exists on self-hosted deployments
 * (ALLOW_TEMPLATE_SUBMISSIONS=true); on shared/serverless hosts the file
 * would never persist, so pretending to "submit" it would be fake.
 */
export function SubmitTemplate({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('websites')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleExport() {
    if (!name.trim() || !description.trim()) return

    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const indexEntry = {
      id,
      name: name.trim(),
      type,
      topic: topic.trim() || id,
      description: description.trim(),
      thumbnail: `/templates/thumbnails/${id}.png`,
      path: `/templates/${type}/${id}.json`,
    }

    const blob = new Blob(
      [JSON.stringify(indexEntry, null, 2)],
      { type: 'application/json' }
    )
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.json`
    a.click()
    window.URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded border bg-background p-4 shadow-lg">
      <h3 className="text-lg font-semibold">Submit Template</h3>
      <p className="text-xs text-muted-foreground">
        Downloads a template JSON. Add it under{' '}
        <code>public/templates/&lt;type&gt;/</code> and register it in{' '}
        <code>index.json</code> via a pull request — submissions only persist
        on self-hosted deployments.
      </p>
      <Input
        placeholder="Template name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded border bg-background px-3 py-2 text-sm"
      >
        <option value="websites">Website</option>
        <option value="presentations">Presentation</option>
        <option value="carousels">Carousel</option>
        <option value="reports">Report</option>
      </select>
      <Textarea
        placeholder="Description and structure..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={!name.trim() || !description.trim()}
          className="flex-1"
        >
          Download JSON
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}
