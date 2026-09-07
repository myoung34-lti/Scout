import { prisma } from '@/lib/db'
import { STAGE_LABELS, rejectionReasonText } from '@/lib/pipeline'
import { INTERVIEW_TYPE_LABELS, RECOMMENDATION_LABELS } from '@/lib/interview'
import { CANDIDATE_SOURCE_LABELS } from '@/lib/candidate-source'
import { resolveDateRange, defaultTimeGrouping } from '@/lib/reporting/date-range'
import { NOT_DELETED, VISIBLE_APPLICATION, CANDIDATE_VISIBLE } from '@/lib/candidate-visibility'
import { bucketKeyAndLabel } from '@/lib/reporting/time-bucket'
import { METRIC_LABELS } from '@/lib/reporting/report-catalog'
import type { ReportDefinition, ReportFilter, ReportResult, Metric } from '@/lib/reporting/report-schema'
import type {
  Prisma,
  JobStatus,
  PipelineStage,
  RejectionReason,
  InterviewType,
  InterviewRecommendation,
  CandidateSource,
} from '@prisma/client'

// ---- shared helpers ----------------------------------------------------

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function numberFilter(f: ReportFilter): Prisma.IntFilter | undefined {
  const n = Number(Array.isArray(f.value) ? f.value[0] : f.value)
  if (Number.isNaN(n)) return undefined
  if (f.operator === 'gte') return { gte: n }
  if (f.operator === 'lte') return { lte: n }
  return { equals: n }
}

type AggRow = { key: string; label: string; value: number }

function aggregateByGroup<T>(
  items: T[],
  groupKeyFn: (item: T) => { key: string; label: string },
  distinctBy?: (item: T) => string
): AggRow[] {
  const groups = new Map<string, { label: string; value: number; seen: Set<string> | null }>()
  for (const item of items) {
    const { key, label } = groupKeyFn(item)
    let g = groups.get(key)
    if (!g) {
      g = { label, value: 0, seen: distinctBy ? new Set() : null }
      groups.set(key, g)
    }
    if (distinctBy) {
      const id = distinctBy(item)
      if (g.seen!.has(id)) continue
      g.seen!.add(id)
    }
    g.value += 1
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, label: g.label, value: g.value }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

const TOTAL_ROW = { key: 'TOTAL', label: 'Total' }

// ---- per-base-model filter translation ---------------------------------
// Each function reaches every FilterField relevant to reports based on that
// model, combining conditions on the same relation into one nested clause
// (AND-only, per the approved plan) rather than several conflicting ones.

function buildCandidateFilterWhere(filters: ReportFilter[]): Prisma.CandidateWhereInput {
  // Seeded so no metric can count a soft-deleted candidate.
  const where: Prisma.CandidateWhereInput = { ...NOT_DELETED }
  const applicationConds: Prisma.ApplicationWhereInput = {}
  const interviewConds: Prisma.InterviewWhereInput = {}
  let hasApplicationCond = false
  let hasInterviewCond = false

  for (const f of filters) {
    switch (f.field) {
      case 'RECRUITER':
        where.ownerId = { in: toArray(f.value) }
        break
      case 'JOB':
        applicationConds.jobId = { in: toArray(f.value) }
        hasApplicationCond = true
        break
      case 'JOB_STATUS':
        applicationConds.job = { status: { in: toArray(f.value) as JobStatus[] } }
        hasApplicationCond = true
        break
      case 'CANDIDATE_STAGE':
        applicationConds.stage = { in: toArray(f.value) as PipelineStage[] }
        hasApplicationCond = true
        break
      case 'REJECTION_REASON':
        applicationConds.rejectionReason = { in: toArray(f.value) as RejectionReason[] }
        hasApplicationCond = true
        break
      case 'RATING': {
        const nf = numberFilter(f)
        if (nf) where.rating = nf
        break
      }
      case 'LOCATION':
        where.location = { contains: String(f.value), mode: 'insensitive' }
        break
      case 'TAG':
        where.tags = {
          some: { tag: { label: { in: toArray(f.value).map((v) => v.toLowerCase()) } } },
        }
        break
      case 'TALENT_POOL':
        where.inTalentPool = (Array.isArray(f.value) ? f.value[0] : f.value) === 'true'
        break
      case 'INTERVIEW_TYPE':
        interviewConds.type = { in: toArray(f.value) as InterviewType[] }
        hasInterviewCond = true
        break
      case 'INTERVIEW_RECOMMENDATION':
        interviewConds.recommendation = { in: toArray(f.value) as InterviewRecommendation[] }
        hasInterviewCond = true
        break
      case 'SOURCE':
        where.source = { in: toArray(f.value) as CandidateSource[] }
        break
    }
  }

  if (hasApplicationCond) where.applications = { some: { ...applicationConds, removedAt: null } }
  if (hasInterviewCond) where.interviews = { some: interviewConds }
  return where
}

function buildInterviewFilterWhere(filters: ReportFilter[]): Prisma.InterviewWhereInput {
  const where: Prisma.InterviewWhereInput = { ...CANDIDATE_VISIBLE }
  const candidateConds: Prisma.CandidateWhereInput = {}
  const applicationConds: Prisma.ApplicationWhereInput = {}
  let hasCandidateCond = false
  let hasApplicationCond = false

  for (const f of filters) {
    switch (f.field) {
      case 'RECRUITER':
        where.interviewerId = { in: toArray(f.value) }
        break
      case 'JOB':
        applicationConds.jobId = { in: toArray(f.value) }
        hasApplicationCond = true
        break
      case 'JOB_STATUS':
        applicationConds.job = { status: { in: toArray(f.value) as JobStatus[] } }
        hasApplicationCond = true
        break
      case 'CANDIDATE_STAGE':
        applicationConds.stage = { in: toArray(f.value) as PipelineStage[] }
        hasApplicationCond = true
        break
      case 'REJECTION_REASON':
        applicationConds.rejectionReason = { in: toArray(f.value) as RejectionReason[] }
        hasApplicationCond = true
        break
      case 'INTERVIEW_TYPE':
        where.type = { in: toArray(f.value) as InterviewType[] }
        break
      case 'INTERVIEW_RECOMMENDATION':
        where.recommendation = { in: toArray(f.value) as InterviewRecommendation[] }
        break
      case 'RATING': {
        const nf = numberFilter(f)
        if (nf) candidateConds.rating = nf
        hasCandidateCond = true
        break
      }
      case 'LOCATION':
        candidateConds.location = { contains: String(f.value), mode: 'insensitive' }
        hasCandidateCond = true
        break
      case 'TAG':
        candidateConds.tags = {
          some: { tag: { label: { in: toArray(f.value).map((v) => v.toLowerCase()) } } },
        }
        hasCandidateCond = true
        break
      case 'TALENT_POOL':
        candidateConds.inTalentPool = (Array.isArray(f.value) ? f.value[0] : f.value) === 'true'
        hasCandidateCond = true
        break
      case 'SOURCE':
        candidateConds.source = { in: toArray(f.value) as CandidateSource[] }
        hasCandidateCond = true
        break
    }
  }

  if (hasApplicationCond) where.application = { is: { ...applicationConds, removedAt: null } }
  if (hasCandidateCond) where.candidate = { is: { ...candidateConds, deletedAt: null } }
  return where
}

function buildApplicationFilterWhere(filters: ReportFilter[]): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { ...VISIBLE_APPLICATION }
  const candidateConds: Prisma.CandidateWhereInput = {}
  let hasCandidateCond = false

  for (const f of filters) {
    switch (f.field) {
      case 'JOB':
        where.jobId = { in: toArray(f.value) }
        break
      case 'JOB_STATUS':
        where.job = { status: { in: toArray(f.value) as JobStatus[] } }
        break
      case 'CANDIDATE_STAGE':
        where.stage = { in: toArray(f.value) as PipelineStage[] }
        break
      case 'REJECTION_REASON':
        where.rejectionReason = { in: toArray(f.value) as RejectionReason[] }
        break
      case 'RECRUITER':
        candidateConds.ownerId = { in: toArray(f.value) }
        hasCandidateCond = true
        break
      case 'RATING': {
        const nf = numberFilter(f)
        if (nf) candidateConds.rating = nf
        hasCandidateCond = true
        break
      }
      case 'LOCATION':
        candidateConds.location = { contains: String(f.value), mode: 'insensitive' }
        hasCandidateCond = true
        break
      case 'TAG':
        candidateConds.tags = {
          some: { tag: { label: { in: toArray(f.value).map((v) => v.toLowerCase()) } } },
        }
        hasCandidateCond = true
        break
      case 'TALENT_POOL':
        candidateConds.inTalentPool = (Array.isArray(f.value) ? f.value[0] : f.value) === 'true'
        hasCandidateCond = true
        break
      case 'SOURCE':
        candidateConds.source = { in: toArray(f.value) as CandidateSource[] }
        hasCandidateCond = true
        break
      case 'INTERVIEW_TYPE':
        where.interviews = { some: { type: { in: toArray(f.value) as InterviewType[] } } }
        break
      case 'INTERVIEW_RECOMMENDATION':
        where.interviews = {
          some: { recommendation: { in: toArray(f.value) as InterviewRecommendation[] } },
        }
        break
    }
  }

  if (hasCandidateCond) where.candidate = { is: { ...candidateConds, deletedAt: null } }
  return where
}

function buildJobFilterWhere(filters: ReportFilter[]): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {}
  for (const f of filters) {
    if (f.field === 'JOB_STATUS') where.status = { in: toArray(f.value) as JobStatus[] }
    if (f.field === 'JOB') where.id = { in: toArray(f.value) }
    if (f.field === 'LOCATION') where.location = { contains: String(f.value), mode: 'insensitive' }
  }
  return where
}

function buildStageHistoryFilterWhere(filters: ReportFilter[]): Prisma.StageHistoryWhereInput {
  const where: Prisma.StageHistoryWhereInput = { application: VISIBLE_APPLICATION }
  const applicationConds: Prisma.ApplicationWhereInput = {}
  let hasApplicationCond = false

  for (const f of filters) {
    switch (f.field) {
      case 'RECRUITER':
        where.changedById = { in: toArray(f.value) }
        break
      case 'JOB':
        applicationConds.jobId = { in: toArray(f.value) }
        hasApplicationCond = true
        break
      case 'JOB_STATUS':
        applicationConds.job = { status: { in: toArray(f.value) as JobStatus[] } }
        hasApplicationCond = true
        break
      case 'CANDIDATE_STAGE':
        where.toStage = { in: toArray(f.value) as PipelineStage[] }
        break
      default:
        break // RATING/LOCATION/TAG/TALENT_POOL/SOURCE/INTERVIEW_* not meaningful for pipeline movement
    }
  }
  if (hasApplicationCond) where.application = { is: { ...applicationConds, ...VISIBLE_APPLICATION } }
  return where
}

// ---- drill-down -----------------------------------------------------------
// Every metric exposes its matching rows (not just the aggregated count) so
// a click on a bar/line-point/table-row/KPI-card can show exactly which
// candidates/jobs/interviews make up that number — reusing the exact same
// filter/date-range logic as the aggregate, never a second, divergent query.

export type DrillDownRow = { id: string; label: string; sublabel: string; href: string }

type RowSet<T> = {
  rows: T[]
  groupKey: (row: T) => { key: string; label: string }
  distinctBy?: (row: T) => string
  toDrillDownRow: (row: T) => DrillDownRow
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

// ---- metric implementations ---------------------------------------------

async function rowSetCandidatesAdded(def: ReportDefinition): Promise<RowSet<{
  id: string
  firstName: string
  lastName: string
  createdAt: Date
  owner: { name: string } | null
  source: CandidateSource | null
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildCandidateFilterWhere(def.filters)
  where.createdAt = { gte: range.start, lte: range.end }
  const rows = await prisma.candidate.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      owner: { select: { name: true } },
      source: true,
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'RECRUITER') {
        const name = r.owner?.name ?? 'Unassigned'
        return { key: name, label: name }
      }
      if (def.groupBy === 'SOURCE') {
        const label = r.source ? CANDIDATE_SOURCE_LABELS[r.source] : 'Unknown'
        return { key: label, label }
      }
      if (def.groupBy === 'TIME') return bucketKeyAndLabel(r.createdAt, timeGrouping)
      return TOTAL_ROW
    },
    toDrillDownRow: (r) => ({
      id: r.id,
      label: `${r.firstName} ${r.lastName}`,
      sublabel: `Added ${dateFormatter.format(r.createdAt)}`,
      href: `/candidates/${r.id}`,
    }),
  }
}

async function rowSetInterviewsBase(
  def: ReportDefinition,
  distinctByCandidate: boolean
): Promise<RowSet<{
  id: string
  candidateId: string
  completedAt: Date | null
  type: InterviewType
  recommendation: InterviewRecommendation | null
  interviewer: { name: string }
  candidate: { firstName: string; lastName: string }
  application: { job: { internalName: string } } | null
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildInterviewFilterWhere(def.filters)
  where.status = 'COMPLETED'
  where.completedAt = { gte: range.start, lte: range.end }
  const rows = await prisma.interview.findMany({
    where,
    select: {
      id: true,
      candidateId: true,
      completedAt: true,
      type: true,
      recommendation: true,
      interviewer: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true } },
      application: { select: { job: { select: { internalName: true } } } },
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'RECRUITER') return { key: r.interviewer.name, label: r.interviewer.name }
      if (def.groupBy === 'JOB') {
        const label = r.application?.job.internalName ?? 'No Job'
        return { key: label, label }
      }
      if (def.groupBy === 'INTERVIEW_TYPE') {
        const label = INTERVIEW_TYPE_LABELS[r.type]
        return { key: label, label }
      }
      if (def.groupBy === 'RECOMMENDATION') {
        const label = r.recommendation ? RECOMMENDATION_LABELS[r.recommendation] : 'Not yet given'
        return { key: label, label }
      }
      if (def.groupBy === 'TIME') return bucketKeyAndLabel(r.completedAt!, timeGrouping)
      return TOTAL_ROW
    },
    distinctBy: distinctByCandidate ? (r) => r.candidateId : undefined,
    toDrillDownRow: (r) => ({
      id: r.id,
      label: `${r.candidate.firstName} ${r.candidate.lastName}`,
      sublabel: distinctByCandidate
        ? 'Interviewed'
        : `${INTERVIEW_TYPE_LABELS[r.type]} · ${dateFormatter.format(r.completedAt!)}`,
      href: `/candidates/${r.candidateId}/interview/${r.id}`,
    }),
  }
}

async function rowSetCandidatesAdvanced(def: ReportDefinition): Promise<RowSet<{
  changedAt: Date
  toStage: PipelineStage
  changedBy: { name: string }
  application: {
    candidateId: string
    candidate: { firstName: string; lastName: string }
    job: { internalName: string }
  }
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildStageHistoryFilterWhere(def.filters)
  if (!where.toStage) where.toStage = { not: 'REJECTED' }
  where.changedAt = { gte: range.start, lte: range.end }
  const rows = await prisma.stageHistory.findMany({
    where,
    select: {
      changedAt: true,
      toStage: true,
      changedBy: { select: { name: true } },
      application: {
        select: {
          candidateId: true,
          candidate: { select: { firstName: true, lastName: true } },
          job: { select: { internalName: true } },
        },
      },
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'RECRUITER') return { key: r.changedBy.name, label: r.changedBy.name }
      if (def.groupBy === 'JOB') {
        const label = r.application.job.internalName
        return { key: label, label }
      }
      if (def.groupBy === 'STAGE') {
        const label = STAGE_LABELS[r.toStage]
        return { key: label, label }
      }
      if (def.groupBy === 'TIME') return bucketKeyAndLabel(r.changedAt, timeGrouping)
      return TOTAL_ROW
    },
    distinctBy: (r) => r.application.candidateId,
    toDrillDownRow: (r) => ({
      id: r.application.candidateId,
      label: `${r.application.candidate.firstName} ${r.application.candidate.lastName}`,
      sublabel: `Moved to ${STAGE_LABELS[r.toStage]} · ${dateFormatter.format(r.changedAt)}`,
      href: `/candidates/${r.application.candidateId}`,
    }),
  }
}

// Shared by Hired and Rejected — both are Application-based, distinct
// candidates, and attribute "Recruiter" to whoever performed that specific
// stage transition (looked up from StageHistory) rather than the passive
// candidate owner.
async function rowSetApplicationOutcome(
  def: ReportDefinition,
  outcome: 'HIRED' | 'REJECTED'
): Promise<RowSet<{
  candidateId: string
  hiredAt: Date | null
  rejectedAt: Date | null
  rejectionReason: RejectionReason | null
  customRejectionReason: string | null
  candidate: { firstName: string; lastName: string }
  job: { internalName: string }
  history: { changedBy: { name: string } }[]
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildApplicationFilterWhere(def.filters)
  const dateField = outcome === 'HIRED' ? 'hiredAt' : 'rejectedAt'
  where[dateField] = { gte: range.start, lte: range.end }
  const rows = await prisma.application.findMany({
    where,
    select: {
      candidateId: true,
      hiredAt: true,
      rejectedAt: true,
      rejectionReason: true,
      customRejectionReason: true,
      candidate: { select: { firstName: true, lastName: true } },
      job: { select: { internalName: true } },
      history: {
        where: { toStage: outcome },
        orderBy: { changedAt: 'desc' },
        take: 1,
        select: { changedBy: { select: { name: true } } },
      },
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'RECRUITER') {
        const name = r.history[0]?.changedBy.name ?? 'Unknown'
        return { key: name, label: name }
      }
      if (def.groupBy === 'JOB') return { key: r.job.internalName, label: r.job.internalName }
      if (def.groupBy === 'REJECTION_REASON' && outcome === 'REJECTED') {
        const label = r.rejectionReason
          ? rejectionReasonText(r.rejectionReason, r.customRejectionReason)
          : 'Not specified'
        return { key: label, label }
      }
      if (def.groupBy === 'TIME') {
        const date = outcome === 'HIRED' ? r.hiredAt! : r.rejectedAt!
        return bucketKeyAndLabel(date, timeGrouping)
      }
      return TOTAL_ROW
    },
    distinctBy: (r) => r.candidateId,
    toDrillDownRow: (r) => {
      const date = outcome === 'HIRED' ? r.hiredAt! : r.rejectedAt!
      const sublabel =
        outcome === 'HIRED'
          ? `Hired · ${r.job.internalName} · ${dateFormatter.format(date)}`
          : `Rejected · ${
              r.rejectionReason ? rejectionReasonText(r.rejectionReason, r.customRejectionReason) : 'Not specified'
            } · ${dateFormatter.format(date)}`
      return {
        id: r.candidateId,
        label: `${r.candidate.firstName} ${r.candidate.lastName}`,
        sublabel,
        href: `/candidates/${r.candidateId}`,
      }
    },
  }
}

async function rowSetApplicationsCount(def: ReportDefinition): Promise<RowSet<{
  id: string
  candidateId: string
  appliedAt: Date
  candidate: { firstName: string; lastName: string }
  job: { internalName: string }
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildApplicationFilterWhere(def.filters)
  where.appliedAt = { gte: range.start, lte: range.end }
  const rows = await prisma.application.findMany({
    where,
    select: {
      id: true,
      candidateId: true,
      appliedAt: true,
      candidate: { select: { firstName: true, lastName: true } },
      job: { select: { internalName: true } },
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'JOB') return { key: r.job.internalName, label: r.job.internalName }
      if (def.groupBy === 'TIME') return bucketKeyAndLabel(r.appliedAt, timeGrouping)
      return TOTAL_ROW
    },
    toDrillDownRow: (r) => ({
      id: r.id,
      label: `${r.candidate.firstName} ${r.candidate.lastName}`,
      sublabel: `${r.job.internalName} · Applied ${dateFormatter.format(r.appliedAt)}`,
      href: `/candidates/${r.candidateId}`,
    }),
  }
}

async function rowSetJobsByStatus(
  def: ReportDefinition,
  status: JobStatus
): Promise<RowSet<{ id: string; internalName: string; location: string; createdAt: Date }>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildJobFilterWhere(def.filters)
  where.status = status
  where.createdAt = { gte: range.start, lte: range.end }
  const rows = await prisma.job.findMany({
    where,
    select: { id: true, internalName: true, location: true, createdAt: true },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) =>
      def.groupBy === 'TIME' ? bucketKeyAndLabel(r.createdAt, timeGrouping) : TOTAL_ROW,
    toDrillDownRow: (r) => ({
      id: r.id,
      label: r.internalName,
      sublabel: `${r.location} · Created ${dateFormatter.format(r.createdAt)}`,
      href: `/jobs/${r.id}`,
    }),
  }
}

async function rowSetTalentPoolCandidates(def: ReportDefinition): Promise<RowSet<{
  id: string
  firstName: string
  lastName: string
  talentPoolAddedAt: Date | null
  owner: { name: string } | null
}>> {
  const range = resolveDateRange(def.dateRange)
  const where = buildCandidateFilterWhere(def.filters)
  where.inTalentPool = true
  where.talentPoolAddedAt = { gte: range.start, lte: range.end }
  const rows = await prisma.candidate.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      talentPoolAddedAt: true,
      owner: { select: { name: true } },
    },
  })
  const timeGrouping = def.timeGrouping ?? defaultTimeGrouping(range)
  return {
    rows,
    groupKey: (r) => {
      if (def.groupBy === 'RECRUITER') {
        const name = r.owner?.name ?? 'Unassigned'
        return { key: name, label: name }
      }
      if (def.groupBy === 'TIME') return bucketKeyAndLabel(r.talentPoolAddedAt!, timeGrouping)
      return TOTAL_ROW
    },
    toDrillDownRow: (r) => ({
      id: r.id,
      label: `${r.firstName} ${r.lastName}`,
      sublabel: `Added to Talent Pool ${dateFormatter.format(r.talentPoolAddedAt!)}`,
      href: `/candidates/${r.id}`,
    }),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rowSetForMetric(def: ReportDefinition): Promise<RowSet<any>> {
  switch (def.metric) {
    case 'CANDIDATES_ADDED':
      return rowSetCandidatesAdded(def)
    case 'CANDIDATES_INTERVIEWED':
      return rowSetInterviewsBase(def, true)
    case 'INTERVIEWS_CONDUCTED':
      return rowSetInterviewsBase(def, false)
    case 'CANDIDATES_ADVANCED':
      return rowSetCandidatesAdvanced(def)
    case 'CANDIDATES_REJECTED':
      return rowSetApplicationOutcome(def, 'REJECTED')
    case 'CANDIDATES_HIRED':
      return rowSetApplicationOutcome(def, 'HIRED')
    case 'APPLICATIONS_COUNT':
      return rowSetApplicationsCount(def)
    case 'OPEN_JOBS':
      return rowSetJobsByStatus(def, 'OPEN')
    case 'CLOSED_JOBS':
      return rowSetJobsByStatus(def, 'CLOSED')
    case 'TALENT_POOL_CANDIDATES':
      return rowSetTalentPoolCandidates(def)
  }
}

async function computeMetric(def: ReportDefinition): Promise<AggRow[]> {
  const { rows, groupKey, distinctBy } = await rowSetForMetric(def)
  return aggregateByGroup(rows, groupKey, distinctBy)
}

// groupLabel matches on the *label* shown to the user (recruiter name, job
// name, stage label, time-bucket label, …), not an internal sort key — the
// client never needs to know the internal key, only what it displayed.
// groupBy === 'NONE' drills into everything matching the filters/date range.
export async function computeDrillDown(
  def: ReportDefinition,
  groupLabel: string
): Promise<DrillDownRow[]> {
  const { rows, groupKey, distinctBy, toDrillDownRow } = await rowSetForMetric(def)
  const matching = def.groupBy === 'NONE' ? rows : rows.filter((r) => groupKey(r).label === groupLabel)

  if (!distinctBy) return matching.map(toDrillDownRow)

  const seen = new Set<string>()
  const result: DrillDownRow[] = []
  for (const r of matching) {
    const id = distinctBy(r)
    if (seen.has(id)) continue
    seen.add(id)
    result.push(toDrillDownRow(r))
  }
  return result
}

export async function runReport(def: ReportDefinition): Promise<ReportResult> {
  const range = resolveDateRange(def.dateRange)
  const timeGrouping = def.groupBy === 'TIME' ? (def.timeGrouping ?? defaultTimeGrouping(range)) : null
  const rows = await computeMetric(def)

  const metricLabel = METRIC_LABELS[def.metric]
  const groupLabel = def.groupBy === 'NONE' ? 'Category' : def.groupBy

  return {
    metadata: {
      subject: def.subject,
      metric: def.metric,
      groupBy: def.groupBy,
      dateRange: def.dateRange,
      timeGrouping,
      generatedAt: new Date().toISOString(),
    },
    categories: rows.map((r) => r.label),
    series: [{ name: metricLabel, data: rows.map((r) => r.value) }],
    rows: rows.map((r) => ({ [groupLabel]: r.label, [metricLabel]: r.value })),
    totals: { [metricLabel]: rows.reduce((sum, r) => sum + r.value, 0) },
  }
}

// ---- headline KPI stats --------------------------------------------------

export type HeadlineStat = { current: number; previous: number }
export type HeadlineStats = {
  added: HeadlineStat
  interviewed: HeadlineStat
  hired: HeadlineStat
}

async function totalFor(metric: Metric, start: Date, end: Date): Promise<number> {
  const def: ReportDefinition = {
    subject: 'CANDIDATES',
    metric,
    groupBy: 'NONE',
    filters: [],
    dateRange: { preset: 'CUSTOM', start: start.toISOString(), end: end.toISOString() },
  }
  const rows = await computeMetric(def)
  return rows[0]?.value ?? 0
}

export async function getReportingHeadlineStats(): Promise<HeadlineStats> {
  const now = new Date()
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  // The boundary between periods must never overlap — previous period ends
  // exactly where the current one begins.
  const previousEnd = currentStart

  const [addedCurrent, addedPrevious, interviewedCurrent, interviewedPrevious, hiredCurrent, hiredPrevious] =
    await Promise.all([
      totalFor('CANDIDATES_ADDED', currentStart, now),
      totalFor('CANDIDATES_ADDED', previousStart, previousEnd),
      totalFor('CANDIDATES_INTERVIEWED', currentStart, now),
      totalFor('CANDIDATES_INTERVIEWED', previousStart, previousEnd),
      totalFor('CANDIDATES_HIRED', currentStart, now),
      totalFor('CANDIDATES_HIRED', previousStart, previousEnd),
    ])

  return {
    added: { current: addedCurrent, previous: addedPrevious },
    interviewed: { current: interviewedCurrent, previous: interviewedPrevious },
    hired: { current: hiredCurrent, previous: hiredPrevious },
  }
}

// The exact "last 30 days" window the KPI cards use — exported so a KPI
// card's drill-down definition queries the identical period, not a
// separately-computed (and potentially drifting) approximation of it.
export function getHeadlineCurrentPeriodDefinition(metric: Metric): ReportDefinition {
  const now = new Date()
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    subject: 'CANDIDATES',
    metric,
    groupBy: 'NONE',
    filters: [],
    dateRange: { preset: 'CUSTOM', start: currentStart.toISOString(), end: now.toISOString() },
  }
}

// ---- fixed trend chart ----------------------------------------------------

export type TrendSeriesPoint = { label: string; added: number; interviewed: number; hired: number }

export async function getActivityTrendSeries(days: number): Promise<TrendSeriesPoint[]> {
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const range = { start, end: now }
  const timeGrouping = defaultTimeGrouping(range)

  const baseDef = (metric: Metric): ReportDefinition => ({
    subject: 'CANDIDATES',
    metric,
    groupBy: 'TIME',
    filters: [],
    dateRange: { preset: 'CUSTOM', start: start.toISOString(), end: now.toISOString() },
    timeGrouping,
  })

  const [added, interviewed, hired] = await Promise.all([
    computeMetric(baseDef('CANDIDATES_ADDED')),
    computeMetric(baseDef('CANDIDATES_INTERVIEWED')),
    computeMetric(baseDef('CANDIDATES_HIRED')),
  ])

  const byKey = new Map<string, TrendSeriesPoint>()
  function merge(rows: AggRow[], field: 'added' | 'interviewed' | 'hired') {
    for (const r of rows) {
      const existing = byKey.get(r.key)
      if (existing) {
        existing[field] = r.value
      } else {
        byKey.set(r.key, { label: r.label, added: 0, interviewed: 0, hired: 0, [field]: r.value } as TrendSeriesPoint)
      }
    }
  }
  merge(added, 'added')
  merge(interviewed, 'interviewed')
  merge(hired, 'hired')

  return [...[...byKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))].map(([, v]) => v)
}
