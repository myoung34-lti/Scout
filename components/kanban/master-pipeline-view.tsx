'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  recruiters,
  recruiterName,
  recruiterEmail,
  staticVariables,
  emailTemplates,
}: {
  applications: ApplicationWithCandidate[]
  currentUserId: string
  recruiters: { id: string; name: string }[]
  recruiterName: string
  recruiterEmail: string
  staticVariables: Record<string, string>
  emailTemplates: EmailTemplate[]
}) {
  const [visibleStages, setVisibleStages] = useState<PipelineStage[]>(
    DEFAULT_VISIBLE_STAGES
  )

  // Both filters stay in the URL, so a board narrowed to one recruiter or job
  // can be linked and survives a refresh — but they are written with
  // history.replaceState rather than router.replace.
  //
  // router.replace refetches the route's RSC payload, and this board's payload
  // is megabytes: every selection sat re-downloading the whole thing before
  // anything on screen moved, which read as the filter simply not working.
  // Nothing here needs the server — the filtering is client-side over data the
  // page already has — and Next syncs replaceState into useSearchParams, so
  // this stays reactive.
  const searchParams = useSearchParams()
  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === 'ALL') next.delete(key)
        else next.set(key, value)
      }
      const qs = next.toString()
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    },
    [searchParams]
  )

  // Whose board this is — any recruiter, not only the viewer. Home links here
  // with the viewer's own id so "Your Pipeline" opens exactly the people the
  // dashboard funnel counted. `scope=mine` is still honoured, for links
  // already issued (breadcrumbs included) before this became a picker.
  //
  // Always the candidate's assigned recruiter, never the job's — the same
  // definition the funnel uses. Filtering by job assignment would hand an
  // identical board to every recruiter who shares a job.
  const jobId = searchParams.get('jobId') ?? 'ALL'

  const recruiterParam = searchParams.get('recruiterId')
  const recruiterId =
    searchParams.get('scope') === 'mine'
      ? currentUserId
      : recruiterParam && recruiters.some((r) => r.id === recruiterParam)
        ? recruiterParam
        : 'ALL'

  const scopedApplications = useMemo(
    () =>
      recruiterId === 'ALL'
        ? applications
        : applications.filter((a) => a.candidate.ownerId === recruiterId),
    [applications, recruiterId]
  )

  // Derived from the applications already on the board rather than a separate
  // query — every one of them carries its job. Follows the recruiter filter,
  // so the job list can never offer a job that would empty the board.
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

  // Counts follow both filters, so a column's number always describes what the
  // board is actually showing.
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
            value={recruiterId}
            // Switching recruiter clears the job filter in the same update: a
            // job with none of that recruiter's candidates would otherwise
            // leave an empty board with no visible cause. `scope` goes too,
            // so an old scope=mine link can't outvote an explicit choice.
            onValueChange={(v) =>
              setParams({ recruiterId: v, jobId: undefined, scope: undefined })
            }
          >
            <SelectTrigger aria-label="Filter by recruiter" className="w-auto min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All recruiters</SelectItem>
              {recruiters.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                  {r.id === currentUserId ? ' (you)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jobId} onValueChange={(v) => setParams({ jobId: v })}>
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
