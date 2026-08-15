'use client'

import { Badge } from '@/components/ui/badge'
import { ALL_STAGES, STAGE_LABELS } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

export function StageVisibilityToggle({
  visibleStages,
  onChange,
  counts,
}: {
  visibleStages: PipelineStage[]
  onChange: (stages: PipelineStage[]) => void
  counts: Record<PipelineStage, number>
}) {
  function toggle(stage: PipelineStage) {
    if (visibleStages.includes(stage)) {
      onChange(visibleStages.filter((s) => s !== stage))
    } else {
      onChange(ALL_STAGES.filter((s) => visibleStages.includes(s) || s === stage))
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_STAGES.map((stage) => {
        const visible = visibleStages.includes(stage)
        return (
          <button key={stage} type="button" onClick={() => toggle(stage)}>
            <Badge
              variant={visible ? 'default' : 'outline'}
              className="cursor-pointer select-none"
            >
              {STAGE_LABELS[stage]} · {counts[stage] ?? 0}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
