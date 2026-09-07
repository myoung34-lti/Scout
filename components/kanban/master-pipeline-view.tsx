'use client'

import { useMemo, useState } from 'react'
import { useFilterParams } from '@/lib/use-filter-params'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  // URL-backed like every other filter in Scout, so a board filtered to one
  // job can be linked, bookmarked and survives a refresh.
  const { searchParams, setSingle } = useFilterParams()
  const jobId = searchParams.get('jobId') ?? 'ALL'

  // Derived from the applications already on the board rather than a separate
  // query — every one of them carries its job.
  const jobs = useMemo(() => {
    const byId = new Map<string, string>()
    for (const a of applications) {
      if (a.job) byId.set(a.job.id, a.job.internalName)
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [applications])

  const visibleApplications = useMemo(
    () => (jobId === 'ALL' ? applications : applications.filter((a) => a.job?.id === jobId)),
    [applications, jobId]
  )

  // Counts follow the job filter, so a column's number always describes what
  // the board is actually showing.
  const counts = ALL_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = visibleApplications.filter((a) => a.stage === stage).length
      return acc
    },
    {} as Record<PipelineStage, number>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StageVisibilityToggle
          visibleStages={visibleStages}
          onChange={setVisibleStages}
          counts={counts}
        />
        <Select value={jobId} onValueChange={(v) => setSingle('jobId', v)}>
          <SelectTrigger aria-label="Filter by job" className="w-auto min-w-40">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All jobs</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PipelineBoard
        applications={visibleApplications}
        stages={visibleStages}
        recruiterName={recruiterName}
        recruiterEmail={recruiterEmail}
        staticVariables={staticVariables}
        emailTemplates={emailTemplates}
      />
    </div>
  )
}
