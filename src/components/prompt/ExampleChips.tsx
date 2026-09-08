import { cn } from '@/lib/utils'

const examples = [
  'Landing for yoga studio',
  'Portfolio for photographer',
  'SaaS pricing page',
  'Restaurant menu website',
]

interface ExampleChipsProps {
  onSelect: (prompt: string) => void
}

export function ExampleChips({ onSelect }: ExampleChipsProps) {
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
