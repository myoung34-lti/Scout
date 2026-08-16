'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { PipelineStage } from '@prisma/client'

export type CandidateSearchFilters = {
  query?: string
  stages?: PipelineStage[]
  jobId?: string
  jobLocation?: string
  minRating?: number
  location?: string
  tagIds?: string[]
}

export async function searchCandidates(filters: CandidateSearchFilters) {
  await requireSession()

  const { query, stages, jobId, jobLocation, minRating, location, tagIds } =
    filters
  const hasStages = stages && stages.length > 0
  const queryWords = query?.trim().split(/\s+/).filter(Boolean) ?? []

  return prisma.candidate.findMany({
    where: {
      ...(queryWords.length > 0
        ? {
            OR: [
              // A multi-word query like "Michael Young" needs each word
              // matched across firstName/lastName — checking the whole
              // phrase against either field alone never matches a name
              // split across both.
              {
                AND: queryWords.map((word) => ({
                  OR: [
                    { firstName: { contains: word, mode: 'insensitive' } },
                    { lastName: { contains: word, mode: 'insensitive' } },
                  ],
                })),
              },
              { email: { contains: query, mode: 'insensitive' } },
              {
                notes: {
                  some: { body: { contains: query, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(location
        ? { location: { contains: location, mode: 'insensitive' } }
        : {}),
      ...(minRating ? { rating: { gte: minRating } } : {}),
      ...(tagIds && tagIds.length > 0
        ? { tags: { some: { tagId: { in: tagIds } } } }
        : {}),
      ...(hasStages || jobId || jobLocation
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
        : {}),
    },
    include: {
      applications: { include: { job: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
