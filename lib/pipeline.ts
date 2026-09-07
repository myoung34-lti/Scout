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
  ACCEPTED_ANOTHER_OFFER: 'Accepted Another Offer',
  NOT_LOCAL: 'Not Local',
  PREFER_REMOTE: 'Prefer 100% Remote',
  OTHER: 'Other',
}

// Order here is the order shown in the rejection dialog's dropdown — OTHER
// (the free-text "write your own" option) stays last.
export const ALL_REJECTION_REASONS = [
  'COMMUNICATION',
  'CORE_VALUE_MISMATCH',
  'LACK_OF_TECHNICAL_SKILLS',
  'POSITION_FILLED',
  'POSITION_CLOSED',
  'ACCEPTED_ANOTHER_OFFER',
  'NOT_LOCAL',
  'PREFER_REMOTE',
  'OTHER',
] as const satisfies readonly RejectionReason[]

// The actual text to display for a rejection: the canned label, unless the
// reason is the free-text OTHER option, in which case it's whatever the user
// typed in at rejection time.
export function rejectionReasonText(
  reason: RejectionReason,
  customText: string | null
): string {
  return reason === 'OTHER' && customText
    ? customText
    : REJECTION_REASON_LABELS[reason]
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
export const TERMINAL_STAGES: PipelineStage[] = ['HIRED', 'REJECTED']

// The subset of active stages that represent an actual interview — used to
// restrict the "Add Interview" screen's type picker (Applied/Screening/Offer
// aren't interviews).
export const INTERVIEW_STAGES: PipelineStage[] = [
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
]

export const ALL_STAGES: PipelineStage[] = [...ACTIVE_STAGES, ...TERMINAL_STAGES]

// One place that decides what colour a stage reads as, so a stage badge looks
// the same on the candidate list, the board and the profile. Pre-interview
// stages stay neutral deliberately — colour is reserved for stages that carry
// an actual signal.
export type StageTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

const STAGE_TONES: Record<PipelineStage, StageTone> = {
  APPLIED: 'neutral',
  SCREENING: 'neutral',
  INTRODUCTORY_CALL: 'info',
  BEHAVIORAL_INTERVIEW: 'info',
  TECHNICAL_INTERVIEW: 'info',
  EXECUTIVE_INTERVIEW: 'info',
  CLIENT_INTERVIEW: 'info',
  OFFER: 'warning',
  HIRED: 'success',
  REJECTED: 'danger',
}

export function stageTone(stage: PipelineStage): StageTone {
  return STAGE_TONES[stage]
}

// "In process" for dashboard purposes: actively being worked, from the first
// real conversation through Offer. Deliberately excludes Applied/Screening
// (not yet engaged) and the terminal stages.
export const IN_PROCESS_STAGES: PipelineStage[] = [
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
]

// Advancing into one of these stages (or rejecting, checked separately)
// prompts a "send an email?" toast — the earlier Applied/Screening bump and
// Offer/Hired are deliberately excluded, since those aren't typically
// candidate-facing moments handled through Scout's email templates.
export const EMAIL_PROMPT_STAGES: PipelineStage[] = [
  'INTRODUCTORY_CALL',
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
]

// The formal interview process proper — from the first real interview
// (Behavioral) through Offer — used for the job detail page's summary cards.
export const FORMAL_INTERVIEW_STAGES: PipelineStage[] = [
  'BEHAVIORAL_INTERVIEW',
  'TECHNICAL_INTERVIEW',
  'EXECUTIVE_INTERVIEW',
  'CLIENT_INTERVIEW',
  'OFFER',
]

// The forward-moving steps shown in the profile page's pipeline stepper —
// every active stage plus the positive terminal outcome. Rejected is
// deliberately excluded; it's reached via its own dedicated action, not by
// clicking a step.
export const STEPPER_STAGES: PipelineStage[] = [...ACTIVE_STAGES, 'HIRED']

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
