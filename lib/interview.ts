import type { InterviewType, InterviewRecommendation, PipelineStage } from '@prisma/client'

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  INTRO: 'Introductory Interview',
  BEHAVIORAL: 'Behavioral Interview',
  TECHNICAL: 'Technical Interview',
  EXECUTIVE: 'Executive Interview',
  CLIENT: 'Client Interview',
}

export const ALL_INTERVIEW_TYPES = [
  'INTRO',
  'BEHAVIORAL',
  'TECHNICAL',
  'EXECUTIVE',
  'CLIENT',
] as const satisfies readonly InterviewType[]

// Each interview type maps to exactly one pipeline stage — lets a
// completed interview's recommendation surface on that stage's step in the
// candidate's pipeline stepper.
export const INTERVIEW_STAGE_FOR_TYPE: Record<InterviewType, PipelineStage> = {
  INTRO: 'INTRODUCTORY_CALL',
  BEHAVIORAL: 'BEHAVIORAL_INTERVIEW',
  TECHNICAL: 'TECHNICAL_INTERVIEW',
  EXECUTIVE: 'EXECUTIVE_INTERVIEW',
  CLIENT: 'CLIENT_INTERVIEW',
}

export const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  STRONG_NO: 'Strong No',
  NO: 'No',
  MAYBE: 'Maybe',
  YES: 'Yes',
  STRONG_YES: 'Strong Yes',
}

export const ALL_RECOMMENDATIONS = [
  'STRONG_NO',
  'NO',
  'MAYBE',
  'YES',
  'STRONG_YES',
] as const satisfies readonly InterviewRecommendation[]

// Buckets the five recommendation values down to the three outcomes shown
// as a check/?/x badge on the candidate's pipeline stepper.
export function recommendationOutcome(
  recommendation: InterviewRecommendation
): 'pass' | 'maybe' | 'fail' {
  if (recommendation === 'YES' || recommendation === 'STRONG_YES') return 'pass'
  if (recommendation === 'MAYBE') return 'maybe'
  return 'fail'
}

// Shared red/neutral/green treatment for the recommendation, used both on
// the picker (selected state) and as a static badge in the activity feed.
export const RECOMMENDATION_BADGE_CLASS: Record<InterviewRecommendation, string> = {
  STRONG_NO:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  NO: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  MAYBE: 'border-border bg-muted text-muted-foreground',
  YES: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  STRONG_YES:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
}
