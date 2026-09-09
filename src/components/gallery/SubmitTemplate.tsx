'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function SubmitTemplate({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('websites')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim() || !description.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          type,
          topic,
          description,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Submit failed')
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded border bg-background p-4 shadow-lg">
      <h3 className="text-lg font-semibold">Submit Template</h3>
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
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          Submit
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}
