import { Button } from '@/components/ui/button'
import { TemplateRating } from './TemplateRating'
import { TemplateThumbnail } from './TemplateThumbnail'

export interface TemplateSummary {
  id: string
  name: string
  type: string
  topic: string
  description: string
  thumbnail: string
}

export function TemplateCard({
  template,
  onSelect,
  rating,
  onRate,
}: {
  template: TemplateSummary
  onSelect: (id: string) => void
  rating?: number
  onRate?: (rating: number) => void
}) {
  return (
    <div className="flex flex-col rounded border bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden rounded bg-muted">
        <TemplateThumbnail
          name={template.name}
          topic={template.topic}
          className="object-cover"
        />
      </div>
      <h3 className="mt-2 font-semibold">{template.name}</h3>
      <p className="text-xs text-muted-foreground">{template.type}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {template.description}
      </p>
      {onRate && <TemplateRating initialRating={rating} onRate={onRate} />}
      <Button size="sm" className="mt-3" onClick={() => onSelect(template.id)}>
        Customize
      </Button>
    </div>
  )
}
