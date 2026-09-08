'use client'

import { useEffect, useState } from 'react'
import { getSummary, type AnalyticsEvent } from '@/lib/grow/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState({
    visitors: 0,
    pageViews: 0,
    conversions: 0,
    formSubmissions: 0,
  })
  const [events, setEvents] = useState<AnalyticsEvent[]>([])

  useEffect(() => {
    setSummary(getSummary())
    // Analytics events are localStorage only, so we keep this simple
    setEvents([])
  }, [])

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.visitors}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.pageViews}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.conversions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Form Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.formSubmissions}</p>
          </CardContent>
        </Card>
      </div>

      {events.length > 0 && (
        <div className="rounded border p-4">
          <h3 className="font-semibold">Recent Events</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {events.slice(-10).map((event) => (
              <li key={event.id}>
                {event.type} — {new Date(event.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
