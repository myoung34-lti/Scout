'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateCandidateType } from '@/lib/actions/candidates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_CANDIDATE_TYPES, CANDIDATE_TYPE_LABELS } from '@/lib/candidate-type'
import type { CandidateType } from '@prisma/client'

export function CandidateTypeSelect({
  candidateId,
  initialType,
}: {
  candidateId: string
  initialType: CandidateType | null
}) {
  const [type, setType] = useState(initialType)

  function handleChange(next: string) {
    const previous = type
    const value = next as CandidateType
    setType(value)

    updateCandidateType(candidateId, value).catch(() => {
      setType(previous)
      toast.error('Failed to update type. Please try again.')
    })
  }

  return (
    <Select value={type ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a type" />
      </SelectTrigger>
      <SelectContent>
        {ALL_CANDIDATE_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {CANDIDATE_TYPE_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
