import type { CandidateSource } from '@prisma/client'

export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  LINKEDIN: 'LinkedIn',
  REFERRAL: 'Referral',
  APPLIED: 'Applied',
  CAREER_FAIR: 'Career Fair',
}

export const ALL_CANDIDATE_SOURCES = [
  'LINKEDIN',
  'REFERRAL',
  'APPLIED',
  'CAREER_FAIR',
] as const satisfies readonly CandidateSource[]
