'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getEvents, getSummary, trackConversion, trackFormSubmit, trackPageView } from '@/lib/grow/analytics'
import { getVariant, getWinner } from '@/lib/grow/ab-test'
import { renderFaqEmail, renderReminderEmail, renderWelcomeEmail } from '@/lib/grow/email'

export function ReportsView() {
  const [summary, setSummary] = useState({ visitors: 0, pageViews: 0, conversions: 0, formSubmissions: 0 })
  const [events, setEvents] = useState<ReturnType<typeof getEvents>>([])
  const [tab, setTab] = useState('ab')

  function refresh() {
    setSummary(getSummary())
    setEvents(getEvents().slice(-10))
  }

  useEffect(() => {
    refresh()
  }, [])

  function seed() {
    trackPageView('/demo')
    trackFormSubmit('contact')
    trackConversion('signup')
    refresh()
  }

  function clearAll() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('forgeai_analytics')
    refresh()
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Growth dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Analytics, A/B tests and email previews for your generated projects.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visitors" value={summary.visitors} />
        <MetricCard label="Page views" value={summary.pageViews} />
        <MetricCard label="Conversions" value={summary.conversions} />
        <MetricCard label="Form submissions" value={summary.formSubmissions} />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={seed}>
          Record sample events
        </Button>
        <Button variant="ghost" onClick={clearAll}>
          Clear data
        </Button>
      </div>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent events</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {events.map((event) => (
                <li key={event.id} className="flex justify-between gap-4">
                  <span className="font-medium capitalize">{event.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ab">A/B test</TabsTrigger>
          <TabsTrigger value="email">Email preview</TabsTrigger>
        </TabsList>

        <TabsContent value="ab">
          <AbTestPanel />
        </TabsContent>

        <TabsContent value="email">
          <EmailPreviewPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function AbTestPanel() {
  const [visitor, setVisitor] = useState('visitor-1')
  const [variantA, setVariantA] = useState('Original')
  const [variantB, setVariantB] = useState('New headline')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)

  const variants = [
    { id: 'a', name: variantA, weight: 1, content: '' },
    { id: 'b', name: variantB, weight: 1, content: '' },
  ]

  function pick() {
    const winner = getVariant(variants, visitor)
    setSelected(winner.name)
  }

  function recordConversion(variantId: string) {
    setCounts((prev) => ({ ...prev, [variantId]: (prev[variantId] ?? 0) + 1 }))
  }

  const winner = getWinner(variants, counts)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">A/B test playground</CardTitle>
        <CardDescription>Simulate variant assignment and conversions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ab-variant-a">Variant A</label>
            <Input id="ab-variant-a" value={variantA} onChange={(e) => setVariantA(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ab-variant-b">Variant B</label>
            <Input id="ab-variant-b" value={variantB} onChange={(e) => setVariantB(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ab-visitor">Visitor ID</label>
          <Input id="ab-visitor" value={visitor} onChange={(e) => setVisitor(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={pick}>Pick variant</Button>
          <Button variant="outline" onClick={() => recordConversion('a')}>
            Convert A
          </Button>
          <Button variant="outline" onClick={() => recordConversion('b')}>
            Convert B
          </Button>
        </div>

        {selected && (
          <p className="text-sm">
            Selected variant: <span className="font-semibold">{selected}</span>
          </p>
        )}

        <div className="text-sm text-muted-foreground">
          Conversions: A = {counts.a ?? 0}, B = {counts.b ?? 0}
          {winner && ` — Winner: ${winner.name}`}
        </div>
      </CardContent>
    </Card>
  )
}

function EmailPreviewPanel() {
  const [active, setActive] = useState<'welcome' | 'reminder' | 'faq'>('welcome')
  const [name, setName] = useState('Alice')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [question, setQuestion] = useState('How do I deploy?')
  const [answer, setAnswer] = useState('Click the Deploy button in the top bar.')

  const html =
    active === 'welcome'
      ? renderWelcomeEmail(name)
      : active === 'reminder'
        ? renderReminderEmail(name, date)
        : renderFaqEmail(question, answer)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email preview</CardTitle>
        <CardDescription>Render templates before sending.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={active} onValueChange={(v) => setActive(v as typeof active)}>
          <TabsList>
            <TabsTrigger value="welcome">Welcome</TabsTrigger>
            <TabsTrigger value="reminder">Reminder</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>
        </Tabs>

        {active === 'welcome' && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email-name-welcome">Name</label>
            <Input id="email-name-welcome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}

        {active === 'reminder' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-name-reminder">Name</label>
              <Input id="email-name-reminder" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-date">Date</label>
              <Input id="email-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </>
        )}

        {active === 'faq' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-question">Question</label>
              <Input id="email-question" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email-answer">Answer</label>
              <Input id="email-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </div>
          </>
        )}

        <div
          className="rounded border bg-background p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  )
}
