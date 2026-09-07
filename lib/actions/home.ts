'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { IN_PROCESS_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const STALE_AFTER_DAYS = 7
const STALLED_LIMIT = 8
const INTERVIEW_LIMIT = 6

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

export type HomeSnapshot = {
  userName: string | null
  userId: string
  // "Assigned to me" throughout means Candidate.owner. The reporting layer's
  // RECRUITER filter means *interviewer* for interview-based metrics, so these
  // are computed here rather than reusing report definitions that would
  // silently mean something different.
  inProcess: number
  interviewed30d: { current: number; previous: number }
  hired30d: { current: number; previous: number }
  stalled: {
    candidateId: string
    name: string
    jobName: string
    stage: PipelineStage
    lastMovedAt: Date
    daysStalled: number
  }[]
  stalledTotal: number
  openInterviews: {
    id: string
    candidateId: string
    candidateName: string
    type: string
    createdAt: Date
  }[]
}

export async function getHomeSnapshot(): Promise<HomeSnapshot> {
  const authUser = await requireSession()
  const mine = { candidate: { ownerId: authUser.id } }
  const start30 = daysAgo(30)
  const start60 = daysAgo(60)

  const [user, inProcess, intCur, intPrev, hiredCur, hiredPrev, activeApps, openInterviews] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true } }),
      prisma.candidate.count({
        where: { ownerId: authUser.id, applications: { some: { stage: { in: IN_PROCESS_STAGES } } } },
      }),
      prisma.interview.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: start30 }, ...mine },
        select: { candidateId: true },
      }),
      prisma.interview.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: start60, lt: start30 },
          ...mine,
        },
        select: { candidateId: true },
      }),
      prisma.application.findMany({
        where: { hiredAt: { gte: start30 }, ...mine },
        select: { candidateId: true },
      }),
      prisma.application.findMany({
        where: { hiredAt: { gte: start60, lt: start30 }, ...mine },
        select: { candidateId: true },
      }),
      prisma.application.findMany({
        where: { stage: { in: IN_PROCESS_STAGES }, ...mine },
        select: {
          id: true,
          stage: true,
          appliedAt: true,
          candidateId: true,
          candidate: { select: { firstName: true, lastName: true } },
          job: { select: { internalName: true } },
        },
      }),
      prisma.interview.findMany({
        where: { interviewerId: authUser.id, status: 'DRAFT' },
        select: {
          id: true,
          type: true,
          createdAt: true,
          candidateId: true,
          candidate: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: INTERVIEW_LIMIT,
      }),
    ])

  // One grouped query for the latest stage change across all of my active
  // applications, rather than a per-application lookup.
  const lastMoves = await prisma.stageHistory.groupBy({
    by: ['applicationId'],
    where: { applicationId: { in: activeApps.map((a) => a.id) } },
    _max: { changedAt: true },
  })
  const lastMoveByApp = new Map(lastMoves.map((m) => [m.applicationId, m._max.changedAt]))
  const cutoff = daysAgo(STALE_AFTER_DAYS)

  const stalledAll = activeApps
    .map((a) => {
      // An application that has never moved is measured from when it was
      // applied, otherwise it would look permanently fresh.
      const lastMovedAt = lastMoveByApp.get(a.id) ?? a.appliedAt
      return {
        candidateId: a.candidateId,
        name: `${a.candidate.firstName} ${a.candidate.lastName}`,
        jobName: a.job.internalName,
        stage: a.stage,
        lastMovedAt,
        daysStalled: Math.floor((Date.now() - lastMovedAt.getTime()) / 86_400_000),
      }
    })
    .filter((a) => a.lastMovedAt < cutoff)
    .sort((a, b) => a.lastMovedAt.getTime() - b.lastMovedAt.getTime())

  const distinct = (rows: { candidateId: string }[]) =>
    new Set(rows.map((r) => r.candidateId)).size

  return {
    userName: user?.name ?? null,
    userId: authUser.id,
    inProcess,
    interviewed30d: { current: distinct(intCur), previous: distinct(intPrev) },
    hired30d: { current: distinct(hiredCur), previous: distinct(hiredPrev) },
    stalled: stalledAll.slice(0, STALLED_LIMIT),
    stalledTotal: stalledAll.length,
    openInterviews: openInterviews.map((i) => ({
      id: i.id,
      candidateId: i.candidateId,
      candidateName: `${i.candidate.firstName} ${i.candidate.lastName}`,
      type: i.type,
      createdAt: i.createdAt,
    })),
  }
}
