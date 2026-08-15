'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { transitionStage } from '@/lib/actions/pipeline'
import { RejectionReasonDialog } from '@/components/kanban/rejection-reason-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STAGE_LABELS, getMoveStageOptions } from '@/lib/pipeline'
import type { PipelineStage, RejectionReason } from '@prisma/client'

export function ApplicationStageActions({
  applicationId,
  currentStage,
}: {
  applicationId: string
  currentStage: PipelineStage
}) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const moveStageOptions = getMoveStageOptions(currentStage)

  function moveTo(stage: PipelineStage) {
    startTransition(async () => {
      try {
        await transitionStage(applicationId, stage)
      } catch {
        toast.error('Failed to update stage. Please try again.')
      }
    })
  }

  function handleReject(reason?: RejectionReason) {
    setRejectOpen(false)
    startTransition(async () => {
      try {
        await transitionStage(applicationId, 'REJECTED', reason)
      } catch {
        toast.error('Failed to reject candidate. Please try again.')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        key={currentStage}
        onValueChange={(v) => moveTo(v as PipelineStage)}
        disabled={pending}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Move stage…" />
        </SelectTrigger>
        <SelectContent>
          {moveStageOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRejectOpen(true)}
        disabled={pending}
      >
        Reject
      </Button>
      <RejectionReasonDialog open={rejectOpen} onResolve={handleReject} />
    </div>
  )
}
