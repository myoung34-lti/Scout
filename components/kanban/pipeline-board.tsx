'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { transitionStage } from '@/lib/actions/pipeline'
import { StageColumn } from '@/components/kanban/stage-column'
import { RejectionReasonDialog } from '@/components/kanban/rejection-reason-dialog'
import { ALL_STAGES } from '@/lib/pipeline'
import type {
  Application,
  Candidate,
  CandidateTag,
  Job,
  PipelineStage,
  RejectionReason,
  Tag,
} from '@prisma/client'

export type ApplicationWithCandidate = Application & {
  candidate: Candidate & { tags?: (CandidateTag & { tag: Tag })[] }
  job?: Job
}

export function PipelineBoard({
  applications,
  stages = ALL_STAGES,
}: {
  applications: ApplicationWithCandidate[]
  stages?: PipelineStage[]
}) {
  const [items, setItems] = useState(applications)
  const [pendingRejection, setPendingRejection] = useState<{
    applicationId: string
    previousStage: PipelineStage
  } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function commitTransition(
    applicationId: string,
    toStage: PipelineStage,
    previousStage: PipelineStage,
    rejectionReason?: RejectionReason
  ) {
    transitionStage(applicationId, toStage, rejectionReason).catch(() => {
      setItems((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, stage: previousStage } : a
        )
      )
      toast.error('Failed to move candidate. Please try again.')
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const toStage = over.id as PipelineStage

    const current = items.find((a) => a.id === applicationId)
    if (!current || current.stage === toStage) return

    const previousStage = current.stage
    setItems((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, stage: toStage } : a))
    )

    if (toStage === 'REJECTED') {
      setPendingRejection({ applicationId, previousStage })
      return
    }

    commitTransition(applicationId, toStage, previousStage)
  }

  function handleRejectionResolved(reason?: RejectionReason) {
    if (!pendingRejection) return
    const { applicationId, previousStage } = pendingRejection
    setPendingRejection(null)
    setItems((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, rejectionReason: reason ?? null } : a
      )
    )
    commitTransition(applicationId, 'REJECTED', previousStage, reason)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={items.filter((a) => a.stage === stage)}
          />
        ))}
      </div>
      <RejectionReasonDialog
        open={pendingRejection !== null}
        onResolve={handleRejectionResolved}
      />
    </DndContext>
  )
}
