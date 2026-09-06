'use client'

import { useState } from 'react'
import { PipelineBoard } from '@/components/kanban/pipeline-board'
import type { ApplicationWithCandidate } from '@/components/kanban/pipeline-board'
import { StageVisibilityToggle } from '@/components/kanban/stage-visibility-toggle'
import { ALL_STAGES, DEFAULT_VISIBLE_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

type EmailTemplate = {
  id: string
  name: string
  currentVersion: { id: string; subject: string; bodyHtml: string } | null
}

export function MasterPipelineView({
  applications,
  recruiterName,
  recruiterEmail,
  staticVariables,
  emailTemplates,
}: {
  applications: ApplicationWithCandidate[]
  recruiterName: string
  recruiterEmail: string
  staticVariables: Record<string, string>
  emailTemplates: EmailTemplate[]
}) {
  const [visibleStages, setVisibleStages] = useState<PipelineStage[]>(
    DEFAULT_VISIBLE_STAGES
  )

  const counts = ALL_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = applications.filter((a) => a.stage === stage).length
      return acc
    },
    {} as Record<PipelineStage, number>
  )

  return (
    <div className="space-y-4">
      <StageVisibilityToggle
        visibleStages={visibleStages}
        onChange={setVisibleStages}
        counts={counts}
      />
      <PipelineBoard
        applications={applications}
        stages={visibleStages}
        recruiterName={recruiterName}
        recruiterEmail={recruiterEmail}
        staticVariables={staticVariables}
        emailTemplates={emailTemplates}
      />
    </div>
  )
}
