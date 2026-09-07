'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { CANDIDATES_PAGE_SIZE, CANDIDATE_STATUS_KEYS } from '@/lib/candidate-search'
import type {
  AddedDatePreset,
  CandidateSort,
  CandidateStatusKey,
} from '@/lib/candidate-search'
import type { PipelineStage, Prisma } from '@prisma/client'
import { ACTIVE_STAGES, FORMAL_INTERVIEW_STAGES } from '@/lib/pipeline'

export type CandidateSearchFilters = {
  query?: string
  stages?: PipelineStage[]
  jobId?: string
  jobLocation?: string
  minRating?: number
  location?: string
  tagIds?: string[]
  pooled?: boolean
  rated?: boolean
  addedPreset?: AddedDatePreset
  addedFrom?: string
  addedTo?: string
  recruiterId?: string
  status?: CandidateStatusKey
  sort?: CandidateSort
  page?: number
}

// Sorting is chosen from a fixed map rather than built from the raw param, so
// a crafted `sort` value can never reach Prisma as a field name.
const SORT_ORDER: Record<CandidateSort, Prisma.CandidateOrderByWithRelationInput[]> = {
  added: [{ createdAt: 'desc' }],
  name: [{ firstName: 'asc' }, { lastName: 'asc' }],
  // Unrated candidates sort last either way rather than leading the list.
  rating: [{ rating: { sort: 'desc', nulls: 'last' } }],
}

export async function searchCandidates(filters: CandidateSearchFilters) {
  await requireSession()

  const {
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
    sort = 'added',
    page = 1,
  } = filters
  const hasStages = stages && stages.length > 0
  const queryWords = query?.trim().split(/\s+/).filter(Boolean) ?? []

  let addedCondition: { createdAt: { gte?: Date; lte?: Date } } | undefined
  if (addedPreset === 'week' || addedPreset === 'month') {
    const from = new Date()
    from.setDate(from.getDate() - (addedPreset === 'week' ? 7 : 30))
    addedCondition = { createdAt: { gte: from } }
  } else if (addedPreset === 'custom' && (addedFrom || addedTo)) {
    addedCondition = {
      createdAt: {
        ...(addedFrom ? { gte: new Date(`${addedFrom}T00:00:00`) } : {}),
        ...(addedTo ? { lte: new Date(`${addedTo}T23:59:59.999`) } : {}),
      },
    }
  }

  // Stage/job, Talent Pool, and Rated are parallel "which bucket of
  // candidates" criteria — checking more than one broadens the result set
  // (OR) rather than narrowing it, matching the quick-filter checkboxes.
  const stageOrJobCondition =
    hasStages || jobId || jobLocation
      ? {
          applications: {
            some: {
              ...(hasStages ? { stage: { in: stages } } : {}),
              job: {
                ...(jobId ? { id: jobId } : {}),
                ...(jobLocation ? { location: jobLocation } : {}),
              },
            },
          },
        }
      : undefined
  const pooledCondition = pooled ? { inTalentPool: true } : undefined
  const ratedCondition = rated ? { rating: { not: null } } : undefined
  const bucketConditions = [stageOrJobCondition, pooledCondition, ratedCondition].filter(
    (c): c is NonNullable<typeof c> => c !== undefined
  )
  const bucketCondition = bucketConditions.length > 0 ? { OR: bucketConditions } : {}

  // Built as an explicit AND list (rather than spreading conditions into one
  // object) so the query-text OR clause and the bucket OR clause never
  // collide under the same `OR` key.
  const andConditions = [
    ...(queryWords.length > 0
      ? [
          {
            OR: [
              // A multi-word query like "Michael Young" needs each word
              // matched across firstName/lastName — checking the whole
              // phrase against either field alone never matches a name
              // split across both.
              {
                AND: queryWords.map((word) => ({
                  OR: [
                    { firstName: { contains: word, mode: 'insensitive' as const } },
                    { lastName: { contains: word, mode: 'insensitive' as const } },
                  ],
                })),
              },
              { email: { contains: query, mode: 'insensitive' as const } },
              {
                notes: {
                  some: { body: { contains: query, mode: 'insensitive' as const } },
                },
              },
            ],
          },
        ]
      : []),
    ...(location
      ? [{ location: { contains: location, mode: 'insensitive' as const } }]
      : []),
    ...(minRating ? [{ rating: { gte: minRating } }] : []),
    ...(tagIds && tagIds.length > 0
      ? [{ tags: { some: { tagId: { in: tagIds } } } }]
      : []),
    ...(addedCondition ? [addedCondition] : []),
    ...(recruiterId ? [{ ownerId: recruiterId }] : []),
    ...(status && status !== 'all' ? [STATUS_WHERE[status]] : []),
    bucketCondition,
  ]

  const where = { AND: andConditions }

  const [candidates, totalCount] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: {
        applications: { include: { job: true } },
        tags: { include: { tag: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: SORT_ORDER[sort] ?? SORT_ORDER.added,
      skip: (page - 1) * CANDIDATES_PAGE_SIZE,
      take: CANDIDATES_PAGE_SIZE,
    }),
    prisma.candidate.count({ where }),
  ])

  return { candidates, totalCount }
}

// Drives the counted tabs above the list. Each count is the same predicate the
// tab itself filters by, so the number and the resulting list always agree.
const STATUS_WHERE: Record<CandidateStatusKey, Prisma.CandidateWhereInput> = {
  all: {},
  active: { applications: { some: { stage: { in: ACTIVE_STAGES } } } },
  interviewing: { applications: { some: { stage: { in: FORMAL_INTERVIEW_STAGES } } } },
  hired: { applications: { some: { stage: 'HIRED' } } },
  rejected: { applications: { some: { stage: 'REJECTED' } } },
  pool: { inTalentPool: true },
}

export async function getCandidateStatusCounts(): Promise<Record<CandidateStatusKey, number>> {
  await requireSession()

  const keys = [...CANDIDATE_STATUS_KEYS]
  const counts = await Promise.all(
    keys.map((k) => prisma.candidate.count({ where: STATUS_WHERE[k] }))
  )
  return Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as Record<
    CandidateStatusKey,
    number
  >
}
