import type { CandidateType, PipelineStage } from '@prisma/client'
import { ACTIVE_STAGES } from '@/lib/pipeline'

export const CANDIDATE_TYPE_LABELS: Record<CandidateType, string> = {
  SOFTWARE_ENGINEER: 'Software Engineer',
  SYSTEMS_ENGINEER: 'Systems Engineer',
  ANALYST: 'Analyst',
  INTERNAL: 'Internal',
}

export const ALL_CANDIDATE_TYPES = [
  'SOFTWARE_ENGINEER',
  'SYSTEMS_ENGINEER',
  'ANALYST',
  'INTERNAL',
] as const satisfies readonly CandidateType[]

// If the candidate is actively in a job's pipeline, or was hired into one,
// show that job's internal name. Otherwise — rejected everywhere, in the
// Talent Pool, or no applications at all — show their Type instead.
export function getCandidateDisplayTitle(candidate: {
  candidateType: CandidateType | null
  currentTitle?: string | null
  applications: {
    stage: PipelineStage
    createdAt: Date
    job: { internalName: string }
  }[]
}): string | null {
  const relevantApp = [...candidate.applications]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .find(
      (app) => app.stage === 'HIRED' || (ACTIVE_STAGES as PipelineStage[]).includes(app.stage)
    )

  if (relevantApp) return relevantApp.job.internalName
  if (candidate.candidateType) return CANDIDATE_TYPE_LABELS[candidate.candidateType]
  return candidate.currentTitle ?? null
}
