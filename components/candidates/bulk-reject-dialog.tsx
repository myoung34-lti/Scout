'use client'

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_REJECTION_REASONS, REJECTION_REASON_LABELS } from '@/lib/pipeline'
import type { RejectionReason } from '@prisma/client'

// Deliberately not components/kanban/rejection-reason-dialog.tsx. That one
// treats Skip *and* dismissing as "go ahead, just without a reason", which is
// right for a single card already dragged onto Rejected — the intent is
// already expressed by the drag. Here the intent is a menu click, so Escape
// has to mean cancel, not reject everyone selected.
export function BulkRejectDialog({
  open,
  count,
  toTalentPool,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean
  count: number
  toTalentPool: boolean
  pending: boolean
  onCancel: () => void
  onConfirm: (reason?: RejectionReason, customReason?: string) => void
}) {
  const [reason, setReason] = useState<RejectionReason | undefined>()
  const [customReason, setCustomReason] = useState('')

  const noun = `${count} candidate${count === 1 ? '' : 's'}`
  const isOther = reason === 'OTHER'
  const canConfirm = !isOther || customReason.trim().length > 0

  function cancel() {
    setReason(undefined)
    setCustomReason('')
    onCancel()
  }

  function confirm() {
    onConfirm(reason, isOther ? customReason.trim() : undefined)
    setReason(undefined)
    setCustomReason('')
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && cancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-danger" />
            {toTalentPool ? `Reject ${noun} and move to Talent Pool?` : `Reject ${noun}?`}
          </DialogTitle>
          <DialogDescription>
            This rejects each one&rsquo;s current application
            {toTalentPool ? ' and adds them to the Talent Pool' : ''}. Anyone
            already hired or rejected is skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Reason (optional — applied to all {count})
            </p>
            <Select value={reason} onValueChange={(v) => setReason(v as RejectionReason)}>
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
          </div>

          {isOther && (
            <Input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Describe the reason…"
              autoFocus
            />
          )}

          <p className="rounded-lg border border-danger-border bg-danger-soft/40 p-3 text-xs text-danger">
            Each rejection is recorded on that candidate&rsquo;s timeline and can be
            reverted from their profile, one at a time — there is no bulk undo.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending || !canConfirm}>
            {pending ? 'Working…' : toTalentPool ? 'Reject and move' : `Reject ${noun}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
