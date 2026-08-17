'use client'

import { useState, useTransition } from 'react'
import { revertRejection } from '@/lib/actions/pipeline'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function RevertRejectionDialog({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await revertRejection(applicationId)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-0 text-xs">
          Revert rejection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revert rejection</DialogTitle>
          <DialogDescription>
            Are you sure you want to put back active?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? 'Reactivating…' : 'Put back active'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
