import type { PipelineStage, RejectionReason } from '@prisma/client'

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
}

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  COMMUNICATION: 'Communication',
  CORE_VALUE_MISMATCH: 'Core Value Mismatch',
  LACK_OF_TECHNICAL_SKILLS: 'Lack of Technical Skills',
  POSITION_FILLED: 'Position Filled',
  POSITION_CLOSED: 'Position Closed',
}

export const ALL_REJECTION_REASONS = [
  'COMMUNICATION',
  'CORE_VALUE_MISMATCH',
  'LACK_OF_TECHNICAL_SKILLS',
  'POSITION_FILLED',
  'POSITION_CLOSED',
] as const satisfies readonly RejectionReason[]

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
export const TERMINAL_STAGES: PipelineStage[] = ['HIRED', 'REJECTED']

export const ALL_STAGES: PipelineStage[] = [...ACTIVE_STAGES, ...TERMINAL_STAGES]

// Stages a given active application can be moved to: any other active
// stage (forward or back, in case someone's moved too far by mistake) plus
// Hired. Used by the profile page's "Move Stage" control — Reject is its
// own separate action.
export function getMoveStageOptions(current: PipelineStage): PipelineStage[] {
  return [...ACTIVE_STAGES.filter((s) => s !== current), 'HIRED']
}

// Default columns shown on the cross-job master board: the active interview
// process, from the first real interview through Hired. Applied/Screening
// (pre-interview noise) and Rejected (negative outcome) start hidden but can
// be toggled back on.
export const DEFAULT_VISIBLE_STAGES: PipelineStage[] = [
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
  'HIRED',
]
