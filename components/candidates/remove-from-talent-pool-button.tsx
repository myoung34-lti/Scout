'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { removeCandidateFromTalentPool } from '@/lib/actions/candidates'
import { Button } from '@/components/ui/button'

export function RemoveFromTalentPoolButton({
  candidateId,
}: {
  candidateId: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        await removeCandidateFromTalentPool(candidateId)
        toast.success('Removed from Talent Pool.')
      } catch {
        toast.error('Failed to remove from Talent Pool. Please try again.')
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? 'Removing…' : 'Remove from Pool'}
    </Button>
  )
}
