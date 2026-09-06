'use client'

import { ALL_STAGES, STAGE_LABELS, stageTone } from '@/lib/pipeline'
import type { StageTone } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const TONE_DOT: Record<StageTone, string> = {
  neutral: 'bg-muted-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
}

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
      // Re-derived from ALL_STAGES so columns keep pipeline order however
      // they were switched on.
      onChange(ALL_STAGES.filter((s) => visibleStages.includes(s) || s === stage))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="section-label mr-1">Columns</span>
      {ALL_STAGES.map((stage) => {
        const visible = visibleStages.includes(stage)
        return (
          <button
            key={stage}
            type="button"
            onClick={() => toggle(stage)}
            aria-pressed={visible}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              visible
                ? 'border-border-strong bg-card text-foreground shadow-xs'
                : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${
                visible ? TONE_DOT[stageTone(stage)] : 'bg-muted-foreground/30'
              }`}
            />
            {STAGE_LABELS[stage]}
            <span className="tabular-nums opacity-70">{counts[stage] ?? 0}</span>
          </button>
        )
      })}
    </div>
  )
}
