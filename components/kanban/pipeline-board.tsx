'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { transitionStage } from '@/lib/actions/pipeline'
import { StageColumn } from '@/components/kanban/stage-column'
import { ALL_STAGES } from '@/lib/pipeline'
import type {
  Application,
  Candidate,
  CandidateTag,
  Job,
  PipelineStage,
  Tag,
} from '@prisma/client'

export type ApplicationWithCandidate = Application & {
  candidate: Candidate & { tags?: (CandidateTag & { tag: Tag })[] }
  job?: Job
}

export function PipelineBoard({
  applications,
  stages = ALL_STAGES,
  showJob = false,
}: {
  applications: ApplicationWithCandidate[]
  stages?: PipelineStage[]
  showJob?: boolean
}) {
  const [items, setItems] = useState(applications)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

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

    transitionStage(applicationId, toStage).catch(() => {
      setItems((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, stage: previousStage } : a
        )
      )
      toast.error('Failed to move candidate. Please try again.')
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={items.filter((a) => a.stage === stage)}
            showJob={showJob}
          />
        ))}
      </div>
    </DndContext>
  )
}
