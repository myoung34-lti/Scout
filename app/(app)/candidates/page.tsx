import Link from 'next/link'
import { Plus } from 'lucide-react'
import { searchCandidates } from '@/lib/actions/search'
import { CANDIDATES_PAGE_SIZE } from '@/lib/candidate-search'
import type { AddedDatePreset } from '@/lib/candidate-search'
import { listJobs, listDistinctLocations } from '@/lib/actions/jobs'
import { listTagOptions } from '@/lib/actions/tags'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STAGE_LABELS, ALL_STAGES } from '@/lib/pipeline'
import { StarRating } from '@/components/candidates/star-rating'
import { CandidateSearchFilters } from '@/components/candidates/candidate-search-filters'
import { ActiveFilterPills } from '@/components/candidates/active-filter-pills'
import { CandidatesPagination } from '@/components/candidates/candidates-pagination'
import type { PipelineStage } from '@prisma/client'
import { getCandidateDisplayTitle, findCurrentApplication } from '@/lib/candidate-type'

const ADDED_DATE_PRESETS: AddedDatePreset[] = ['week', 'month', 'custom']

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
  const minRating =
    minRatingParam && minRatingParam !== 'ALL' ? Number(minRatingParam) : undefined
  const addedPreset = ADDED_DATE_PRESETS.find((p) => p === addedPresetParam)

  const [{ candidates, totalCount }, jobs, jobLocations, tags] = await Promise.all([
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
      page,
    }),
    listJobs(),
    listDistinctLocations(),
    listTagOptions(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / CANDIDATES_PAGE_SIZE))

  const jobOptions = jobs.map((j) => ({ id: j.id, internalName: j.internalName }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Candidates</h1>
        <Button asChild>
          <Link href="/candidates/new">
            <Plus />
            Add Candidate
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-6">
          <CandidateSearchFilters
            jobs={jobOptions}
            jobLocations={jobLocations}
            tags={tags}
          />
        </aside>

        <div>
          <ActiveFilterPills count={totalCount} jobs={jobOptions} tags={tags} />

          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates match these filters.
            </p>
          ) : (
            <div className="rounded-lg border bg-background">
            <ul className="divide-y">
              {candidates.map((c) => {
                const currentApplication = findCurrentApplication(c)
                return (
                <li key={c.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                      <StarRating value={c.rating} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getCandidateDisplayTitle(c) ?? c.email ?? '—'}
                      {c.location && ` · ${c.location}`}
                    </p>
                    {c.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags.map((ct) => (
                          <Badge key={ct.tagId} variant="outline">
                            {ct.tag.displayLabel}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {currentApplication && (
                      <Badge variant="secondary">
                        {STAGE_LABELS[currentApplication.stage]}
                      </Badge>
                    )}
                  </div>
                </li>
                )
              })}
            </ul>
            <CandidatesPagination page={page} totalPages={totalPages} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
