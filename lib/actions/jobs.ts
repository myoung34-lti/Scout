'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { jobSchema } from '@/lib/validation/job'
import type { JobStatus } from '@prisma/client'

export async function listJobs(statusFilter?: JobStatus) {
  await requireSession()
  return prisma.job.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  })
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
  return jobs.map((j) => j.location)
}

function readJobFormData(formData: FormData) {
  return {
    internalName: formData.get('internalName'),
    externalName: formData.get('externalName'),
    location: formData.get('location'),
    isRemote: formData.get('isRemote'),
    isHybrid: formData.get('isHybrid'),
    whoWereLookingFor: formData.get('whoWereLookingFor'),
    primaryResponsibilities: formData.get('primaryResponsibilities'),
    mustHaves: formData.get('mustHaves'),
    otherInformation: formData.get('otherInformation'),
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
