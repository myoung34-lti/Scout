'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_REJECTION_REASONS, REJECTION_REASON_LABELS } from '@/lib/pipeline'
import type { RejectionReason } from '@prisma/client'

export function RejectionReasonDialog({
  open,
  onResolve,
}: {
  open: boolean
  onResolve: (reason?: RejectionReason) => void
}) {
  const [reason, setReason] = useState<RejectionReason | undefined>(undefined)

  function resolve() {
    onResolve(reason)
    setReason(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resolve()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for rejection (optional)</DialogTitle>
          <DialogDescription>
            Skip if you&apos;d rather not record one right now.
          </DialogDescription>
        </DialogHeader>

        <Select
          value={reason}
          onValueChange={(v) => setReason(v as RejectionReason)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {ALL_REJECTION_REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {REJECTION_REASON_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={resolve}>
            Skip
          </Button>
          <Button onClick={resolve} disabled={!reason}>
            Save reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
