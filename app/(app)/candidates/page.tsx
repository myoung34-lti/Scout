import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { searchCandidates, getCandidateStatusCounts } from '@/lib/actions/search'
import {
  CANDIDATES_PAGE_SIZE,
  CANDIDATE_SORTS,
  CANDIDATE_STATUS_KEYS,
} from '@/lib/candidate-search'
import type {
  AddedDatePreset,
  CandidateSort,
  CandidateStatusKey,
} from '@/lib/candidate-search'
import { listJobs, listDistinctLocations } from '@/lib/actions/jobs'
import { listTagOptions } from '@/lib/actions/tags'
import { listUsers } from '@/lib/actions/users'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ALL_STAGES } from '@/lib/pipeline'
import { CandidateFilterBar } from '@/components/candidates/candidate-filter-bar'
import { CandidateStatusTabs } from '@/components/candidates/candidate-status-tabs'
import { CandidatesTable } from '@/components/candidates/candidates-table'
import type { CandidateRow } from '@/components/candidates/candidates-table'
import { ActiveFilterPills } from '@/components/candidates/active-filter-pills'
import { CandidatesPagination } from '@/components/candidates/candidates-pagination'
import type { PipelineStage } from '@prisma/client'
import { getCandidateDisplayTitle, findCurrentApplication } from '@/lib/candidate-type'

const ADDED_DATE_PRESETS: AddedDatePreset[] = ['week', 'month', 'custom']
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  const query = typeof params.q === 'string' ? params.q : undefined
  const stageParams = toArray(params.stage)
  const jobIdParam = typeof params.jobId === 'string' ? params.jobId : undefined
  const jobLocationParam =
    typeof params.jobLocation === 'string' ? params.jobLocation : undefined
  const minRatingParam =
    typeof params.minRating === 'string' ? params.minRating : undefined
  const recruiterIdParam =
    typeof params.recruiterId === 'string' ? params.recruiterId : undefined
  const location = typeof params.location === 'string' ? params.location : undefined
  const tagIds = toArray(params.tagIds)
  const pooled = params.pooled === '1'
  const rated = params.rated === '1'
  const addedPresetParam =
    typeof params.addedPreset === 'string' ? params.addedPreset : undefined
  const addedFrom = typeof params.addedFrom === 'string' ? params.addedFrom : undefined
  const addedTo = typeof params.addedTo === 'string' ? params.addedTo : undefined
  const pageParam = typeof params.page === 'string' ? Number(params.page) : 1
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const stages = stageParams.filter((s): s is PipelineStage =>
    ALL_STAGES.includes(s as PipelineStage)
  )
  const jobId = jobIdParam && jobIdParam !== 'ALL' ? jobIdParam : undefined
  const jobLocation =
    jobLocationParam && jobLocationParam !== 'ALL' ? jobLocationParam : undefined
  const recruiterId =
    recruiterIdParam && recruiterIdParam !== 'ALL' ? recruiterIdParam : undefined
  const minRating =
    minRatingParam && minRatingParam !== 'ALL' ? Number(minRatingParam) : undefined
  const addedPreset = ADDED_DATE_PRESETS.find((p) => p === addedPresetParam)
  // Both come off the URL, so they're matched against the known list rather
  // than trusted — the sort value reaches an orderBy lookup.
  const status = CANDIDATE_STATUS_KEYS.find(
    (k) => k === params.status
  ) as CandidateStatusKey | undefined
  const sort = (CANDIDATE_SORTS.find((s) => s === params.sort) ?? 'added') as CandidateSort

  const [{ candidates, totalCount }, counts, jobs, jobLocations, tags, users] =
    await Promise.all([
      searchCandidates({
        query,
        stages,
        jobId,
        jobLocation,
        minRating,
        location,
        tagIds,
        pooled,
        rated,
        addedPreset,
        addedFrom,
        addedTo,
        recruiterId,
        status,
        sort,
        page,
      }),
      getCandidateStatusCounts(),
      listJobs(),
      listDistinctLocations(),
      listTagOptions(),
      listUsers(),
    ])

  const totalPages = Math.max(1, Math.ceil(totalCount / CANDIDATES_PAGE_SIZE))
  const jobOptions = jobs.map((j) => ({ id: j.id, internalName: j.internalName }))

  const rows: CandidateRow[] = candidates.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    location: c.location,
    rating: c.rating,
    inTalentPool: c.inTalentPool,
    createdAt: dateFormatter.format(c.createdAt),
    displayTitle: getCandidateDisplayTitle(c) ?? null,
    currentCompany: c.currentCompany,
    stage: findCurrentApplication(c)?.stage ?? null,
    recruiter: c.owner?.name ?? null,
    tags: c.tags.map((ct) => ct.tag.displayLabel),
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            Find, track, and engage top talent.
          </p>
        </div>
        <Button asChild>
          <Link href="/candidates/new">
            <Plus />
            Add Candidate
          </Link>
        </Button>
      </div>

      <CandidateStatusTabs counts={counts} />

      <CandidateFilterBar
        jobs={jobOptions.map((j) => ({ id: j.id, label: j.internalName }))}
        jobLocations={jobLocations}
        recruiters={users.map((u) => ({ id: u.id, label: u.name }))}
        tags={tags.map((t) => ({ id: t.id, label: t.displayLabel }))}
      />

      <ActiveFilterPills count={totalCount} jobs={jobOptions} tags={tags} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={Users}
            title="No candidates match these filters"
            description="Try widening the date range, clearing a stage, or removing a tag."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <CandidatesTable candidates={rows} jobs={jobOptions} />
          <CandidatesPagination page={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  )
}
