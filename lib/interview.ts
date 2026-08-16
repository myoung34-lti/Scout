import type { InterviewType, InterviewRecommendation } from '@prisma/client'

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  INTRO: 'Intro Interview',
  TECHNICAL: 'Technical Interview',
  BEHAVIORAL: 'Behavioral Interview',
  OTHER: 'Other',
}

export const ALL_INTERVIEW_TYPES = [
  'INTRO',
  'TECHNICAL',
  'BEHAVIORAL',
  'OTHER',
] as const satisfies readonly InterviewType[]

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
