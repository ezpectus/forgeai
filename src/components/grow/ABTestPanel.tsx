'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getVariant, getWinner, type Variant } from '@/lib/grow/ab-test'
import { trackConversion, getEvents } from '@/lib/grow/analytics'

function getConversionCounts(variants: Variant[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const variant of variants) {
    counts[variant.id] = 0
  }

  for (const event of getEvents()) {
    if (event.type !== 'conversion' || !event.data?.name) continue
    const name = event.data.name
    if (typeof name === 'string' && name in counts) {
      counts[name]++
    }
  }

  return counts
}

export default function ABTestPanel() {
  const [visitorId, setVisitorId] = useState('visitor-1')
  const [variants, setVariants] = useState<Variant[]>([
    { id: 'a', name: 'Control', weight: 50, content: 'Original headline' },
    { id: 'b', name: 'Variant B', weight: 50, content: 'New headline' },
  ])
  const [conversions, setConversions] = useState<Record<string, number>>({})

  useEffect(() => {
    setConversions(getConversionCounts(variants))
  }, [variants])

  function handleAddVariant() {
    const id = String.fromCharCode(98 + variants.length)
    setVariants((prev) => [
      ...prev,
      { id, name: `Variant ${id.toUpperCase()}`, weight: 50, content: '' },
    ])
  }

  function handleUpdateVariant(id: string, updates: Partial<Variant>) {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    )
  }

  function handleTrackConversion() {
    trackConversion(assigned.id)
    setConversions(getConversionCounts(variants))
  }

  const assigned = getVariant(variants, visitorId)
  const winner = getWinner(variants, conversions)
  const total = Object.values(conversions).reduce((sum, c) => sum + c, 0)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="text-2xl font-bold">A/B Testing</h2>

      <Input
        placeholder="Visitor ID"
        value={visitorId}
        onChange={(e) => setVisitorId(e.target.value)}
      />

      <div className="space-y-3">
        {variants.map((variant) => (
          <div key={variant.id} className="rounded border p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={variant.name}
                onChange={(e) =>
                  handleUpdateVariant(variant.id, { name: e.target.value })
                }
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Weight"
                value={variant.weight}
                onChange={(e) =>
                  handleUpdateVariant(variant.id, {
                    weight: Number(e.target.value),
                  })
                }
                className="w-24"
              />
            </div>
            <Textarea
              placeholder="Variant content"
              value={variant.content}
              onChange={(e) =>
                handleUpdateVariant(variant.id, { content: e.target.value })
              }
              className="mt-2"
            />
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={handleAddVariant}>
        Add Variant
      </Button>

      <div className="rounded border bg-muted p-4">
        <p className="font-medium">Assigned variant for {visitorId}</p>
        <p className="text-2xl font-bold">{assigned.name}</p>
        <p className="text-sm text-muted-foreground">{assigned.content}</p>
      </div>

      <Button onClick={handleTrackConversion}>Track Conversion</Button>

      <div className="rounded border p-4">
        <h3 className="font-semibold">Results ({total} conversions)</h3>
        <ul className="mt-2 space-y-1">
          {variants.map((variant) => (
            <li key={variant.id} className="flex justify-between text-sm">
              <span>{variant.name}</span>
              <span>{conversions[variant.id] ?? 0}</span>
            </li>
          ))}
        </ul>
        {winner && (
          <p className="mt-2 font-medium">Winner: {winner.name}</p>
        )}
      </div>
    </div>
  )
}
