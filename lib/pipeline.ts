import type { PipelineStage } from '@prisma/client'

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTRODUCTORY_CALL: 'Introductory Call',
  BEHAVIORAL_INTERVIEW: 'Behavioral Interview',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  EXECUTIVE_INTERVIEW: 'Executive Interview',
  CLIENT_INTERVIEW: 'Client Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  TALENT_POOL: 'Talent Pool',
}

// Active, in-order funnel stages shown as Kanban columns.
export const ACTIVE_STAGES: PipelineStage[] = [
  'APPLIED',
  'SCREENING',
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
]

// Terminal outcomes, reachable from any active stage.
export const TERMINAL_STAGES: PipelineStage[] = [
  'HIRED',
  'REJECTED',
  'TALENT_POOL',
]

export const ALL_STAGES: PipelineStage[] = [...ACTIVE_STAGES, ...TERMINAL_STAGES]

// Default columns shown on the cross-job master board: the active interview
// process, from the first real interview through Hired. Applied/Screening
// (pre-interview noise) and Rejected/Talent Pool (negative/deferred
// outcomes) start hidden but can be toggled back on.
export const DEFAULT_VISIBLE_STAGES: PipelineStage[] = [
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
  'HIRED',
]
