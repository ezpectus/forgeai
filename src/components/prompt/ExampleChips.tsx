import { useUI } from '@/stores/ui'
import { cn } from '@/lib/utils'

const examplesByMode: Record<string, string[]> = {
  website: [
    'Landing for yoga studio',
    'Portfolio for photographer',
    'SaaS pricing page',
    'Restaurant menu website',
    'Real estate listings site',
  ],
  slides: [
    'Pitch deck for a startup',
    'Sales deck for SaaS',
    'Product launch slides',
    'Quarterly review presentation',
  ],
  images: [
    'Marketing hero image set',
    'Product showcase gallery',
    'Social media quote cards',
    'Instagram tips carousel',
  ],
  videos: [
    'Product demo landing video',
    'Webinar promo page',
    'How-it-works explainer',
    'Testimonial video wall',
  ],
  chat: [
    'Customer support chatbot',
    'FAQ assistant for a shop',
    'Lead qualification bot',
    'Booking concierge chat',
  ],
  reports: [
    'SEO audit report',
    'Market research brief',
    'Competitor analysis page',
    'Financial summary dashboard',
  ],
  canvas: [
    'Moodboard for a brand',
    'Idea whiteboard',
    'Design sprint canvas',
    'User research board',
  ],
  carousel: [
    'Testimonial carousel',
    'Quote carousel for coaches',
    'Before/after showcase',
    'Twitter thread preview',
  ],
  audio: [
    'Podcast landing page',
    'Audio course promo',
    'Voice agent intro',
    'Music release page',
  ],
  spreadsheets: [
    'Budget tracker dashboard',
    'Sales pipeline sheet',
    'Task tracker with charts',
    'Inventory management table',
  ],
}

const defaultExamples = examplesByMode.website

interface ExampleChipsProps {
  onSelect: (prompt: string) => void
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
  const { activeMode } = useUI()
  const examples = examplesByMode[activeMode] ?? defaultExamples

  return (
    <div className="flex w-full gap-2 overflow-x-auto pb-2">
      {examples.map((example) => (
        <button
          key={example}
          type="button"
          onClick={() => onSelect(example)}
          className={cn(
            'shrink-0 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {example}
        </button>
      ))}
    </div>
  )
}
