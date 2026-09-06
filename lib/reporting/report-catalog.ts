import type {
  DateRangePreset,
  FilterField,
  GroupBy,
  Metric,
  Subject,
  TimeGrouping,
} from '@/lib/reporting/report-schema'

export const SUBJECT_LABELS: Record<Subject, string> = {
  CANDIDATES: 'Candidates',
  APPLICATIONS: 'Applications',
  INTERVIEWS: 'Interviews',
  JOBS: 'Jobs',
  RECRUITERS: 'Recruiters',
}

export const METRIC_LABELS: Record<Metric, string> = {
  CANDIDATES_ADDED: 'Candidates Added',
  CANDIDATES_INTERVIEWED: 'Candidates Interviewed',
  INTERVIEWS_CONDUCTED: 'Interviews Conducted',
  CANDIDATES_ADVANCED: 'Candidates Advanced',
  CANDIDATES_REJECTED: 'Candidates Rejected',
  CANDIDATES_HIRED: 'Candidates Hired',
  APPLICATIONS_COUNT: 'Applications',
  OPEN_JOBS: 'Open Jobs',
  CLOSED_JOBS: 'Closed Jobs',
  TALENT_POOL_CANDIDATES: 'Talent Pool Candidates',
}

// Which Subject each metric is reported under — drives the Metric dropdown's
// options once a Subject is chosen.
export const METRIC_SUBJECTS: Record<Metric, Subject[]> = {
  CANDIDATES_ADDED: ['CANDIDATES'],
  CANDIDATES_INTERVIEWED: ['CANDIDATES'],
  INTERVIEWS_CONDUCTED: ['INTERVIEWS'],
  CANDIDATES_ADVANCED: ['CANDIDATES'],
  CANDIDATES_REJECTED: ['CANDIDATES'],
  CANDIDATES_HIRED: ['CANDIDATES'],
  APPLICATIONS_COUNT: ['APPLICATIONS'],
  OPEN_JOBS: ['JOBS'],
  CLOSED_JOBS: ['JOBS'],
  TALENT_POOL_CANDIDATES: ['CANDIDATES'],
}

// Which GroupBy values are valid for each metric — picking a metric filters
// the Group By dropdown down to only these, rather than allowing (and then
// rejecting) an incoherent combination.
export const METRIC_GROUP_BYS: Record<Metric, GroupBy[]> = {
  CANDIDATES_ADDED: ['NONE', 'RECRUITER', 'SOURCE', 'TIME'],
  // "Recruiter" here means the interviewer who conducted the qualifying
  // interview, not the candidate's owner — matches INTERVIEWS_CONDUCTED for
  // consistency (both describe interviewer activity).
  CANDIDATES_INTERVIEWED: ['NONE', 'RECRUITER', 'JOB', 'TIME'],
  INTERVIEWS_CONDUCTED: ['NONE', 'RECRUITER', 'JOB', 'INTERVIEW_TYPE', 'RECOMMENDATION', 'TIME'],
  // "Recruiter" here means whoever performed the stage change (more useful
  // for recruiter-performance reporting than the passive candidate owner).
  CANDIDATES_ADVANCED: ['NONE', 'RECRUITER', 'JOB', 'STAGE', 'TIME'],
  CANDIDATES_REJECTED: ['NONE', 'RECRUITER', 'JOB', 'REJECTION_REASON', 'TIME'],
  CANDIDATES_HIRED: ['NONE', 'RECRUITER', 'JOB', 'TIME'],
  APPLICATIONS_COUNT: ['NONE', 'JOB', 'TIME'],
  OPEN_JOBS: ['NONE', 'TIME'],
  CLOSED_JOBS: ['NONE', 'TIME'],
  // "Recruiter" here means the candidate's owner — Talent Pool has no
  // stage-change actor to attribute to.
  TALENT_POOL_CANDIDATES: ['NONE', 'RECRUITER', 'TIME'],
}

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  NONE: 'None',
  RECRUITER: 'Recruiter',
  JOB: 'Job',
  STAGE: 'Stage',
  INTERVIEW_TYPE: 'Interview Type',
  RECOMMENDATION: 'Recommendation',
  REJECTION_REASON: 'Rejection Reason',
  SOURCE: 'Source',
  TIME: 'Time',
}

export const FILTER_FIELD_LABELS: Record<FilterField, string> = {
  RECRUITER: 'Recruiter',
  JOB: 'Job',
  JOB_STATUS: 'Job Status',
  CANDIDATE_STAGE: 'Candidate Stage',
  RATING: 'Rating',
  LOCATION: 'Location',
  TAG: 'Tag',
  TALENT_POOL: 'Talent Pool',
  INTERVIEW_TYPE: 'Interview Type',
  INTERVIEW_RECOMMENDATION: 'Interview Recommendation',
  REJECTION_REASON: 'Rejection Reason',
  SOURCE: 'Source',
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  LAST_7: 'Last 7 Days',
  LAST_30: 'Last 30 Days',
  LAST_90: 'Last 90 Days',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_QUARTER: 'This Quarter',
  THIS_YEAR: 'This Year',
  ALL_TIME: 'All Time',
  CUSTOM: 'Custom Range',
}

export const TIME_GROUPING_LABELS: Record<TimeGrouping, string> = {
  DAY: 'Day',
  WEEK: 'Week',
  MONTH: 'Month',
  QUARTER: 'Quarter',
}

// Job.status has no existing label helper elsewhere in the app (the Jobs
// page inlines its own) — small enough to keep here rather than add a new
// shared lib/job-status.ts just for reporting's sake.
export const JOB_STATUS_LABELS = { OPEN: 'Open', CLOSED: 'Closed', ON_HOLD: 'On Hold' } as const
export const ALL_JOB_STATUSES = ['OPEN', 'CLOSED', 'ON_HOLD'] as const
