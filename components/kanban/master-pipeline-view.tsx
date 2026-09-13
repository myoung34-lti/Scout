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
  currentUserId,
  recruiterName,
  recruiterEmail,
  staticVariables,
  emailTemplates,
}: {
  applications: ApplicationWithCandidate[]
  currentUserId: string
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
  const { searchParams, setSingle, setMany } = useFilterParams()
  const jobId = searchParams.get('jobId') ?? 'ALL'
  // Home links here with scope=mine, so "Your Pipeline" opens exactly the
  // people the dashboard funnel counted. Arriving from the nav item shows
  // everything, as it always has.
  //
  // "Mine" is the candidate's assigned recruiter, not the job's — the same
  // definition the funnel uses. Scoping by job would show an identical board
  // to every recruiter sharing a job, which is what it used to do.
  const scope = searchParams.get('scope') === 'mine' ? 'mine' : 'all'

  const scopedApplications = useMemo(
    () =>
      scope === 'mine'
        ? applications.filter((a) => a.candidate.ownerId === currentUserId)
        : applications,
    [applications, scope, currentUserId]
  )

  // Derived from the applications already on the board rather than a separate
  // query — every one of them carries its job. Follows the scope, so "My
  // jobs" can't offer a job filter that would empty the board.
  const jobs = useMemo(() => {
    const byId = new Map<string, string>()
    for (const a of scopedApplications) {
      if (a.job) byId.set(a.job.id, a.job.internalName)
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [scopedApplications])

  const visibleApplications = useMemo(
    () =>
      jobId === 'ALL'
        ? scopedApplications
        : scopedApplications.filter((a) => a.job?.id === jobId),
    [scopedApplications, jobId]
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
        <div className="flex items-center gap-2">
          <Select
            value={scope}
            // Changing scope clears the job filter in the same navigation —
            // a job with none of my candidates would leave an empty board
            // with no visible cause.
            onValueChange={(v) => setMany({ scope: v === 'mine' ? 'mine' : undefined, jobId: undefined })}
          >
            <SelectTrigger aria-label="Filter by ownership" className="w-auto min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All recruiters</SelectItem>
              <SelectItem value="mine">My candidates</SelectItem>
            </SelectContent>
          </Select>
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
