import type { PipelineStage } from '@prisma/client'
import { ACTIVE_STAGES } from '@/lib/pipeline'

type ApplicationForDisplay = {
  stage: PipelineStage
  createdAt: Date
  job: { internalName: string }
}

// The application driving getCandidateDisplayTitle's job-name branch, if
// any — exposed separately so callers can tell "showing the position
// they're going for" apart from "showing their current title", since that
// distinction matters for what else is safe to show alongside it.
export function findRelevantApplication<T extends ApplicationForDisplay>(candidate: {
  applications: T[]
}): T | undefined {
  return [...candidate.applications]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .find(
      (app) => app.stage === 'HIRED' || (ACTIVE_STAGES as PipelineStage[]).includes(app.stage)
    )
}

// The single status worth showing as a badge — an active/hired application
// wins over any past rejection on a different job, so a candidate who's
// mid-interview on one role doesn't also show "Rejected" from an unrelated
// role they applied to long ago. Falls back to their most recent
// application overall (typically a rejection) when nothing is active.
export function findCurrentApplication<T extends ApplicationForDisplay>(candidate: {
  applications: T[]
}): T | undefined {
  return (
    findRelevantApplication(candidate) ??
    [...candidate.applications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  )
}

// If the candidate is actively in a job's pipeline, or was hired into one,
// show that job's internal name. Otherwise — rejected everywhere, in the
// Talent Pool, or no applications at all — show their current title instead.
export function getCandidateDisplayTitle(candidate: {
  currentTitle?: string | null
  applications: ApplicationForDisplay[]
}): string | null {
  const relevantApp = findRelevantApplication(candidate)

  if (relevantApp) return relevantApp.job.internalName
  return candidate.currentTitle ?? null
}
