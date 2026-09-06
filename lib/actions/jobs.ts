'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { jobSchema } from '@/lib/validation/job'
import { CANONICAL_JOB_LOCATIONS } from '@/lib/job-locations'
import type { JobStatus } from '@prisma/client'

export async function listJobs(
  statusFilter?: JobStatus,
  options?: { query?: string; location?: string }
) {
  await requireSession()
  const query = options?.query?.trim()
  const location = options?.location?.trim()

  return prisma.job.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(location ? { location } : {}),
      ...(query
        ? {
            OR: [
              { internalName: { contains: query, mode: 'insensitive' as const } },
              { externalName: { contains: query, mode: 'insensitive' as const } },
              { clientName: { contains: query, mode: 'insensitive' as const } },
              { teamName: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  })
}

// A filtered count can't be aliased alongside the unfiltered one inside a
// single `_count`, so hires come from one grouped query rather than N+1
// per-job counts.
export async function countHiresByJob(): Promise<Record<string, number>> {
  await requireSession()
  const grouped = await prisma.application.groupBy({
    by: ['jobId'],
    where: { stage: 'HIRED' },
    _count: { _all: true },
  })
  return Object.fromEntries(grouped.map((g) => [g.jobId, g._count._all]))
}

export async function countJobsByStatus() {
  await requireSession()
  const [total, open, onHold, closed] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: 'OPEN' } }),
    prisma.job.count({ where: { status: 'ON_HOLD' } }),
    prisma.job.count({ where: { status: 'CLOSED' } }),
  ])
  return { ALL: total, OPEN: open, ON_HOLD: onHold, CLOSED: closed }
}

export async function getJob(jobId: string) {
  await requireSession()
  return prisma.job.findUnique({ where: { id: jobId } })
}

export async function listDistinctLocations() {
  await requireSession()
  const jobs = await prisma.job.findMany({
    distinct: ['location'],
    select: { location: true },
    orderBy: { location: 'asc' },
  })
  const existing = jobs.map((j) => j.location).filter((loc) => loc.length > 0)
  return [...new Set([...CANONICAL_JOB_LOCATIONS, ...existing])]
}

function readJobFormData(formData: FormData) {
  return {
    internalName: formData.get('internalName'),
    externalName: formData.get('externalName'),
    clientName: formData.get('clientName'),
    teamName: formData.get('teamName'),
    location: formData.get('location'),
    isOnsite: formData.get('isOnsite'),
    isRemote: formData.get('isRemote'),
    isHybrid: formData.get('isHybrid'),
    description: formData.get('description'),
    status: formData.get('status'),
  }
}

export async function createJob(_prevState: unknown, formData: FormData) {
  await requireSession()

  const parsed = jobSchema.safeParse(readJobFormData(formData))

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const job = await prisma.job.create({ data: parsed.data })

  revalidatePath('/jobs')
  redirect(`/jobs/${job.id}`)
}

export async function updateJob(
  jobId: string,
  _prevState: unknown,
  formData: FormData
) {
  await requireSession()

  const parsed = jobSchema.safeParse(readJobFormData(formData))

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  await prisma.job.update({ where: { id: jobId }, data: parsed.data })

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${jobId}`)
  redirect(`/jobs/${jobId}`)
}
