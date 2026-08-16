'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ALL_INTERVIEW_TYPES, ALL_RECOMMENDATIONS } from '@/lib/interview'
import { TERMINAL_STAGES } from '@/lib/pipeline'
import type { InterviewType, InterviewRecommendation } from '@prisma/client'

export async function createInterview(candidateId: string, type: InterviewType) {
  const user = await requireSession()

  if (!ALL_INTERVIEW_TYPES.includes(type)) {
    throw new Error('Invalid interview type')
  }

  // Default to whichever application the candidate is currently active in —
  // the interview page still lets you switch if there's more than one.
  const currentApplication = await prisma.application.findFirst({
    where: { candidateId, stage: { notIn: TERMINAL_STAGES } },
    orderBy: { createdAt: 'desc' },
  })

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      interviewerId: user.id,
      type,
      applicationId: currentApplication?.id,
    },
  })

  revalidatePath(`/candidates/${candidateId}`)
  redirect(`/candidates/${candidateId}/interview/${interview.id}`)
}

export async function getInterview(interviewId: string) {
  await requireSession()
  return prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      candidate: {
        include: {
          resumes: { orderBy: { uploadedAt: 'desc' } },
          applications: { include: { job: true } },
        },
      },
      interviewer: true,
      application: { include: { job: true } },
    },
  })
}

export type UpdateInterviewDraftResult = { error?: string } | { ok: true }

export async function updateInterviewDraft(
  interviewId: string,
  data: { notes?: string; firefliesSummary?: string; applicationId?: string | null }
): Promise<UpdateInterviewDraftResult> {
  await requireSession()

  try {
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        notes: data.notes,
        firefliesSummary: data.firefliesSummary,
        ...(data.applicationId !== undefined
          ? { applicationId: data.applicationId }
          : {}),
      },
    })
    return { ok: true }
  } catch {
    return { error: 'Failed to save.' }
  }
}

export async function completeInterview(
  interviewId: string,
  recommendation: InterviewRecommendation
) {
  await requireSession()

  if (!ALL_RECOMMENDATIONS.includes(recommendation)) {
    throw new Error('Invalid recommendation')
  }

  const interview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      recommendation,
    },
  })

  revalidatePath(`/candidates/${interview.candidateId}`)
  redirect(`/candidates/${interview.candidateId}`)
}
