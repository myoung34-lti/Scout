'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ACTIVE_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const RECENT_LIMIT = 6

export type HomeSnapshot = {
  userName: string | null
  stageCounts: { stage: PipelineStage; count: number }[]
  activeTotal: number
  // Open roles with nobody actually in process — the thing most worth
  // surfacing on a landing screen, and invisible everywhere else in Scout.
  unstaffedJobs: { id: string; internalName: string; location: string }[]
  openJobCount: number
  recentCandidates: {
    id: string
    name: string
    subtitle: string | null
    addedAt: Date
  }[]
}

export async function getHomeSnapshot(): Promise<HomeSnapshot> {
  const authUser = await requireSession()

  const [user, grouped, openJobs, jobsWithActive, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true } }),
    prisma.application.groupBy({
      by: ['stage'],
      where: { stage: { in: ACTIVE_STAGES }, job: { status: { in: ['OPEN', 'ON_HOLD'] } } },
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where: { status: 'OPEN' },
      select: { id: true, internalName: true, location: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.application.findMany({
      where: { stage: { in: ACTIVE_STAGES }, job: { status: 'OPEN' } },
      select: { jobId: true },
      distinct: ['jobId'],
    }),
    prisma.candidate.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentTitle: true,
        currentCompany: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
    }),
  ])

  const staffed = new Set(jobsWithActive.map((a) => a.jobId))
  const countByStage = new Map(grouped.map((g) => [g.stage, g._count._all]))

  return {
    userName: user?.name ?? null,
    // Every active stage is listed, including empty ones, so the shape of the
    // funnel is readable rather than only its populated parts.
    stageCounts: ACTIVE_STAGES.map((stage) => ({
      stage,
      count: countByStage.get(stage) ?? 0,
    })),
    activeTotal: grouped.reduce((sum, g) => sum + g._count._all, 0),
    unstaffedJobs: openJobs.filter((j) => !staffed.has(j.id)),
    openJobCount: openJobs.length,
    recentCandidates: recent.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      subtitle:
        [c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || null,
      addedAt: c.createdAt,
    })),
  }
}
