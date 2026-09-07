'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { deleteCandidate } from '@/lib/actions/candidates'
import { RETENTION_DAYS } from '@/lib/candidate-visibility'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DeleteCandidateDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  candidateName: string
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      try {
        await deleteCandidate(candidateId)
        onOpenChange(false)
        toast.success(`${candidateName} deleted.`, {
          description: `Recoverable for ${RETENTION_DAYS} days from Deleted Candidates.`,
        })
        onDeleted?.()
        router.refresh()
      } catch {
        toast.error("Couldn't delete that candidate. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-danger" />
            Delete {candidateName}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            This removes {candidateName} from Scout entirely — they disappear from
            candidates, the pipeline, the talent pool and all reporting.
          </p>
          {/* Says what actually happens. Calling it permanent when it's
              recoverable for 30 days would be its own kind of wrong. */}
          <p className="rounded-lg border border-danger-border bg-danger-soft/40 p-3 text-danger">
            Their record, applications, interviews and notes are kept for{' '}
            {RETENTION_DAYS} days and can be restored from Deleted Candidates. After
            that it is permanent.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
