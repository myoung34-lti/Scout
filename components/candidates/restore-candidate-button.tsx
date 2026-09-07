'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { restoreCandidate } from '@/lib/actions/candidates'
import { Button } from '@/components/ui/button'

export function RestoreCandidateButton({
  candidateId,
  candidateName,
}: {
  candidateId: string
  candidateName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await restoreCandidate(candidateId)
            toast.success(`${candidateName} restored.`)
            router.refresh()
          } catch {
            toast.error("Couldn't restore that candidate. Please try again.")
          }
        })
      }
    >
      <RotateCcw />
      {pending ? 'Restoring…' : 'Restore'}
    </Button>
  )
}
