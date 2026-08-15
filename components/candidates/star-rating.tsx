'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({
  value,
  onRate,
  size = 'md',
}: {
  value: number | null
  onRate?: (rating: number) => void
  size?: 'sm' | 'md'
}) {
  const starSize = size === 'sm' ? 'size-3.5' : 'size-5'
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = value !== null && n <= value
        const star = (
          <Star
            key={n}
            className={cn(
              starSize,
              filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
            )}
          />
        )

        if (!onRate) return star

        return (
          <button
            key={n}
            type="button"
            className="cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRate(n)
            }}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}
