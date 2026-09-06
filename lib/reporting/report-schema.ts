import { z } from 'zod'

// Whitelisted keys only — the client never sends a raw Prisma field name.
// Every value here maps to a specific, hand-written query in
// reporting-service.ts, not a generically-assembled one.

export const SUBJECTS = ['CANDIDATES', 'APPLICATIONS', 'INTERVIEWS', 'JOBS', 'RECRUITERS'] as const
export type Subject = (typeof SUBJECTS)[number]

export const METRICS = [
  'CANDIDATES_ADDED',
  'CANDIDATES_INTERVIEWED',
  'INTERVIEWS_CONDUCTED',
  'CANDIDATES_ADVANCED',
  'CANDIDATES_REJECTED',
  'CANDIDATES_HIRED',
  'APPLICATIONS_COUNT',
  'OPEN_JOBS',
  'CLOSED_JOBS',
  'TALENT_POOL_CANDIDATES',
] as const
export type Metric = (typeof METRICS)[number]

export const GROUP_BYS = [
  'NONE',
  'RECRUITER',
  'JOB',
  'STAGE',
  'INTERVIEW_TYPE',
  'RECOMMENDATION',
  'REJECTION_REASON',
  'SOURCE',
  'TIME',
] as const
export type GroupBy = (typeof GROUP_BYS)[number]

export const TIME_GROUPINGS = ['DAY', 'WEEK', 'MONTH', 'QUARTER'] as const
export type TimeGrouping = (typeof TIME_GROUPINGS)[number]

export const DATE_RANGE_PRESETS = [
  'LAST_7',
  'LAST_30',
  'LAST_90',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_QUARTER',
  'THIS_YEAR',
  'ALL_TIME',
  'CUSTOM',
] as const
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export const FILTER_FIELDS = [
  'RECRUITER',
  'JOB',
  'JOB_STATUS',
  'CANDIDATE_STAGE',
  'RATING',
  'LOCATION',
  'TAG',
  'TALENT_POOL',
  'INTERVIEW_TYPE',
  'INTERVIEW_RECOMMENDATION',
  'REJECTION_REASON',
  'SOURCE',
] as const
export type FilterField = (typeof FILTER_FIELDS)[number]

export const FILTER_OPERATORS = ['eq', 'in', 'contains', 'gte', 'lte', 'is'] as const
export type FilterOperator = (typeof FILTER_OPERATORS)[number]

export const VISUALIZATIONS = ['LINE', 'BAR', 'TABLE'] as const
export type Visualization = (typeof VISUALIZATIONS)[number]

export const reportFilterSchema = z.object({
  field: z.enum(FILTER_FIELDS),
  operator: z.enum(FILTER_OPERATORS),
  value: z.union([z.string().max(200), z.array(z.string().max(200)).max(50)]),
})
export type ReportFilter = z.infer<typeof reportFilterSchema>

export const dateRangeSchema = z
  .object({
    preset: z.enum(DATE_RANGE_PRESETS),
    start: z.string().max(20).optional(),
    end: z.string().max(20).optional(),
  })
  .refine((v) => v.preset !== 'CUSTOM' || (v.start && v.end), {
    message: 'Custom date range requires start and end',
  })
export type DateRangeInput = z.infer<typeof dateRangeSchema>

export const reportDefinitionSchema = z.object({
  subject: z.enum(SUBJECTS),
  metric: z.enum(METRICS),
  groupBy: z.enum(GROUP_BYS),
  filters: z.array(reportFilterSchema).max(10),
  dateRange: dateRangeSchema,
  timeGrouping: z.enum(TIME_GROUPINGS).optional(),
})
export type ReportDefinition = z.infer<typeof reportDefinitionSchema>

export type ReportResult = {
  metadata: {
    subject: Subject
    metric: Metric
    groupBy: GroupBy
    dateRange: DateRangeInput
    timeGrouping: TimeGrouping | null
    generatedAt: string
  }
  categories: string[]
  series: { name: string; data: number[] }[]
  rows: Record<string, string | number>[]
  totals?: Record<string, number>
}
