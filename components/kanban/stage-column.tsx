'use client'

import { useDroppable } from '@dnd-kit/core'
import { ApplicationCard } from '@/components/kanban/application-card'
import { STAGE_LABELS, stageTone } from '@/lib/pipeline'
import type { StageTone } from '@/lib/pipeline'
import type { ApplicationWithCandidate } from '@/components/kanban/pipeline-board'
import type { PipelineStage } from '@prisma/client'

// The dot is the only place colour appears in a column header — a fully
// tinted column would fight the cards sitting inside it.
const TONE_DOT: Record<StageTone, string> = {
  neutral: 'bg-muted-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
}

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
      className={`flex w-64 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors ${
        isOver ? 'border-primary bg-accent' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${TONE_DOT[stageTone(stage)]}`}
        />
        <h3 className="min-w-0 flex-1 truncate font-heading text-[13px] font-semibold">
          {STAGE_LABELS[stage]}
        </h3>
        <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {applications.length}
        </span>
      </div>
      <div className="min-h-20 space-y-2 p-2">
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} />
        ))}
      </div>
    </div>
  )
}
