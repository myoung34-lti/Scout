'use client'

import { useDroppable } from '@dnd-kit/core'
import { ApplicationCard } from '@/components/kanban/application-card'
import { STAGE_LABELS } from '@/lib/pipeline'
import type { ApplicationWithCandidate } from '@/components/kanban/pipeline-board'
import type { PipelineStage } from '@prisma/client'

export function StageColumn({
  stage,
  applications,
}: {
  stage: PipelineStage
  applications: ApplicationWithCandidate[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-lg border bg-muted/30 p-2 transition-colors ${
        isOver ? 'border-primary bg-muted/60' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{STAGE_LABELS[stage]}</h3>
        <span className="text-xs text-muted-foreground">
          {applications.length}
        </span>
      </div>
      <div className="min-h-16 space-y-2">
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} />
        ))}
      </div>
    </div>
  )
}
