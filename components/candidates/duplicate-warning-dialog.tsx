'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  candidate,
  onContinueAnyway,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: { firstName: string; lastName: string; email: string | null }
  onContinueAnyway: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate candidate</DialogTitle>
          <DialogDescription>
            A candidate with this email already exists:{' '}
            <strong>
              {candidate.firstName} {candidate.lastName}
            </strong>{' '}
            ({candidate.email}).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onContinueAnyway()
            }}
          >
            Continue anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
