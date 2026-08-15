'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { candidateSchema } from '@/lib/validation/candidate'
import { createApplication } from '@/lib/actions/applications'
import { uploadResumeForCandidate } from '@/lib/actions/resumes'

export async function listCandidates() {
  await requireSession()
  return prisma.candidate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      applications: { include: { job: true } },
      tags: { include: { tag: true } },
    },
  })
}

export async function getCandidate(candidateId: string) {
  await requireSession()
  return prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      owner: true,
      applications: {
        include: { job: true },
        orderBy: { createdAt: 'desc' },
      },
      tags: { include: { tag: true } },
      notes: {
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      },
      resumes: {
        orderBy: { uploadedAt: 'desc' },
      },
    },
  })
}

export async function updateCandidateRating(
  candidateId: string,
  rating: number | null
) {
  const user = await requireSession()

  if (rating !== null && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5')
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    select: { rating: true },
  })

  const star = (n: number) => `${n} star${n === 1 ? '' : 's'}`
  const body =
    rating === null
      ? 'Cleared rating'
      : candidate.rating === null
        ? `Rated ${star(rating)}`
        : `Changed rating from ${star(candidate.rating)} to ${star(rating)}`

  await prisma.$transaction([
    prisma.candidate.update({ where: { id: candidateId }, data: { rating } }),
    prisma.activityNote.create({
      data: { candidateId, authorId: user.id, body },
    }),
  ])

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/pipeline')
  revalidatePath('/jobs/[jobId]', 'page')
}

export async function checkDuplicateByEmail(email: string) {
  await requireSession()

  const trimmed = email.trim()
  if (!trimmed) return null

  return prisma.candidate.findFirst({
    where: { email: { equals: trimmed, mode: 'insensitive' } },
    select: { firstName: true, lastName: true, email: true },
  })
}

export async function createCandidate(
  _prevState: unknown,
  formData: FormData
) {
  const user = await requireSession()

  const parsed = candidateSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    linkedinUrl: formData.get('linkedinUrl'),
    currentCompany: formData.get('currentCompany'),
    currentTitle: formData.get('currentTitle'),
    location: formData.get('location'),
    jobId: formData.get('jobId'),
    ownerId: formData.get('ownerId'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { jobId, ownerId, ...candidateData } = parsed.data

  const candidate = await prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.create({
      data: {
        ...candidateData,
        ownerId: ownerId ?? null,
      },
    })

    await createApplication(tx, {
      candidateId: candidate.id,
      jobId,
      changedById: user.id,
    })

    return candidate
  })

  const resumeFile = formData.get('resume')
  if (resumeFile instanceof File && resumeFile.size > 0) {
    const result = await uploadResumeForCandidate(candidate.id, resumeFile)
    if (result?.error) {
      // Candidate was still created successfully; surface the upload
      // problem so the user can retry from the profile page.
      revalidatePath('/candidates')
      redirect(`/candidates/${candidate.id}?resumeError=${encodeURIComponent(result.error)}`)
    }
  }

  revalidatePath('/candidates')
  revalidatePath(`/jobs/${jobId}`)
  redirect(`/candidates/${candidate.id}`)
}
