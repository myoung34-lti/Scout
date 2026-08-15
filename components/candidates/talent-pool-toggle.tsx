'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  addCandidateToTalentPool,
  removeCandidateFromTalentPool,
} from '@/lib/actions/candidates'
import { Button } from '@/components/ui/button'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export function TalentPoolToggle({
  candidateId,
  inTalentPool,
  addedAt,
  addedByName,
}: {
  candidateId: string
  inTalentPool: boolean
  addedAt: Date | null
  addedByName: string | null
}) {
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        if (inTalentPool) {
          await removeCandidateFromTalentPool(candidateId)
        } else {
          await addCandidateToTalentPool(candidateId)
        }
      } catch {
        toast.error('Failed to update Talent Pool status. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-2">
      {inTalentPool && (
        <p className="text-sm text-muted-foreground">
          In Talent Pool since {addedAt ? dateFormatter.format(addedAt) : '—'}
          {addedByName && ` · added by ${addedByName}`}
        </p>
      )}
      <Button
        variant={inTalentPool ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={pending}
      >
        {pending
          ? 'Saving…'
          : inTalentPool
            ? 'Remove from Talent Pool'
            : 'Add to Talent Pool'}
      </Button>
    </div>
  )
}
