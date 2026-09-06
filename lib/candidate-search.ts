export const CANDIDATES_PAGE_SIZE = 25

export type AddedDatePreset = 'week' | 'month' | 'custom'

export const CANDIDATE_SORTS = ['added', 'name', 'rating'] as const
export type CandidateSort = (typeof CANDIDATE_SORTS)[number]

export const CANDIDATE_STATUS_KEYS = [
  'all',
  'active',
  'interviewing',
  'hired',
  'rejected',
  'pool',
] as const
export type CandidateStatusKey = (typeof CANDIDATE_STATUS_KEYS)[number]

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatusKey, string> = {
  all: 'All Candidates',
  active: 'Active',
  interviewing: 'Interviewing',
  hired: 'Hired',
  rejected: 'Rejected',
  pool: 'Talent Pool',
}
