'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export function TemplateRating({
  initialRating = 0,
  onRate,
}: {
  initialRating?: number
  onRate?: (rating: number) => void
}) {
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)

  function handleClick(value: number) {
    setRating(value)
    onRate?.(value)
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          onMouseEnter={() => setHover(value)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={`h-4 w-4 ${
              (hover || rating) >= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}
