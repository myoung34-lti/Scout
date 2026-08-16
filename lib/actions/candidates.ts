'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { candidateSchema, candidateEditSchema } from '@/lib/validation/candidate'
import { createApplication } from '@/lib/actions/applications'
import { uploadResumeForCandidate } from '@/lib/actions/resumes'
import { ALL_CANDIDATE_TYPES, CANDIDATE_TYPE_LABELS } from '@/lib/candidate-type'
import { TERMINAL_STAGES } from '@/lib/pipeline'
import type { CandidateType, PipelineStage } from '@prisma/client'

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
      talentPoolAddedBy: true,
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
      interviews: {
        include: { interviewer: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function updateCandidateProfile(
  candidateId: string,
  _prevState: unknown,
  formData: FormData
) {
  await requireSession()

  const parsed = candidateEditSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    linkedinUrl: formData.get('linkedinUrl'),
    currentCompany: formData.get('currentCompany'),
    location: formData.get('location'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: parsed.data,
  })

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  return { success: true as const }
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

export async function updateCandidateType(
  candidateId: string,
  candidateType: CandidateType
) {
  const user = await requireSession()

  if (!ALL_CANDIDATE_TYPES.includes(candidateType)) {
    throw new Error('Invalid type')
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    select: { candidateType: true },
  })

  if (candidate.candidateType === candidateType) return

  const body = candidate.candidateType
    ? `Changed type from ${CANDIDATE_TYPE_LABELS[candidate.candidateType]} to ${CANDIDATE_TYPE_LABELS[candidateType]}`
    : `Set type to ${CANDIDATE_TYPE_LABELS[candidateType]}`

  await prisma.$transaction([
    prisma.candidate.update({ where: { id: candidateId }, data: { candidateType } }),
    prisma.activityNote.create({
      data: { candidateId, authorId: user.id, body },
    }),
  ])

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/pipeline')
  revalidatePath('/jobs/[jobId]', 'page')
}

export async function addCandidateToJob(candidateId: string, jobId: string) {
  const user = await requireSession()

  const existingActive = await prisma.application.findFirst({
    where: { candidateId, jobId, stage: { notIn: TERMINAL_STAGES } },
  })
  if (existingActive) {
    throw new Error('Candidate already has an active application for this job.')
  }

  await prisma.$transaction((tx) =>
    createApplication(tx, { candidateId, jobId, changedById: user.id })
  )

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/pipeline')
}

export async function addCandidateToTalentPool(candidateId: string) {
  const user = await requireSession()

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    select: { inTalentPool: true },
  })
  if (candidate.inTalentPool) return

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        inTalentPool: true,
        talentPoolAddedAt: new Date(),
        talentPoolAddedById: user.id,
      },
    }),
    prisma.activityNote.create({
      data: { candidateId, authorId: user.id, body: 'Added to Talent Pool' },
    }),
  ])

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/talent-pool')
}

export async function removeCandidateFromTalentPool(candidateId: string) {
  const user = await requireSession()

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { inTalentPool: false },
    }),
    prisma.activityNote.create({
      data: { candidateId, authorId: user.id, body: 'Removed from Talent Pool' },
    }),
  ])

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  revalidatePath('/talent-pool')
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
    candidateType: formData.get('candidateType'),
    location: formData.get('location'),
    source: formData.get('source'),
    jobId: formData.get('jobId'),
    stage: formData.get('stage'),
    ownerId: formData.get('ownerId'),
    addToTalentPool: formData.get('addToTalentPool'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { jobId, stage, ownerId, addToTalentPool, ...candidateData } = parsed.data

  const skills = formData
    .getAll('skills')
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')

  const candidate = await prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.create({
      data: {
        ...candidateData,
        ownerId: ownerId ?? null,
      },
    })

    await tx.activityNote.create({
      data: {
        candidateId: candidate.id,
        authorId: user.id,
        body: 'Added to the system',
      },
    })

    if (addToTalentPool) {
      await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          inTalentPool: true,
          talentPoolAddedAt: new Date(),
          talentPoolAddedById: user.id,
        },
      })
      await tx.activityNote.create({
        data: { candidateId: candidate.id, authorId: user.id, body: 'Added to Talent Pool' },
      })
    } else {
      await createApplication(tx, {
        candidateId: candidate.id,
        jobId: jobId!,
        changedById: user.id,
        stage: stage as PipelineStage | undefined,
      })
    }

    // Skills pulled from the resume parser get attached the same way a
    // manually-added tag would — no separate Skills model needed.
    for (const rawLabel of skills) {
      const displayLabel = rawLabel.trim()
      const label = displayLabel.toLowerCase()
      const tag = await tx.tag.upsert({
        where: { label },
        update: {},
        create: { label, displayLabel },
      })
      await tx.candidateTag.upsert({
        where: { candidateId_tagId: { candidateId: candidate.id, tagId: tag.id } },
        update: {},
        create: { candidateId: candidate.id, tagId: tag.id },
      })
    }

    return candidate
  })

  const resumeFiles = formData
    .getAll('resume')
    .filter((f): f is File => f instanceof File && f.size > 0)
  for (const resumeFile of resumeFiles) {
    const result = await uploadResumeForCandidate(candidate.id, resumeFile)
    if (result?.error) {
      // Candidate was still created successfully; surface the upload
      // problem so the user can retry from the profile page.
      revalidatePath('/candidates')
      redirect(`/candidates/${candidate.id}?resumeError=${encodeURIComponent(result.error)}`)
    }
  }

  revalidatePath('/candidates')
  if (addToTalentPool) {
    revalidatePath('/talent-pool')
  } else {
    revalidatePath(`/jobs/${jobId}`)
  }
  redirect(`/candidates/${candidate.id}`)
}
