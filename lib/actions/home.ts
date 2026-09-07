'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { IN_PROCESS_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const STALE_AFTER_DAYS = 7
const STALLED_LIMIT = 12
const INTERVIEW_LIMIT = 5

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function quarterStart(d = new Date()) {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
}

export type HomeSnapshot = {
  userName: string | null
  userId: string
  jobsAssigned: number
  inProcess: number
  hiresThisQuarter: number
  quarterLabel: string
  // The funnel leads the dashboard: everyone in process on the jobs I'm the
  // recruiter for.
  funnel: { stage: PipelineStage; count: number }[]
  stalled: {
    candidateId: string
    name: string
    jobName: string
    stage: PipelineStage
    lastActivityAt: Date
    lastActivityKind: 'stage' | 'note' | 'email' | 'applied'
    daysQuiet: number
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
  // The funnel and the Jobs Assigned count follow job assignment; the quiet
  // list and hires follow candidate ownership. Two different questions.
  const myJobs = {
    job: { assignments: { some: { userId: authUser.id, role: 'RECRUITER' as const } } },
  }
  const qStart = quarterStart()

  const [user, jobsAssigned, funnelApps, activeApps, hires, openInterviews] =
    await Promise.all([
    prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true } }),
    prisma.job.count({
      where: {
        status: { in: ['OPEN', 'ON_HOLD'] },
        assignments: { some: { userId: authUser.id, role: 'RECRUITER' } },
      },
    }),
    prisma.application.findMany({
      where: { stage: { in: IN_PROCESS_STAGES }, ...myJobs },
      select: { stage: true, candidateId: true },
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
    prisma.application.findMany({
      where: { hiredAt: { gte: qStart }, ...mine },
      select: { candidateId: true },
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

  const appIds = activeApps.map((a) => a.id)
  const candidateIds = [...new Set(activeApps.map((a) => a.candidateId))]

  // Activity is any of three signals, so all three are fetched as grouped
  // maxima rather than per-candidate lookups.
  const [moves, notes, emails] = await Promise.all([
    prisma.stageHistory.groupBy({
      by: ['applicationId'],
      where: { applicationId: { in: appIds } },
      _max: { changedAt: true },
    }),
    prisma.activityNote.groupBy({
      by: ['candidateId'],
      where: { candidateId: { in: candidateIds } },
      _max: { createdAt: true },
    }),
    prisma.candidateEmail.groupBy({
      by: ['candidateId'],
      where: { candidateId: { in: candidateIds }, status: 'SENT' },
      _max: { sentAt: true },
    }),
  ])

  const moveBy = new Map(moves.map((m) => [m.applicationId, m._max.changedAt]))
  const noteBy = new Map(notes.map((n) => [n.candidateId, n._max.createdAt]))
  const emailBy = new Map(emails.map((e) => [e.candidateId, e._max.sentAt]))
  const cutoff = daysAgo(STALE_AFTER_DAYS)

  const stalledAll = activeApps
    .map((a) => {
      const candidates: { at: Date | null; kind: 'stage' | 'note' | 'email' | 'applied' }[] = [
        { at: moveBy.get(a.id) ?? null, kind: 'stage' },
        { at: noteBy.get(a.candidateId) ?? null, kind: 'note' },
        { at: emailBy.get(a.candidateId) ?? null, kind: 'email' },
        // Never-touched applications fall back to when they applied, so they
        // don't look permanently fresh.
        { at: a.appliedAt, kind: 'applied' },
      ]
      const latest = candidates
        .filter((c): c is { at: Date; kind: typeof c.kind } => c.at !== null)
        .sort((x, y) => y.at.getTime() - x.at.getTime())[0]

      return {
        candidateId: a.candidateId,
        name: `${a.candidate.firstName} ${a.candidate.lastName}`,
        jobName: a.job.internalName,
        stage: a.stage,
        lastActivityAt: latest.at,
        lastActivityKind: latest.kind,
        daysQuiet: Math.floor((Date.now() - latest.at.getTime()) / 86_400_000),
      }
    })
    .filter((a) => a.lastActivityAt < cutoff)
    .sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime())

  const countByStage = new Map<PipelineStage, number>()
  for (const a of funnelApps) {
    countByStage.set(a.stage, (countByStage.get(a.stage) ?? 0) + 1)
  }

  return {
    userName: user?.name ?? null,
    userId: authUser.id,
    jobsAssigned,
    inProcess: new Set(funnelApps.map((a) => a.candidateId)).size,
    hiresThisQuarter: new Set(hires.map((h) => h.candidateId)).size,
    quarterLabel: `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`,
    funnel: IN_PROCESS_STAGES.map((stage) => ({
      stage,
      count: countByStage.get(stage) ?? 0,
    })),
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
