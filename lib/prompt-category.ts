import type { PromptCategory } from '@prisma/client'

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  INTERVIEW: 'Interview',
  CANDIDATE: 'Candidate',
  COMMUNICATION: 'Communication',
  ANALYSIS: 'Analysis',
  SYSTEM: 'System',
}

export const ALL_PROMPT_CATEGORIES = [
  'INTERVIEW',
  'CANDIDATE',
  'COMMUNICATION',
  'ANALYSIS',
  'SYSTEM',
] as const satisfies readonly PromptCategory[]
