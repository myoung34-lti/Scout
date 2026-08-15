'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateCandidateRating } from '@/lib/actions/candidates'
import { StarRating } from '@/components/candidates/star-rating'

export function CandidateRating({
  candidateId,
  initialRating,
}: {
  candidateId: string
  initialRating: number | null
}) {
  const [rating, setRating] = useState(initialRating)

  function handleRate(next: number) {
    const previous = rating
    // Clicking the currently-set star clears the rating.
    const value = next === previous ? null : next
    setRating(value)

    updateCandidateRating(candidateId, value).catch(() => {
      setRating(previous)
      toast.error('Failed to update rating. Please try again.')
    })
  }

  return <StarRating value={rating} onRate={handleRate} />
}
