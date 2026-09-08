export interface AnalyticsEvent {
  id: string
  type: 'page_view' | 'form_submit' | 'conversion'
  timestamp: number
  data?: Record<string, unknown>
}

const STORAGE_KEY = 'forgeai_analytics'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
}

function saveEvents(events: AnalyticsEvent[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-1000)))
}

export function trackEvent(
  type: AnalyticsEvent['type'],
  data?: Record<string, unknown>
) {
  const events = loadEvents()
  events.push({
    id: generateId(),
    type,
    timestamp: Date.now(),
    data,
  })
  saveEvents(events)
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path })
}

export function trackFormSubmit(formName: string) {
  trackEvent('form_submit', { form: formName })
}

export function trackConversion(name: string) {
  trackEvent('conversion', { name })
}

export function getEvents(): AnalyticsEvent[] {
  return loadEvents()
}

export function getSummary() {
  const events = loadEvents()
  return {
    visitors: new Set(
      events
        .filter((e) => e.type === 'page_view')
        .map((e) => e.data?.path as string)
    ).size,
    pageViews: events.filter((e) => e.type === 'page_view').length,
    conversions: events.filter((e) => e.type === 'conversion').length,
    formSubmissions: events.filter((e) => e.type === 'form_submit').length,
  }
}
